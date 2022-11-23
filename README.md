# vite-plugin-lib-reporter

Add in your CI a `limit` check of one of these stats:

![example](https://raw.githubusercontent.com/jycouet/vite-plugin-lib-reporter/main/static/results.png)

## Installation

```bash
pnpm add vite-plugin-lib-reporter -D
```

## Configuration

Add in your `vite.config.ts`:

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import { libReporter } from "vite-plugin-lib-reporter"; // 👈 1/ add import
import type { UserConfig } from "vite";

const config: UserConfig = {
  plugins: [
    sveltekit(),

    /*                  */
    /*   2/ Config 👇   */
    /*                  */
    libReporter({
      name: "My-Super-Lib-To-Check",
      includes: ["My-Super-Lib-To-Check"],
      // excludes: ["svelte"], // optional
      limit: {
        treeshaked: {
          compressed_max: 7,
        },
      },
    }),


  ],
};

export default config;
```

## What's next?

Looking at results with a graph? It's almost ready.

![example](https://raw.githubusercontent.com/jycouet/vite-plugin-lib-reporter/main/static/example.png)