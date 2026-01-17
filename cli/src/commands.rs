use crate::flags::Flags;
/**
 * Command Parsing with AI-Friendly Error Messages
 */
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct CommandJson {
    pub id: String,
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selector: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interactive: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full_page: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<u64>,
}

impl CommandJson {
    pub fn new(action: &str) -> Self {
        CommandJson {
            id: "1".to_string(),
            action: action.to_string(),
            url: None,
            selector: None,
            text: None,
            value: None,
            key: None,
            path: None,
            interactive: None,
            full_page: None,
            timeout: None,
        }
    }

    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| "{}".to_string())
    }
}

#[derive(Debug)]
pub enum ParseError {
    UnknownCommand {
        command: String,
    },
    UnknownSubcommand {
        subcommand: String,
        valid_options: &'static [&'static str],
    },
    MissingArguments {
        context: String,
        usage: &'static str,
    },
    InvalidValue {
        field: String,
        value: String,
        expected: String,
    },
}

impl ParseError {
    pub fn format(&self) -> String {
        match self {
            ParseError::UnknownCommand { command } => {
                format!(
                    "Unknown command: {}\n\nRun 'agentbrowser-pro --help' to see available commands.",
                    command
                )
            }
            ParseError::UnknownSubcommand {
                subcommand,
                valid_options,
            } => {
                format!(
                    "Unknown subcommand: {}\nValid options: {}",
                    subcommand,
                    valid_options.join(", ")
                )
            }
            ParseError::MissingArguments { context, usage } => {
                format!(
                    "Missing arguments for: {}\nUsage: agentbrowser-pro {}",
                    context, usage
                )
            }
            ParseError::InvalidValue {
                field,
                value,
                expected,
            } => {
                format!(
                    "Invalid value for {}: '{}'\nExpected: {}",
                    field, value, expected
                )
            }
        }
    }
}

