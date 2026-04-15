/**
 * ICT multi-timeframe report: rules parsing, zone helpers, markdown templates, full run.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as chart from './chart.js';
import * as data from './data.js';
import * as drawing from './drawing.js';
import * as capture from './capture.js';
import * as ui from './ui.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PKG_ROOT = resolve(__dirname, '..', '..');

export function resolveRulesPath(rulesPath) {
  if (rulesPath) return resolve(rulesPath);
  const cwdRules = resolve(process.cwd(), 'rules.json');
  if (existsSync(cwdRules)) return cwdRules;
  return resolve(PKG_ROOT, 'rules.json');
}

export function loadRules(rulesPath) {
  const path = resolveRulesPath(rulesPath);
  if (!existsSync(path)) {
    throw new Error(`rules file not found: ${path}`);
  }
  const raw = readFileSync(path, 'utf-8');
  return { path, data: JSON.parse(raw) };
}

/** Screenshot crop for ICT runs. Default chart = main pane canvas only (no Pine editor in frame). */
export function normalizeIctScreenshotRegion(raw) {
  const v = (raw == null ? 'chart' : String(raw)).toLowerCase();
  if (v === 'chart' || v === 'pane' || v === 'canvas') return 'chart';
  if (v === 'strategy_tester' || v === 'backtest') return 'strategy_tester';
  return 'full';
}

export function getIctConfig(rulesData) {
  const ict = rulesData.ict_report;
  if (!ict) {
    throw new Error(
      'rules.json must include an "ict_report" object. See rules.example.json.',
    );
  }
  const delay = Number(ict.screenshot_delay_ms);
  return {
    symbol: ict.symbol || 'BINANCE:BTCUSDT',
    timeframes:
      Array.isArray(ict.timeframes) && ict.timeframes.length > 0
        ? ict.timeframes
        : ['W', 'D', '240'],
    heuristics: {
      enabled: ict.heuristics?.enabled !== false,
      ohlcv_bars: Math.min(Number(ict.heuristics?.ohlcv_bars) || 100, 500),
    },
    zones: Array.isArray(ict.zones) ? ict.zones : [],
    screenshot_region: normalizeIctScreenshotRegion(ict.screenshot_region),
    screenshot_delay_ms: Math.min(
      Math.max(Number.isFinite(delay) ? delay : 800, 200),
      15000,
    ),
    /** Call TradingView bottomWidgetBar to hide Pine before capture (chart-only PNGs). */
    hide_pine_editor: ict.hide_pine_editor !== false,
    synthesis_hints: Array.isArray(ict.synthesis_hints) ? ict.synthesis_hints : [],
  };
}

export function filterZonesForTf(zones, tf) {
  return zones.filter((z) => {
    const tfs = z.timeframes;
    if (!tfs || !Array.isArray(tfs) || tfs.length === 0) return true;
    return tfs.includes(tf);
  });
}

export function heuristicZoneOps(summary) {
  if (!summary?.last_5_bars?.length) return [];
  const lastBar = summary.last_5_bars[summary.last_5_bars.length - 1];
  const time = lastBar.time;
  const ops = [];
  ops.push({
    shape: 'horizontal_line',
    point: { time, price: summary.high },
    text: 'Range high',
    label: 'Range high (heuristic)',
  });
  ops.push({
    shape: 'horizontal_line',
    point: { time, price: summary.low },
    text: 'Range low',
    label: 'Range low (heuristic)',
  });
  if (summary.close != null) {
    ops.push({
      shape: 'horizontal_line',
      point: { time, price: summary.close },
      text: 'Last close',
      label: 'Last close (heuristic)',
    });
  }
  const mid = Math.round(((summary.high + summary.low) / 2) * 100) / 100;
  ops.push({
    shape: 'horizontal_line',
    point: { time, price: mid },
    text: 'Mid-range',
    label: 'Mid-range (heuristic)',
  });
  return ops;
}

/** Config zones → draw ops; uses defaultTime when time omitted */
export function configZonesToDrawOps(zones, defaultTime) {
  const ops = [];
  for (const z of zones) {
    const shape = z.shape || 'horizontal_line';
    const price = z.point?.price ?? z.price;
    const time = z.point?.time ?? z.time ?? defaultTime;
    if (price == null || time == null) continue;

    if (shape === 'rectangle' || shape === 'trend_line') {
      const p2t = z.point2?.time ?? z.point2_time;
      const p2p = z.point2?.price ?? z.point2_price;
      if (p2t == null || p2p == null) continue;
      ops.push({
        shape,
        point: { time, price },
        point2: { time: p2t, price: p2p },
        text: z.text || z.label || '',
        label: z.label || shape,
      });
    } else if (shape === 'text') {
      ops.push({
        shape: 'text',
        point: { time, price },
        text: z.text || z.label || '',
        label: z.label || 'text',
      });
    } else {
      ops.push({
        shape: 'horizontal_line',
        point: { time, price },
        text: z.label || '',
        label: z.label || `level @ ${price}`,
      });
    }
  }
  return ops;
}

