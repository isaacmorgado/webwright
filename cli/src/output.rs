/**
 * Output Formatting for CLI
 */
use crate::connection::Response;

/// Print response in human-readable or JSON format
pub fn print_response(resp: &Response, json: bool) {
    if json {
        println!("{}", serde_json::to_string_pretty(resp).unwrap_or_default());
        return;
    }

    if resp.success {
        if let Some(ref result) = resp.result {
            // Handle snapshot output specially
            if let Some(tree) = result.get("tree") {
                if let Some(tree_str) = tree.as_str() {
                    println!("{}", tree_str);
                    println!();
                }
                if let Some(url) = result.get("url").and_then(|v| v.as_str()) {
                    println!("\x1b[90mURL:\x1b[0m {}", url);
                }
                if let Some(title) = result.get("title").and_then(|v| v.as_str()) {
                    println!("\x1b[90mTitle:\x1b[0m {}", title);
                }
                return;
            }

            // Handle screenshot output
            if result.get("data").is_some() {
                if let Some(path) = result.get("path").and_then(|v| v.as_str()) {
                    println!("\x1b[32m✓\x1b[0m Screenshot saved to: {}", path);
                } else {
                    println!("\x1b[32m✓\x1b[0m Screenshot captured (base64 data available)");
                }
                return;
            }

            // Handle simple values
            if let Some(url) = result.get("url").and_then(|v| v.as_str()) {
                println!("{}", url);
                return;
            }
            if let Some(title) = result.get("title").and_then(|v| v.as_str()) {
                println!("{}", title);
                return;
            }
            if let Some(text) = result.get("text").and_then(|v| v.as_str()) {
                println!("{}", text);
                return;
            }
            if let Some(value) = result.get("value") {
                if let Some(s) = value.as_str() {
                    println!("{}", s);
                } else {
                    println!("{}", value);
                }
                return;
            }
            if let Some(html) = result.get("html").and_then(|v| v.as_str()) {
                println!("{}", html);
                return;
            }

            // Handle boolean results
            if let Some(visible) = result.get("visible").and_then(|v| v.as_bool()) {
                println!("{}", if visible { "true" } else { "false" });
                return;
            }
            if let Some(enabled) = result.get("enabled").and_then(|v| v.as_bool()) {
                println!("{}", if enabled { "true" } else { "false" });
                return;
            }
            if let Some(checked) = result.get("checked").and_then(|v| v.as_bool()) {
                println!("{}", if checked { "true" } else { "false" });
                return;
            }

            // Handle count
            if let Some(count) = result.get("count").and_then(|v| v.as_i64()) {
                println!("{}", count);
                return;
            }

            // Handle cookies
            if let Some(cookies) = result.get("cookies").and_then(|v| v.as_array()) {
                for cookie in cookies {
                    if let Some(name) = cookie.get("name").and_then(|v| v.as_str()) {
                        let value = cookie.get("value").and_then(|v| v.as_str()).unwrap_or("");
                        println!("{}: {}", name, value);
                    }
                }
                return;
            }

            // Handle pages list
            if let Some(pages) = result.get("pages").and_then(|v| v.as_array()) {
                for (i, page) in pages.iter().enumerate() {
                    let url = page.get("url").and_then(|v| v.as_str()).unwrap_or("");
                    let title = page.get("title").and_then(|v| v.as_str()).unwrap_or("");
                    println!("[{}] {} - {}", i, title, url);
                }
                return;
            }

            // Handle frames list
            if let Some(frames) = result.get("frames").and_then(|v| v.as_array()) {
                for frame in frames {
                    let name = frame
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("(unnamed)");
                    let url = frame.get("url").and_then(|v| v.as_str()).unwrap_or("");
                    println!("{}: {}", name, url);
                }
                return;
            }

            // Handle storage
            if let Some(storage) = result.get("storage").and_then(|v| v.as_object()) {
                for (key, value) in storage {
                    println!("{}: {}", key, value);
                }
                return;
            }

            // Generic success
            if result.get("clicked").is_some()
                || result.get("typed").is_some()
                || result.get("filled").is_some()
                || result.get("checked").is_some()
                || result.get("unchecked").is_some()
                || result.get("selected").is_some()
                || result.get("hovered").is_some()
                || result.get("focused").is_some()
                || result.get("pressed").is_some()
                || result.get("scrolled").is_some()
                || result.get("cleared").is_some()
                || result.get("set").is_some()
                || result.get("launched").is_some()
                || result.get("closed").is_some()
                || result.get("switched").is_some()
                || result.get("created").is_some()
                || result.get("waited").is_some()
                || result.get("found").is_some()
            {
                println!("\x1b[32m✓\x1b[0m Success");
                return;
            }

            // Fall back to JSON for complex results
            println!(
                "{}",
                serde_json::to_string_pretty(result).unwrap_or_default()
            );
        } else {
            println!("\x1b[32m✓\x1b[0m Success");
        }
    } else {
        if let Some(ref error) = resp.error {
            eprintln!("\x1b[31m✗\x1b[0m {}", error);
        } else {
            eprintln!("\x1b[31m✗\x1b[0m Command failed");
        }
    }
}

