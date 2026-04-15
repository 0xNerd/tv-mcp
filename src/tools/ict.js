import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/ict.js';

export function registerIctTools(server) {
  server.tool(
    'tv_ict',
    'Run the ICT multi-timeframe report: reads rules.json → ict_report, switches chart through each timeframe (default W/D/4H), draws native chart shapes from zones + optional OHLCV heuristics. Does NOT inject Pine — add indicators to the chart separately (pine_set_source / manual). Before each screenshot, collapses right layout strip + bottom Pine widget if hide_pine_editor is true, then restores. Saves PNGs + markdown under screenshots/ict-runs/<timestamp>/. Same as CLI `tv ict`.',
    {
      rules_path: z
        .string()
        .optional()
        .describe(
          'Path to rules.json (default: ./rules.json from cwd, else repo rules.json)',
        ),
      dry_run: z
        .boolean()
        .optional()
        .describe(
          'If true, return planned steps only without connecting to TradingView',
        ),
    },
    async ({ rules_path, dry_run } = {}) => {
      try {
        return jsonResult(
          await core.runIctReport({
            rulesPath: rules_path,
            dryRun: dry_run === true,
          }),
        );
      } catch (err) {
        return jsonResult(
          {
            success: false,
            error: err.message,
            hint: 'Ensure rules.json has an ict_report block, TradingView is running with CDP port 9222, and a chart is open.',
          },
          true,
        );
      }
    },
  );
}