export function mergeDrawOps(configOps, heuristicOps) {
  return [...configOps, ...heuristicOps];
}

export function tfToSlug(tf) {
  const m = { W: 'weekly', D: 'daily', '240': '4h' };
  return m[tf] || String(tf).replace(/\s+/g, '_');
}

export function symbolToFilePrefix(symbol) {
  return symbol.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function makeRunDir() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = join(PKG_ROOT, 'screenshots', 'ict-runs', ts);
  mkdirSync(runDir, { recursive: true });
  return runDir;
}

export function buildTimeframeMarkdown({
  symbol,
  slug,
  ohlcvSummary,
  drawOps,
  riskRules,
}) {
  const lines = [
    `# ICT report — ${symbol} — ${slug}`,
    '',
    '## OHLCV summary (visible window)',
    '',
    '```json',
    JSON.stringify(ohlcvSummary, null, 2),
    '```',
    '',
    '## Marked levels (this capture)',
    '',
  ];
  for (const op of drawOps) {
    const p = op.point?.price ?? op.price;
    lines.push(`- **${op.label}** — ${op.shape} @ ${p}`);
  }
  if (drawOps.length === 0) lines.push('- *(no zones drawn)*');
  lines.push('', '## Risk rules (from rules.json)', '');
  if (riskRules?.length) {
    for (const r of riskRules) lines.push(`- ${r}`);
  } else {
    lines.push('- *(none)*');
  }
  lines.push(
    '',
    '## ICT narrative',
    '',
    '_Discretionary notes: order blocks, FVGs, liquidity sweeps, dealing ranges — align with your methodology._',
    '',
  );
  return lines.join('\n');
}

export function buildSynthesisMarkdown({
  symbol,
  runDir,
  timeframes,
  perTfSummary,
  riskRules,
  notes,
  synthesisHints,
}) {
  const prefix = symbolToFilePrefix(symbol);
  const lines = [
    `# ICT synthesis — ${symbol}`,
    '',
    `**Run directory:** \`${runDir}\``,
    '',
    '## Snapshot index',
    '',
  ];
  for (const tf of timeframes) {
    const slug = tfToSlug(tf);
    const png = `${prefix}_${tf}.png`;
    const md = `${slug}.md`;
    const s = perTfSummary[tf];
    lines.push(`### ${slug}`);
    lines.push(`- Chart: \`${png}\``);
    lines.push(`- Write-up: \`${md}\``);
    if (s?.high != null && s?.low != null) {
      lines.push(`- Window range: **${s.low}** – **${s.high}**`);
    }
    if (s?.close != null) lines.push(`- Last close (window): **${s.close}**`);
    lines.push('');
  }
  if (synthesisHints?.length) {
    lines.push('## Analysis focus (from rules.json → ict_report.synthesis_hints)', '');
    for (const h of synthesisHints) lines.push(`- ${h}`);
    lines.push('');
  }
  lines.push('## Big picture (HTF → LTF)', '');
  lines.push(
    '- **Weekly:** HTF bias, major liquidity pools, swing structure.',
  );
  lines.push(
    '- **Daily:** Intermediate structure, session / prior-day levels, ranges.',
  );
  lines.push(
    '- **4H:** Execution frame — confluence with HTF draws (OB/FVG/liquidity per your rules).',
  );
  lines.push('');
  lines.push('## Synthesized view', '');
  lines.push(
    '_After reviewing all three charts, summarize: bias, key draw on liquidity, invalidation, and what would confirm a shift._',
  );
  lines.push('');
  lines.push('## Risk rules', '');
  if (riskRules?.length) {
    for (const r of riskRules) lines.push(`- ${r}`);
  } else {
    lines.push('- *(none)*');
  }
  if (notes) {
    lines.push('', '## Context (rules notes)', '', String(notes), '');
  }
  return lines.join('\n');
}