/// Print help message
pub fn print_help() {
    println!(
        r#"
AgentBrowser Pro - Browser automation for AI agents

Usage: agentbrowser-pro <command> [options]

Commands:
  Navigation:
    navigate <url>        Navigate to a URL
    back                  Go back in history
    forward               Go forward in history
    reload                Reload the page

  Interaction:
    click <selector>      Click an element
    dblclick <selector>   Double-click an element
    type <sel> <text>     Type text into an element
    fill <sel> <value>    Fill an input field (clears first)
    clear <selector>      Clear an input field
    check <selector>      Check a checkbox/radio
    uncheck <selector>    Uncheck a checkbox
    select <sel> <val>    Select dropdown option
    hover <selector>      Hover over an element
    focus <selector>      Focus an element
    press <key> [sel]     Press a keyboard key
    scroll [selector]     Scroll the page or element

  Information:
    snapshot              Get accessibility tree with refs
    screenshot [path]     Take a screenshot
    title                 Get page title
    url                   Get current URL
    text <selector>       Get element text
    html [selector]       Get page or element HTML
    value <selector>      Get input value
    count <selector>      Count matching elements

  State:
    visible <selector>    Check if element is visible
    enabled <selector>    Check if element is enabled
    checked <selector>    Check if checkbox is checked

  Frames:
    frames                List all frames
    frame <selector>      Switch to a frame
    mainframe             Switch to main frame

  Pages:
    pages                 List all pages/tabs
    newpage [url]         Open a new page
    switchpage <idx>      Switch to a page
    closepage             Close current page

  JavaScript:
    eval <script>         Execute JavaScript

  Storage:
    cookies               Get all cookies
    clearcookies          Clear all cookies
    localstorage [key]    Get localStorage
    clearlocalstorage     Clear localStorage

  Other:
    daemon                Start browser daemon
    mcp                   Start MCP server
    pdf [path]            Generate PDF
    stream                Start viewport streaming
    close                 Close browser

Options:
  --session=<name>        Use named session (default: "default")
  --headed                Run browser in headed mode
  --json                  Output results as JSON
  --timeout=<ms>          Set command timeout
  --executable-path=<p>   Path to browser executable
  --help, -h              Show this help message
  --version, -v           Show version

Selectors:
  @e1, @e2, ...          Element refs from snapshot
  e1, e2, ...            Same as @e1, @e2
  CSS selectors          Standard CSS selectors
  role=button            ARIA role selectors

Examples:
  agentbrowser-pro navigate https://example.com
  agentbrowser-pro snapshot
  agentbrowser-pro click @e1
  agentbrowser-pro fill @e2 "hello@example.com"
  agentbrowser-pro press Enter
  agentbrowser-pro screenshot --full-page output.png

Documentation: https://github.com/anthropics/agentbrowser-pro
"#
    );
}

/// Print command-specific help
pub fn print_command_help(command: &str) -> bool {
    match command.to_lowercase().as_str() {
        "navigate" | "open" | "goto" => {
            println!(
                r#"
Navigate to a URL

Usage: agentbrowser-pro navigate <url> [options]

Arguments:
  url                   The URL to navigate to

Options:
  --timeout=<ms>        Maximum time to wait for navigation

Examples:
  agentbrowser-pro navigate https://example.com
  agentbrowser-pro navigate https://example.com --timeout=30000
"#
            );
            true
        }
        "click" => {
            println!(
                r#"
Click an element

Usage: agentbrowser-pro click <selector> [options]

Arguments:
  selector              Element ref (@e1) or CSS selector

Options:
  --timeout=<ms>        Maximum time to wait for element

Examples:
  agentbrowser-pro click @e1
  agentbrowser-pro click "button.submit"
  agentbrowser-pro click "#login-button"
"#
            );
            true
        }
        "snapshot" => {
            println!(
                r#"
Get accessibility tree with element refs

Usage: agentbrowser-pro snapshot [selector] [options]

Arguments:
  selector              Optional selector to scope snapshot

Options:
  --json                Output as JSON

Output format:
  - role "name" [ref=e1] [attributes]

The refs (e1, e2, etc.) can be used with other commands:
  agentbrowser-pro click @e1
  agentbrowser-pro fill @e2 "text"

Examples:
  agentbrowser-pro snapshot
  agentbrowser-pro snapshot "#form"
  agentbrowser-pro snapshot --json
"#
            );
            true
        }
        "fill" => {
            println!(
                r#"
Fill an input field (clears existing content first)

Usage: agentbrowser-pro fill <selector> <value>

Arguments:
  selector              Element ref (@e1) or CSS selector
  value                 Text to fill

Examples:
  agentbrowser-pro fill @e1 "hello@example.com"
  agentbrowser-pro fill "#email" "user@example.com"
"#
            );
            true
        }
        "type" => {
            println!(
                r#"
Type text into an element (preserves existing content)

Usage: agentbrowser-pro type <selector> <text>

Arguments:
  selector              Element ref (@e1) or CSS selector
  text                  Text to type

Examples:
  agentbrowser-pro type @e1 "Hello World"
  agentbrowser-pro type "#search" "search query"
"#
            );
            true
        }
        _ => false,
    }
}
