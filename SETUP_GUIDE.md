# Setup Guide for Claude Code

This file is a step-by-step guide for Claude Code (or any LLM agent) to install and configure the TradingView MCP server. If a user asks you to install or set up this project, follow these steps exactly.

## Step 1: Clone and Install

```bash
git clone https://github.com/0xNerd/tv-mcp.git ~/tv-mcp
cd ~/tv-mcp
npm install
```

If the user specifies a different install path, use that instead of `~/tv-mcp`.

## Step 2: Set Up Rules

Copy the example rules file and open it for the user to fill in:

```bash
cp ~/tv-mcp/rules.example.json ~/tv-mcp/rules.json
```

Tell the user: "Open `rules.json` and set **`ict_report`** (TradingView symbol, timeframes, optional price **zones**), plus **`risk_rules`** and **`notes`** for the report markdown."

## Step 3: Add to MCP Config

Add the server to the user's Claude Code MCP configuration. The config file is at `~/.claude/.mcp.json` (global) or `.mcp.json` (project-level).

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/tv-mcp/src/server.js"]
    }
  }
}
```

Replace `YOUR_USERNAME` with the user's actual system username. Run `echo $USER` (Mac/Linux) or `echo %USERNAME%` (Windows) to find it.

If the config file already exists and has other servers, merge the `tradingview` entry into the existing `mcpServers` object. Do not overwrite other servers.

## Step 4: Launch TradingView Desktop

TradingView Desktop must be running with Chrome DevTools Protocol enabled.

**Auto-detect and launch (recommended):**
After the MCP server is connected, use the `tv_launch` tool — it auto-detects TradingView on Mac, Windows, and Linux.

**Manual launch by platform:**

Mac:
```bash
/Applications/TradingView.app/Contents/MacOS/TradingView --remote-debugging-port=9222
```

Windows:
```bash
%LOCALAPPDATA%\TradingView\TradingView.exe --remote-debugging-port=9222
```

Linux:
```bash
/opt/TradingView/tradingview --remote-debugging-port=9222
# or: tradingview --remote-debugging-port=9222
```

## Step 5: Restart Claude Code

The MCP server only loads when Claude Code starts. After adding the config:

1. Exit Claude Code (Ctrl+C)
2. Relaunch Claude Code
3. The tradingview MCP server should connect automatically

## Step 6: Verify Connection

Use the `tv_health_check` tool. Expected response:

```json
{
  "success": true,
  "cdp_connected": true,
  "chart_symbol": "...",
  "api_available": true
}
```

If `cdp_connected: false`, TradingView is not running with `--remote-debugging-port=9222`.

## Step 7: ICT report (CLI)

With TradingView open and the repo as cwd:

```bash
cd ~/tv-mcp
node src/cli/index.js ict --dry-run
node src/cli/index.js ict
```

Or after `npm link`: `tv ict`. Artifacts: `screenshots/ict-runs/<timestamp>/` (PNGs + markdown + `synthesis.md`).

## Step 8: Install CLI (Optional)

To use the `tv` CLI command globally:

```bash
cd ~/tv-mcp
npm link
```

Then `tv status`, `tv quote`, `tv pine compile`, `tv ict`, etc. work from anywhere.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `cdp_connected: false` | Launch TradingView with `--remote-debugging-port=9222` |
| `ECONNREFUSED` | TradingView isn't running or port 9222 is blocked |
| MCP server not showing in Claude Code | Check `~/.claude/.mcp.json` syntax, restart Claude Code |
| `tv` command not found | Run `npm link` from the project directory |
| Tools return stale data | TradingView may still be loading — wait a few seconds |
| Pine Editor tools fail | Open the Pine Editor panel first (`ui_open_panel pine-editor open`) |

## What to Read Next

- `rules.json` — ICT report + risk rules (required for `tv ict`)
- `CLAUDE.md` — Decision tree for which tool to use when (auto-loaded by Claude Code)
- `README.md` — Full tool reference and CLI list
- `RESEARCH.md` — Research context and open questions
