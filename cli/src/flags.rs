/**
 * CLI Flag Parsing
 */

pub struct Flags {
    pub json: bool,
    pub session: String,
    pub headed: bool,
    pub executable_path: Option<String>,
    pub extensions: Vec<String>,
    pub timeout: Option<u64>,
}

impl Flags {
    pub fn parse(args: &[String]) -> Self {
        let mut flags = Flags {
            json: false,
            session: String::from("default"),
            headed: false,
            executable_path: None,
            extensions: Vec::new(),
            timeout: None,
        };

        for arg in args {
            if arg == "--json" {
                flags.json = true;
            } else if arg == "--headed" {
                flags.headed = true;
            } else if let Some(value) = arg.strip_prefix("--session=") {
                flags.session = value.to_string();
            } else if let Some(value) = arg.strip_prefix("--executable-path=") {
                flags.executable_path = Some(value.to_string());
            } else if let Some(value) = arg.strip_prefix("--extensions=") {
                flags.extensions = value.split(',').map(|s| s.trim().to_string()).collect();
            } else if let Some(value) = arg.strip_prefix("--timeout=") {
                flags.timeout = value.parse().ok();
            }
        }

        // Check environment variables as fallback
        if flags.session == "default" {
            if let Ok(session) = std::env::var("AGENT_BROWSER_SESSION") {
                flags.session = session;
            }
        }

        if !flags.headed {
            flags.headed = std::env::var("AGENT_BROWSER_HEADED")
                .map(|v| v == "1")
                .unwrap_or(false);
        }

        if flags.executable_path.is_none() {
            flags.executable_path = std::env::var("AGENT_BROWSER_EXECUTABLE_PATH").ok();
        }

        if flags.extensions.is_empty() {
            if let Ok(extensions) = std::env::var("AGENT_BROWSER_EXTENSIONS") {
                flags.extensions = extensions
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .collect();
            }
        }

        flags
    }
}
