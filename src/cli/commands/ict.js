import { register } from '../router.js';
import * as ict from '../../core/ict.js';

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
    return ict.runIctReport({ rulesPath: values.config, dryRun });
  },
});
