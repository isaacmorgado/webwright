/**
 * Daemon Connection and Lifecycle Management
 */
use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::os::unix::net::UnixStream;
use std::path::Path;
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::commands::CommandJson;

#[derive(Debug, Deserialize)]
pub struct Response {
    pub id: String,
    pub success: bool,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

pub struct DaemonResult {
    pub already_running: bool,
}

/// Get the socket path for a session
fn get_socket_path(session: &str) -> String {
    let tmp_dir = env::temp_dir();
    tmp_dir
        .join(format!("agentbrowser-pro-{}.sock", session))
        .to_string_lossy()
        .into_owned()
}

/// Get the PID file path for a session
fn get_pid_file(session: &str) -> String {
    let tmp_dir = env::temp_dir();
    tmp_dir
        .join(format!("agentbrowser-pro-{}.pid", session))
        .to_string_lossy()
        .into_owned()
}

/// Check if daemon is running
fn is_daemon_running(session: &str) -> bool {
    let pid_file = get_pid_file(session);

    if !Path::new(&pid_file).exists() {
        return false;
    }

    match fs::read_to_string(&pid_file) {
        Ok(content) => {
            if let Ok(pid) = content.trim().parse::<i32>() {
                // Check if process exists (signal 0)
                #[cfg(unix)]
                unsafe {
                    return libc::kill(pid, 0) == 0;
                }
                #[cfg(not(unix))]
                return false;
            }
            false
        }
        Err(_) => false,
    }
}

/// Check if daemon is ready to accept commands
fn is_daemon_ready(session: &str) -> bool {
    let socket_path = get_socket_path(session);

    match UnixStream::connect(&socket_path) {
        Ok(mut stream) => {
            stream.set_read_timeout(Some(Duration::from_secs(2))).ok();
            stream.set_write_timeout(Some(Duration::from_secs(2))).ok();

            // Send ping command
            let ping = r#"{"id":"ping","action":"getUrl"}"#;
            if stream.write_all(ping.as_bytes()).is_err() {
                return false;
            }
            if stream.write_all(b"\n").is_err() {
                return false;
            }

            // Read response
            let mut reader = BufReader::new(stream);
            let mut line = String::new();
            match reader.read_line(&mut line) {
                Ok(_) => true,
                Err(_) => false,
            }
        }
        Err(_) => false,
    }
}

/// Find the daemon script path
fn find_daemon_path() -> Option<String> {
    let exe_path = env::current_exe().ok()?;
    let bin_dir = exe_path.parent()?;

    // Try relative paths
    let candidates = [
        bin_dir.join("../dist/core/daemon.js"),
        bin_dir.join("../src/core/daemon.ts"),
        bin_dir.parent()?.join("dist/core/daemon.js"),
    ];

    for path in candidates {
        if path.exists() {
            return Some(path.to_string_lossy().into_owned());
        }
    }

    None
}

/// Ensure daemon is running for the session
pub fn ensure_daemon(
    session: &str,
    headed: bool,
    executable_path: Option<&str>,
) -> Result<DaemonResult, String> {
    // Check if already running
    if is_daemon_running(session) && is_daemon_ready(session) {
        return Ok(DaemonResult {
            already_running: true,
        });
    }

    // Clean up stale socket
    let socket_path = get_socket_path(session);
    if Path::new(&socket_path).exists() {
        fs::remove_file(&socket_path).ok();
    }

    let pid_file = get_pid_file(session);
    if Path::new(&pid_file).exists() {
        fs::remove_file(&pid_file).ok();
    }

    // Find daemon script
    let daemon_path =
        find_daemon_path().ok_or_else(|| "Could not find daemon script".to_string())?;

    // Build command
    let mut cmd = Command::new("node");
    cmd.arg(&daemon_path)
        .env("AGENT_BROWSER_DAEMON", "1")
        .env("AGENT_BROWSER_SESSION", session);

    if headed {
        cmd.env("AGENT_BROWSER_HEADED", "1");
    }

    if let Some(path) = executable_path {
        cmd.env("AGENT_BROWSER_EXECUTABLE_PATH", path);
    }

    // Spawn as detached background process
    #[cfg(unix)]
    unsafe {
        use std::os::unix::process::CommandExt;
        cmd.pre_exec(|| {
            libc::setsid(); // Create new session (detach from terminal)
            Ok(())
        });
    }

    cmd.stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start daemon: {}", e))?;

    // Wait for daemon to be ready
    for _ in 0..50 {
        thread::sleep(Duration::from_millis(100));
        if is_daemon_ready(session) {
            return Ok(DaemonResult {
                already_running: false,
            });
        }
    }

    Err("Daemon failed to start within 5 seconds".to_string())
}

/// Send a command to the daemon
pub fn send_command(cmd: &CommandJson, session: &str) -> Result<Response, String> {
    let socket_path = get_socket_path(session);

    let mut stream = UnixStream::connect(&socket_path)
        .map_err(|e| format!("Failed to connect to daemon: {}", e))?;

    stream.set_read_timeout(Some(Duration::from_secs(30))).ok();
    stream.set_write_timeout(Some(Duration::from_secs(30))).ok();

    // Send command
    let json = cmd.to_json();
    stream
        .write_all(json.as_bytes())
        .map_err(|e| format!("Failed to send command: {}", e))?;
    stream
        .write_all(b"\n")
        .map_err(|e| format!("Failed to send newline: {}", e))?;

    // Read response
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader
        .read_line(&mut line)
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Parse response
    serde_json::from_str(&line).map_err(|e| format!("Failed to parse response: {}", e))
}
