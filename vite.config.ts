import { sveltekit } from '@sveltejs/kit/vite'
import type { UserConfig } from 'vite'

import { libReporter } from './src/lib/toExport/plugin'

const config: UserConfig = {
  plugins: [
    sveltekit(),
    libReporter(
      [
        {
          name: 'Svelte',
          includes: ['node_modules/svelte'],
          // always_log_report: true,
        },
        {
          name: 'Layercake',
          includes: ['node_modules/layercake', 'node_modules/d3', 'node_modules/internmap'],
          excludes: ['svelte'],
          // always_log_report: true,
        },
      ],
      true,
    ),
  ],
}

export default config
