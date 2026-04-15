# TradingView MCP (tv-mcp)

**Repository:** [github.com/0xNerd/tv-mcp](https://github.com/0xNerd/tv-mcp)

If you found this from the YouTube video — welcome. This is the improved fork. Everything you need is below.

Built on top of the original [tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp) by [@tradesdontlie](https://github.com/tradesdontlie). Full credit to them for the foundation. This fork adds a **`tv ict`** workflow (multi-timeframe zones + screenshots + markdown under `screenshots/ict-runs/`), a unified **`rules.json`** config, and fixes the launch bug on TradingView Desktop v2.14+.

> [!WARNING]
> **Not affiliated with TradingView Inc. or Anthropic.** This tool connects to your locally running TradingView Desktop app via Chrome DevTools Protocol. Review the [Disclaimer](#disclaimer) before use.

> [!IMPORTANT]
> **Requires a valid TradingView subscription.** This tool does not bypass any TradingView paywall. It reads from and controls the TradingView Desktop app already running on your machine.

> [!NOTE]
> **All data processing happens locally.** Nothing is sent anywhere. No TradingView data leaves your machine.

---

## What's New in This Fork

| Feature | What it does |
|---------|-------------|
| `tv ict` | For each timeframe: draws zones, then **chart-only PNGs** (`screenshot_region` default **`chart`**). **`hide_pine_editor`** (default **true**) closes the Pine panel before capture via `bottomWidgetBar.hideWidget`. Set `hide_pine_editor`: false or `screenshot_region`: `full` if you want the whole window. |
| `rules.json` | **`ict_report`** (symbol, TFs, screenshot options, zones, **`synthesis_hints`**), **`bias_criteria`**, **`risk_rules`** (e.g. 1:8–1:9 R:R), **`notes`** — tuned for ICT-style packs and `synthesis.md` |
| Launch bug fix | Fixed `tv_launch` compatibility with TradingView Desktop v2.14+ |
| `capture_screenshot` | Optional `output_dir` argument to save PNGs outside the default folder |

---

## One-Shot Setup

Paste this into Claude Code and it will handle everything:

```
Set up tv-mcp (TradingView MCP) for me. 
Clone https://github.com/0xNerd/tv-mcp.git to ~/tv-mcp, run npm install, then add it to my MCP config at ~/.claude/.mcp.json (merge with any existing servers, don't overwrite them). 
The config block is: { "mcpServers": { "tradingview": { "command": "node", "args": ["/Users/YOUR_USERNAME/tv-mcp/src/server.js"] } } } — replace YOUR_USERNAME with my actual username.
Then copy rules.example.json to rules.json and open it so I can fill in ict_report (symbol, zones) and risk rules.
Finally fully quit and reopen Claude Code (so MCP loads), then verify with tv_health_check or `tv status` in a terminal.
After that, to run the ICT report from inside Claude Code, ask the agent to run the shell command (see "In Claude Code" below)—do not type only `tv ict` in chat as plain text.
```

Or follow the manual steps below.

---

## Prerequisites

- **TradingView Desktop app** (paid subscription required for real-time data)
- **Node.js 18+**
- **Claude Code** (for MCP tools) or any terminal (for CLI)
- **macOS, Windows, or Linux**

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/0xNerd/tv-mcp.git ~/tv-mcp
cd ~/tv-mcp
npm install
```

### 2. Set up your rules

```bash
cp rules.example.json rules.json
```

Open `rules.json` and fill in:
- **`ict_report`** — symbol, timeframes, screenshot options, optional **zones**, **`synthesis_hints`** (injected into **`synthesis.md`**)
- **`bias_criteria`** — HTF bias language for ICT-style reads
- **`risk_rules`** and **`notes`** — in each timeframe `.md` and **`synthesis.md`** (e.g. **1:8–1:9** reward:risk band)

### 3. Launch TradingView with CDP

TradingView must be running with the debug port enabled.

**Mac:**
```bash
./scripts/launch_tv_debug_mac.sh
```

**Windows:**
```bash
scripts\launch_tv_debug.bat
```

**Linux:**
```bash
./scripts/launch_tv_debug_linux.sh
```

Or use the MCP tool after setup: `"Use tv_launch to start TradingView in debug mode"`

### 4. Add to Claude Code

Add to `~/.claude/.mcp.json` (merge with any existing servers):

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

Replace `YOUR_USERNAME` with your actual username. On Mac: `echo $USER` to check.

### 5. Verify

**Fully quit** Claude Code (e.g. Cmd+Q) and reopen it so MCP loads your config — in-session `/restart` often does **not** attach new MCP servers. Then ask: *"Use tv_health_check to verify TradingView is connected"*.

From the terminal you can also run `tv status` (same CDP check, no MCP needed).

### 6. Run your first ICT report

From the project directory with TradingView open (debug port):

```bash
npm link # one time — global `tv` CLI
tv ict --dry-run   # validate rules.json without connecting
tv ict
```

Outputs land in `screenshots/ict-runs/<ISO-timestamp>/` (PNG per timeframe + markdown + `synthesis.md`).

**Screenshots (chart-only, Pine hidden):**

- **`ict_report.screenshot_region`** — Default **`chart`** (main price pane canvas via `[data-name="pane-canvas"]`). Use **`full`** only if you want the entire app content in the PNG.
- **`ict_report.hide_pine_editor`** — Default **`true`**: runs the same close action as **`ui_open_panel`** (`pine-editor`, `close`) before each shot so the **Pine editor is not in the image**. Set to **`false`** to skip (e.g. if hiding fails on your layout).
- **`ict_report.screenshot_delay_ms`** — Default **800** ms after drawing levels; raise to **1000–1500** if the chart still looks mid-update.
- **Dark theme** — *Settings → Appearance* in TradingView (not controlled by this tool).
- **Overlays on chart** — Indicators (e.g. **[examples/position-tool.pine](examples/position-tool.pine)**) must **compile** and stay on the chart; Pine can stay open while you work — it is closed only briefly before each capture when `hide_pine_editor` is true.

### In Claude Code (after the one-shot setup)

- **MCP tool `tv_ict`** — Same job as `tv ict` on the command line. After a full quit/relaunch so MCP is loaded, ask: *“Use **tv_ict** to generate the ICT report”* (optional: `dry_run: true` first). Returns JSON with `run_dir` and `files`.
- **Terminal** — `cd ~/tv-mcp && node src/cli/index.js ict` (or `tv ict` after `npm link`).

If you only type plain text like “tv ict” without asking for the tool or terminal, the model may answer conversationally instead of running the pack.

---

## What This Tool Does

- **ICT report CLI** — `tv ict` marks levels from `rules.json`, captures W/D/4H charts, writes paired analysis markdown
- **Pine Script development** — write, inject, compile, debug scripts with AI
- **Chart navigation** — change symbols, timeframes, zoom to dates, add/remove indicators
- **Visual analysis** — read indicator values, price levels, drawn levels from custom indicators
- **Draw on charts** — trend lines, horizontal levels, rectangles, text
- **Manage alerts** — create, list, delete price alerts
- **Replay practice** — step through historical bars, practice entries and exits with P&L tracking
- **Screenshots** — capture chart state
- **Multi-pane layouts** — 2x2, 3x1 grids with different symbols per pane
- **Stream data** — JSONL output from your live chart for monitoring scripts
- **CLI access** — every tool is also a `tv` command, pipe-friendly JSON output

---

## How Claude Knows Which Tool to Use

Claude reads `CLAUDE.md` automatically when working in this project. It contains the full decision tree.

| You say... | Claude uses... |
|------------|---------------|
| "Generate my ICT multi-TF pack" | **`tv_ict`** (MCP) or CLI **`tv ict`** |
| "What's on my chart?" | `chart_get_state` → `data_get_study_values` → `quote_get` |
| "Give me a full analysis" | `quote_get` → `data_get_study_values` → `data_get_pine_lines` → `data_get_pine_labels` → `capture_screenshot` |
| "Switch to BTCUSD daily" | `chart_set_symbol` → `chart_set_timeframe` |
| "Write a Pine Script for..." | `pine_set_source` → `pine_smart_compile` → `pine_get_errors` |
| "Start replay at March 1st" | `replay_start` → `replay_step` → `replay_trade` |
| "Set up a 4-chart grid" | `pane_set_layout` → `pane_set_symbol` |
| "Draw a level at 94200" | `draw_shape` (horizontal_line) |

---

## Tool Reference (MCP)

### ICT report (this fork)

| Tool | What it does |
|------|-------------|
| `tv_ict` | Same as `tv ict`: chart-only PNGs by default, closes Pine editor before each capture (`ict_report.hide_pine_editor`). Optional: `rules_path`, `dry_run`. |

### Chart Reading

| Tool | When to use | Output size |
|------|------------|-------------|
| `chart_get_state` | First call — get symbol, timeframe, all indicator names + IDs | ~500B |
| `data_get_study_values` | Read current RSI, MACD, BB, EMA values from all indicators | ~500B |
| `quote_get` | Get latest price, OHLC, volume | ~200B |
| `data_get_ohlcv` | Get price bars. **Use `summary: true`** for compact stats | 500B (summary) / 8KB (100 bars) |

### Custom Indicator Data (Pine Drawings)

Read `line.new()`, `label.new()`, `table.new()`, `box.new()` output from any visible Pine indicator.

| Tool | When to use |
|------|------------|
| `data_get_pine_lines` | Horizontal price levels (support/resistance, session levels) |
| `data_get_pine_labels` | Text annotations + prices ("PDH 24550", "Bias Long") |
| `data_get_pine_tables` | Data tables (session stats, analytics dashboards) |
| `data_get_pine_boxes` | Price zones as {high, low} pairs |

**Always use `study_filter`** to target a specific indicator: `study_filter: "MyIndicator"`.

### Chart Control

| Tool | What it does |
|------|-------------|
| `chart_set_symbol` | Change ticker (BTCUSD, AAPL, ES1!, NYMEX:CL1!) |
| `chart_set_timeframe` | Change resolution (1, 5, 15, 60, D, W, M) |
| `chart_set_type` | Change style (Candles, HeikinAshi, Line, Area, Renko) |
| `chart_manage_indicator` | Add/remove indicators. **Use full names**: "Relative Strength Index" not "RSI" |
| `chart_scroll_to_date` | Jump to a date (ISO: "2025-01-15") |
| `indicator_set_inputs` / `indicator_toggle_visibility` | Change indicator settings, show/hide |

### Pine Script Development

| Tool | Step |
|------|------|
| `pine_set_source` | 1. Inject code into editor |
| `pine_smart_compile` | 2. Compile with auto-detection + error check |
| `pine_get_errors` | 3. Read compilation errors if any |
| `pine_get_console` | 4. Read log.info() output |
| `pine_save` | 5. Save to TradingView cloud |
| `pine_analyze` | Offline static analysis (no chart needed) |
| `pine_check` | Server-side compile check (no chart needed) |

### Replay Mode

| Tool | Step |
|------|------|
| `replay_start` | Enter replay at a date |
| `replay_step` | Advance one bar |
| `replay_autoplay` | Auto-advance (set speed in ms) |
| `replay_trade` | Buy/sell/close positions |
| `replay_status` | Check position, P&L, date |
| `replay_stop` | Return to realtime |

### Multi-Pane, Alerts, Drawings, UI

| Tool | What it does |
|------|-------------|
| `pane_set_layout` | Change grid: `s`, `2h`, `2v`, `2x2`, `4`, `6`, `8` |
| `pane_set_symbol` | Set symbol on any pane |
| `draw_shape` | Draw horizontal_line, trend_line, rectangle, text |
| `alert_create` / `alert_list` / `alert_delete` | Manage price alerts |
| `batch_run` | Run action across multiple symbols/timeframes |
| `watchlist_get` / `watchlist_add` | Read/modify watchlist |
| `capture_screenshot` | Screenshot (regions: full, chart, strategy_tester) |
| `tv_launch` / `tv_health_check` | Launch TradingView and verify connection |

---

## CLI Commands

```bash
tv ict                             # W/D/4H screenshots + markdown (see rules.json)
tv ict --dry-run                   # show planned steps only
tv ict -c /path/rules.json         # alternate rules file

tv status                          # check connection
tv quote                           # current price
tv symbol BTCUSD                   # change symbol
tv ohlcv --summary                 # price summary
tv screenshot -r chart             # capture chart
tv pine compile                    # compile Pine Script
tv pane layout 2x2                 # 4-chart grid
tv stream quote | jq '.close'      # monitor price ticks
```

Full command list: `tv --help`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `cdp_connected: false` | TradingView isn't running with `--remote-debugging-port=9222`. Use the launch script. |
| `ECONNREFUSED` | TradingView isn't running or port 9222 is blocked |
| MCP server not showing in Claude Code | Check `~/.claude/.mcp.json` syntax, then **fully quit** Claude Code and reopen |
| `tv_health_check` missing in chat | MCP only initializes at app startup — full quit and relaunch; or run `tv status` in a terminal |
| `tv` command not found | Run `npm link` from the project directory |
| `tv ict` — missing `ict_report` | Run `cp rules.example.json rules.json` and set `ict_report.symbol` |
| `tv ict` — CDP errors | Launch TradingView with `--remote-debugging-port=9222` |
| Tools return stale data | TradingView still loading — wait a few seconds |
| Pine Editor tools fail | Open Pine Editor panel first: `ui_open_panel pine-editor open` |

---

## Architecture

```
Claude Code  ←→  MCP Server (stdio)  ←→  CDP (port 9222)  ←→  TradingView Desktop (Electron)
```

- **MCP**: chart/data/pine/replay/UI tools (morning-brief tools removed in this fork); use **`tv ict`** for the multi-timeframe pack
- **Transport**: MCP over stdio + CLI (`tv` command)
- **Connection**: Chrome DevTools Protocol on localhost:9222
- **No external network calls** — everything runs locally
- **Zero extra dependencies** beyond the original

---

## Credits

This fork is built on [tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp) by [@tradesdontlie](https://github.com/tradesdontlie). The original tool is the foundation — go star their repo.

---

## Disclaimer

This project is provided **for personal, educational, and research purposes only**.

This tool uses the Chrome DevTools Protocol (CDP), a standard debugging interface built into all Chromium-based applications. It does not reverse engineer any proprietary TradingView protocol, connect to TradingView's servers, or bypass any access controls. The debug port must be explicitly enabled by the user via a standard Chromium command-line flag.

By using this software you agree that:

1. You are solely responsible for ensuring your use complies with [TradingView's Terms of Use](https://www.tradingview.com/policies/) and all applicable laws.
2. This tool accesses undocumented internal TradingView APIs that may change at any time.
3. This tool must not be used to redistribute, resell, or commercially exploit TradingView's market data.
4. The authors are not responsible for any account bans, suspensions, or other consequences.

**Use at your own risk.**

## License

MIT — see [LICENSE](LICENSE). Applies to source code only, not to TradingView's software, data, or trademarks.