pub fn parse_command(args: &[String], flags: &Flags) -> Result<CommandJson, ParseError> {
    if args.is_empty() {
        return Err(ParseError::MissingArguments {
            context: "command".to_string(),
            usage: "<command> [arguments]",
        });
    }

    let command = args[0].to_lowercase();
    let rest = &args[1..];

    match command.as_str() {
        // ============ Lifecycle ============
        "daemon" => Ok(CommandJson::new("daemon")),

        "mcp" => Ok(CommandJson::new("mcp")),

        "launch" => {
            let mut cmd = CommandJson::new("launch");
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "close" => Ok(CommandJson::new("close")),

        // ============ Navigation ============
        "navigate" | "open" | "goto" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "navigate".to_string(),
                    usage: "navigate <url>",
                });
            }
            let mut cmd = CommandJson::new("navigate");
            cmd.url = Some(rest[0].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "back" => Ok(CommandJson::new("back")),

        "forward" => Ok(CommandJson::new("forward")),

        "reload" | "refresh" => Ok(CommandJson::new("reload")),

        // ============ Interaction ============
        "click" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "click".to_string(),
                    usage: "click <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("click");
            cmd.selector = Some(rest[0].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "dblclick" | "doubleclick" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "dblclick".to_string(),
                    usage: "dblclick <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("dblclick");
            cmd.selector = Some(rest[0].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "type" => {
            if rest.len() < 2 {
                return Err(ParseError::MissingArguments {
                    context: "type".to_string(),
                    usage: "type <selector|ref> <text>",
                });
            }
            let mut cmd = CommandJson::new("type");
            cmd.selector = Some(rest[0].clone());
            cmd.text = Some(rest[1..].join(" "));
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "fill" => {
            if rest.len() < 2 {
                return Err(ParseError::MissingArguments {
                    context: "fill".to_string(),
                    usage: "fill <selector|ref> <value>",
                });
            }
            let mut cmd = CommandJson::new("fill");
            cmd.selector = Some(rest[0].clone());
            cmd.value = Some(rest[1..].join(" "));
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "clear" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "clear".to_string(),
                    usage: "clear <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("clear");
            cmd.selector = Some(rest[0].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "check" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "check".to_string(),
                    usage: "check <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("check");
            cmd.selector = Some(rest[0].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "uncheck" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "uncheck".to_string(),
                    usage: "uncheck <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("uncheck");
            cmd.selector = Some(rest[0].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "select" => {
            if rest.len() < 2 {
                return Err(ParseError::MissingArguments {
                    context: "select".to_string(),
                    usage: "select <selector|ref> <value|label|index>",
                });
            }
            let mut cmd = CommandJson::new("select");
            cmd.selector = Some(rest[0].clone());
            cmd.value = Some(rest[1].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "hover" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "hover".to_string(),
                    usage: "hover <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("hover");
            cmd.selector = Some(rest[0].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "focus" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "focus".to_string(),
                    usage: "focus <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("focus");
            cmd.selector = Some(rest[0].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "press" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "press".to_string(),
                    usage: "press <key> [selector]",
                });
            }
            let mut cmd = CommandJson::new("press");
            cmd.key = Some(rest[0].clone());
            if rest.len() > 1 {
                cmd.selector = Some(rest[1].clone());
            }
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "scroll" => {
            let mut cmd = CommandJson::new("scroll");
            if !rest.is_empty() {
                cmd.selector = Some(rest[0].clone());
            }
            Ok(cmd)
        }

        // ============ Information ============
        "snapshot" => {
            let mut cmd = CommandJson::new("snapshot");
            cmd.interactive = Some(true);
            if !rest.is_empty() {
                cmd.selector = Some(rest[0].clone());
            }
            Ok(cmd)
        }

        "screenshot" => {
            let mut cmd = CommandJson::new("screenshot");
            if !rest.is_empty() {
                cmd.path = Some(rest[0].clone());
            }
            // Check for --full-page flag in original args
            if args.iter().any(|a| a == "--full-page") {
                cmd.full_page = Some(true);
            }
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "title" | "gettitle" => Ok(CommandJson::new("getTitle")),

        "url" | "geturl" => Ok(CommandJson::new("getUrl")),

        "text" | "gettext" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "text".to_string(),
                    usage: "text <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("getText");
            cmd.selector = Some(rest[0].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "html" | "gethtml" => {
            let mut cmd = CommandJson::new("getHtml");
            if !rest.is_empty() {
                cmd.selector = Some(rest[0].clone());
            }
            Ok(cmd)
        }

        "value" | "getvalue" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "value".to_string(),
                    usage: "value <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("getValue");
            cmd.selector = Some(rest[0].clone());
            cmd.timeout = flags.timeout;
            Ok(cmd)
        }

        "count" | "getcount" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "count".to_string(),
                    usage: "count <selector>",
                });
            }
            let mut cmd = CommandJson::new("getCount");
            cmd.selector = Some(rest[0].clone());
            Ok(cmd)
        }

        // ============ State Checks ============
        "visible" | "isvisible" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "visible".to_string(),
                    usage: "visible <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("isVisible");
            cmd.selector = Some(rest[0].clone());
            Ok(cmd)
        }

        "enabled" | "isenabled" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "enabled".to_string(),
                    usage: "enabled <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("isEnabled");
            cmd.selector = Some(rest[0].clone());
            Ok(cmd)
        }

        "checked" | "ischecked" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "checked".to_string(),
                    usage: "checked <selector|ref>",
                });
            }
            let mut cmd = CommandJson::new("isChecked");
            cmd.selector = Some(rest[0].clone());
            Ok(cmd)
        }

        // ============ Wait ============
        "wait" => {
            let mut cmd = CommandJson::new("wait");
            if !rest.is_empty() {
                if let Ok(timeout) = rest[0].parse::<u64>() {
                    cmd.timeout = Some(timeout);
                } else {
                    // Treat as selector
                    cmd.action = "waitForSelector".to_string();
                    cmd.selector = Some(rest[0].clone());
                }
            } else {
                cmd.timeout = Some(1000);
            }
            Ok(cmd)
        }

        // ============ Frames ============
        "frames" | "getframes" => Ok(CommandJson::new("getFrames")),

        "frame" | "switchtoframe" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "frame".to_string(),
                    usage: "frame <selector|name|url>",
                });
            }
            let mut cmd = CommandJson::new("switchToFrame");
            cmd.selector = Some(rest[0].clone());
            Ok(cmd)
        }

        "mainframe" => Ok(CommandJson::new("switchToMainFrame")),

        // ============ Pages ============
        "pages" | "getpages" => Ok(CommandJson::new("getPages")),

        "newpage" => {
            let mut cmd = CommandJson::new("newPage");
            if !rest.is_empty() {
                cmd.url = Some(rest[0].clone());
            }
            Ok(cmd)
        }

        "switchpage" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "switchpage".to_string(),
                    usage: "switchpage <index|url|title>",
                });
            }
            let mut cmd = CommandJson::new("switchPage");
            // Try to parse as index first
            if let Ok(index) = rest[0].parse::<u32>() {
                // Would need to add index field to CommandJson
                cmd.value = Some(index.to_string());
            } else {
                cmd.url = Some(rest[0].clone());
            }
            Ok(cmd)
        }

        "closepage" => {
            let cmd = CommandJson::new("closePage");
            Ok(cmd)
        }

        // ============ JavaScript ============
        "eval" | "evaluate" => {
            if rest.is_empty() {
                return Err(ParseError::MissingArguments {
                    context: "eval".to_string(),
                    usage: "eval <script>",
                });
            }
            let mut cmd = CommandJson::new("evaluate");
            cmd.text = Some(rest.join(" "));
            Ok(cmd)
        }

        // ============ Cookies ============
        "cookies" | "getcookies" => Ok(CommandJson::new("getCookies")),

        "clearcookies" => Ok(CommandJson::new("clearCookies")),

        // ============ Storage ============
        "localstorage" | "getlocalstorage" => {
            let mut cmd = CommandJson::new("getLocalStorage");
            if !rest.is_empty() {
                cmd.key = Some(rest[0].clone());
            }
            Ok(cmd)
        }

        "clearlocalstorage" => Ok(CommandJson::new("clearLocalStorage")),

        // ============ PDF ============
        "pdf" => {
            let mut cmd = CommandJson::new("pdf");
            if !rest.is_empty() {
                cmd.path = Some(rest[0].clone());
            }
            Ok(cmd)
        }

        // ============ Streaming ============
        "stream" | "startstream" => Ok(CommandJson::new("startStream")),

        "stopstream" => Ok(CommandJson::new("stopStream")),

        // Unknown command
        _ => Err(ParseError::UnknownCommand {
            command: command.clone(),
        }),
    }
}
