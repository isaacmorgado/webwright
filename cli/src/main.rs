/**
 * AgentBrowser Pro CLI - Fast Rust command parser
 * Adapted from agent-browser/cli/src/main.rs
 *
 * Provides 50x faster startup than Node.js (~10ms vs ~500ms)
 */

use std::env;
use std::io::{Read, Write, BufRead, BufReader};
use std::process::{exit, Command, Stdio};
use std::time::Duration;
use std::thread;
use std::fs;
use std::path::Path;

mod commands;
mod connection;
mod flags;
mod output;

use commands::{parse_command, ParseError};
use connection::{ensure_daemon, send_command, DaemonResult};
use flags::Flags;
use output::{print_response, print_help, print_command_help};

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let flags = Flags::parse(&args);
    let clean = clean_args(&args);

    // Help handling
    let has_help = args.iter().any(|a| a == "--help" || a == "-h");
    if has_help {
        if let Some(cmd) = clean.get(0) {
            if print_command_help(cmd) {
                return;
            }
        }
        print_help();
        return;
    }

    // Version handling
    if args.iter().any(|a| a == "--version" || a == "-v") {
        println!("agentbrowser-pro 1.0.0");
        return;
    }

    // No command provided
    if clean.is_empty() {
        print_help();
        return;
    }

    // Parse command
    let cmd = match parse_command(&clean, &flags) {
        Ok(c) => c,
        Err(e) => {
            if flags.json {
                let error_type = match &e {
                    ParseError::UnknownCommand { .. } => "unknown_command",
                    ParseError::UnknownSubcommand { .. } => "unknown_subcommand",
                    ParseError::MissingArguments { .. } => "missing_arguments",
                    ParseError::InvalidValue { .. } => "invalid_value",
                };
                println!(
                    r#"{{"success":false,"error":"{}","type":"{}"}}"#,
                    e.format().replace('\n', " ").replace('"', "\\\""),
                    error_type
                );
            } else {
                eprintln!("\x1b[31m✗\x1b[0m {}", e.format());
            }
            exit(1);
        }
    };

    // Handle special commands
    if cmd.action == "daemon" {
        start_daemon(&flags);
        return;
    }

    if cmd.action == "mcp" {
        start_mcp_server(&flags);
        return;
    }

    // Ensure daemon is running
    let daemon_result = match ensure_daemon(&flags.session, flags.headed, flags.executable_path.as_deref()) {
        Ok(result) => result,
        Err(e) => {
            if flags.json {
                println!(r#"{{"success":false,"error":"{}"}}"#, e);
            } else {
                eprintln!("\x1b[31m✗\x1b[0m {}", e);
            }
            exit(1);
        }
    };

    // Send command and print response
    match send_command(&cmd, &flags.session) {
        Ok(resp) => {
            let success = resp.success;
            print_response(&resp, flags.json);
            if !success {
                exit(1);
            }
        }
        Err(e) => {
            if flags.json {
                println!(r#"{{"success":false,"error":"{}"}}"#, e);
            } else {
                eprintln!("\x1b[31m✗\x1b[0m {}", e);
            }
            exit(1);
        }
    }
}

/// Remove flags from arguments
fn clean_args(args: &[String]) -> Vec<String> {
    args.iter()
        .filter(|a| !a.starts_with("--") && !a.starts_with("-"))
        .cloned()
        .collect()
}

/// Start the daemon process
fn start_daemon(flags: &Flags) {
    println!("Starting AgentBrowser Pro daemon (session: {})...", flags.session);

    // Get path to Node.js daemon
    let daemon_path = find_daemon_path().expect("Could not find daemon script");

    let mut cmd = Command::new("node");
    cmd.arg(&daemon_path)
        .env("AGENT_BROWSER_DAEMON", "1")
        .env("AGENT_BROWSER_SESSION", &flags.session);

    if flags.headed {
        cmd.env("AGENT_BROWSER_HEADED", "1");
    }

    if let Some(ref path) = flags.executable_path {
        cmd.env("AGENT_BROWSER_EXECUTABLE_PATH", path);
    }

    // Run in foreground for daemon command
    let status = cmd
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()
        .expect("Failed to start daemon");

    exit(status.code().unwrap_or(1));
}

/// Start the MCP server
fn start_mcp_server(flags: &Flags) {
    // Get path to Node.js entry
    let entry_path = find_entry_path().expect("Could not find entry script");

    let mut cmd = Command::new("node");
    cmd.arg(&entry_path)
        .arg("mcp")
        .env("AGENT_BROWSER_SESSION", &flags.session);

    if flags.headed {
        cmd.env("AGENT_BROWSER_HEADED", "1");
    }

    let status = cmd
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()
        .expect("Failed to start MCP server");

    exit(status.code().unwrap_or(1));
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

    // Try global installation
    if let Ok(npm_prefix) = env::var("npm_config_prefix") {
        let global_path = Path::new(&npm_prefix)
            .join("lib/node_modules/@anthropic/agentbrowser-pro/dist/core/daemon.js");
        if global_path.exists() {
            return Some(global_path.to_string_lossy().into_owned());
        }
    }

    None
}

/// Find the entry script path
fn find_entry_path() -> Option<String> {
    let exe_path = env::current_exe().ok()?;
    let bin_dir = exe_path.parent()?;

    let candidates = [
        bin_dir.join("agentbrowser-pro"),
        bin_dir.join("../bin/agentbrowser-pro"),
    ];

    for path in candidates {
        if path.exists() {
            return Some(path.to_string_lossy().into_owned());
        }
    }

    None
}
