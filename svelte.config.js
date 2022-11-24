import adapter from '@sveltejs/adapter-static'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),

  kit: {
    adapter: adapter(),

    alias: {
      $houdini: './$houdini',
    },
  },

  package: {
    emitTypes: true,
    source: './src/lib/toExport',
    exports: filePath => {
      return filePath === 'index.ts'
    },
    // files: (filePath) => {
    //   return filePath === "index.ts";
    // },
  },
}

export default config