export function dryRunPlan({ rulesPath, config }) {
  const prefix = symbolToFilePrefix(config.symbol);
  return {
    success: true,
    dry_run: true,
    rules_path: rulesPath,
    symbol: config.symbol,
    timeframes: config.timeframes,
    heuristics: config.heuristics,
    zone_count: config.zones.length,
    synthesis_hints_count: config.synthesis_hints.length,
    screenshot_region: config.screenshot_region,
    screenshot_delay_ms: config.screenshot_delay_ms,
    hide_pine_editor: config.hide_pine_editor,
    steps: [
      `Load rules: ${rulesPath}`,
      `Set symbol: ${config.symbol}`,
      `Screenshots: region=${config.screenshot_region}, delay_ms=${config.screenshot_delay_ms}, hide_pine_editor=${config.hide_pine_editor}`,
      ...config.timeframes.flatMap((tf) => {
        const slug = tfToSlug(tf);
        return [
          `Timeframe ${tf}: clear drawings → set resolution`,
          `Draw: ${config.heuristics.enabled ? 'config zones + OHLCV heuristics' : 'config zones only'}`,
          `Screenshot → ${prefix}_${tf}.png`,
          `Write ${slug}.md`,
        ];
      }),
      'Write synthesis.md',
    ],
  };
}

/**
 * Full ICT report: CDP chart control, drawings, screenshots, markdown.
 * Used by CLI `tv ict` and MCP tool `tv_ict`.
 */
export async function runIctReport({ rulesPath, dryRun } = {}) {
  const { path: resolvedRulesPath, data: rulesData } = loadRules(rulesPath);
  const cfg = getIctConfig(rulesData);

  if (dryRun) {
    return dryRunPlan({ rulesPath: resolvedRulesPath, config: cfg });
  }

  const runDir = makeRunDir();
  const prefix = symbolToFilePrefix(cfg.symbol);
  const perTfSummary = {};

  await drawing.clearAll();
  await chart.setSymbol({ symbol: cfg.symbol });
  await sleep(1000);

  for (const tf of cfg.timeframes) {
    await drawing.clearAll();
    await chart.setTimeframe({ timeframe: tf });
    await sleep(1200);

    const ohlcvSummary = await data.getOhlcv({
      count: cfg.heuristics.ohlcv_bars,
      summary: true,
    });
    const lastT =
      ohlcvSummary.last_5_bars?.[ohlcvSummary.last_5_bars.length - 1]?.time ??
      Math.floor(Date.now() / 1000);

    const configOps = configZonesToDrawOps(
      filterZonesForTf(cfg.zones, tf),
      lastT,
    );
    const heuristicOps = cfg.heuristics.enabled
      ? heuristicZoneOps(ohlcvSummary)
      : [];
    const drawOps = mergeDrawOps(configOps, heuristicOps);

    for (const op of drawOps) {
      await drawing.drawShape({
        shape: op.shape,
        point: op.point,
        point2: op.point2,
        text: op.text,
      });
    }
    await sleep(cfg.screenshot_delay_ms);

    if (cfg.hide_pine_editor) {
      try {
        await ui.openPanel({ panel: 'pine-editor', action: 'close' });
        await sleep(450);
      } catch {
        /* ignore — some layouts / builds may not expose bottomWidgetBar */
      }
    }

    const cap = await capture.captureScreenshot({
      region: cfg.screenshot_region,
      filename: `${prefix}_${tf}`,
      outputDir: runDir,
    });
    if (!cap.success) {
      throw new Error(cap.error || 'screenshot failed');
    }

    const slug = tfToSlug(tf);
    const md = buildTimeframeMarkdown({
      symbol: cfg.symbol,
      slug,
      ohlcvSummary,
      drawOps,
      riskRules: rulesData.risk_rules,
    });
    writeFileSync(join(runDir, `${slug}.md`), md, 'utf-8');
    perTfSummary[tf] = ohlcvSummary;
  }

  const synthesis = buildSynthesisMarkdown({
    symbol: cfg.symbol,
    runDir,
    timeframes: cfg.timeframes,
    perTfSummary,
    riskRules: rulesData.risk_rules,
    notes: rulesData.notes,
    synthesisHints: cfg.synthesis_hints,
  });
  writeFileSync(join(runDir, 'synthesis.md'), synthesis, 'utf-8');

  const files = [
    ...cfg.timeframes.flatMap((tf) => [
      `${prefix}_${tf}.png`,
      `${tfToSlug(tf)}.md`,
    ]),
    'synthesis.md',
  ];

  return {
    success: true,
    run_dir: runDir,
    rules_path: resolvedRulesPath,
    symbol: cfg.symbol,
    timeframes: cfg.timeframes,
    files,
  };
}
