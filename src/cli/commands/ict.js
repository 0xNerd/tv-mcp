import { register } from '../router.js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as chart from '../../core/chart.js';
import * as data from '../../core/data.js';
import * as drawing from '../../core/drawing.js';
import * as capture from '../../core/capture.js';
import * as ict from '../../core/ict.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

register('ict', {
  description:
    'ICT-style multi-timeframe report (W/D/4H): mark zones from rules.json, screenshots + markdown + synthesis',
  options: {
    config: {
      type: 'string',
      short: 'c',
      description: 'Path to rules.json (default: ./rules.json or repo rules.json)',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Print planned steps only (no TradingView connection)',
    },
  },
  handler: async (values) => {
    const dryRun = values['dry-run'] === true;
    const { path: rulesPath, data: rulesData } = ict.loadRules(values.config);
    const cfg = ict.getIctConfig(rulesData);

    if (dryRun) {
      return ict.dryRunPlan({ rulesPath, config: cfg });
    }

    const runDir = ict.makeRunDir();
    const prefix = ict.symbolToFilePrefix(cfg.symbol);
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

      const configOps = ict.configZonesToDrawOps(
        ict.filterZonesForTf(cfg.zones, tf),
        lastT,
      );
      const heuristicOps = cfg.heuristics.enabled
        ? ict.heuristicZoneOps(ohlcvSummary)
        : [];
      const drawOps = ict.mergeDrawOps(configOps, heuristicOps);

      for (const op of drawOps) {
        await drawing.drawShape({
          shape: op.shape,
          point: op.point,
          point2: op.point2,
          text: op.text,
        });
      }
      await sleep(450);

      const cap = await capture.captureScreenshot({
        region: 'chart',
        filename: `${prefix}_${tf}`,
        outputDir: runDir,
      });
      if (!cap.success) {
        throw new Error(cap.error || 'screenshot failed');
      }

      const slug = ict.tfToSlug(tf);
      const md = ict.buildTimeframeMarkdown({
        symbol: cfg.symbol,
        slug,
        ohlcvSummary,
        drawOps,
        riskRules: rulesData.risk_rules,
      });
      writeFileSync(join(runDir, `${slug}.md`), md, 'utf-8');
      perTfSummary[tf] = ohlcvSummary;
    }

    const synthesis = ict.buildSynthesisMarkdown({
      symbol: cfg.symbol,
      runDir,
      timeframes: cfg.timeframes,
      perTfSummary,
      riskRules: rulesData.risk_rules,
      notes: rulesData.notes,
    });
    writeFileSync(join(runDir, 'synthesis.md'), synthesis, 'utf-8');

    const files = [
      ...cfg.timeframes.flatMap((tf) => [
        `${prefix}_${tf}.png`,
        `${ict.tfToSlug(tf)}.md`,
      ]),
      'synthesis.md',
    ];

    return {
      success: true,
      run_dir: runDir,
      symbol: cfg.symbol,
      timeframes: cfg.timeframes,
      files,
    };
  },
});
