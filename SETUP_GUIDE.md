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

## Step 5: Restart Claude Code (full quit required)

MCP servers are started **only when Claude Code launches**. Editing `~/.claude/.mcp.json` does not hot-reload.

After adding or changing the config:

1. **Fully quit** Claude Code (e.g. **Cmd+Q** on Mac, or quit from the menu — not only closing a window or using an in-app `/restart` if that does not relaunch the host app).
2. Open Claude Code again.
3. The `tradingview` MCP server should connect on startup; then tools like `tv_health_check` are available in chat.

**Without MCP:** From a terminal, with the repo installed and TradingView running with `--remote-debugging-port=9222`, you can run `tv status` (same kind of CDP check as `tv_health_check`).

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

**Claude Code users:** Use MCP tool **`tv_ict`** (e.g. *“Run tv_ict”*) after a full app restart so MCP loads — same result as the CLI. Or use the **terminal** command above. Plain chat text “tv ict” alone may not invoke either.

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
| MCP server not showing in Claude Code | Check `~/.claude/.mcp.json` syntax, then **fully quit** Claude Code and reopen (MCP does not load on soft `/restart` alone in many setups) |
| `tv_health_check` not available in chat | Config is correct but session started before MCP was added — **quit Claude Code completely** and reopen; or use terminal `tv status` |
| `tv` command not found | Run `npm link` from the project directory |
| Tools return stale data | TradingView may still be loading — wait a few seconds |
| Pine Editor tools fail | Open the Pine Editor panel first (`ui_open_panel pine-editor open`) |

## What to Read Next

- `rules.json` — ICT report + risk rules (required for `tv ict`)
- `CLAUDE.md` — Decision tree for which tool to use when (auto-loaded by Claude Code)
- `README.md` — Full tool reference and CLI list
- `RESEARCH.md` — Research context and open questions
