import { sveltekit } from '@sveltejs/kit/vite'
import houdini from 'houdini/vite'
import type { UserConfig } from 'vite'

import { libReporter } from './src/lib/toExport/plugin'

const config: UserConfig = {
  plugins: [
    houdini(),
    sveltekit(),
    libReporter({
      name: 'Houdini',
      includes: ['$houdini', 'houdini.config.js', 'src/client.ts'],
      excludes: ['svelte', 'vite/preload-helper'],
      limit: {
        source: {
          nb_file_max: 45,
          size_max: 100,
        },
        treeshaked: {
          compressed_max: 15,
        },
      },
    }),
    // libReporter({
    //   name: "Urql",
    //   includes: [
    //     "@urql/svelte",
    //     "@urql/core",
    //     "wonka",
    //     "graphql",
    //     "@urql/exchange-graphcache",
    //   ],
    //   excludes: ["svelte", "vite/preload-helper"],
    // }),
  ],
}

export default config
