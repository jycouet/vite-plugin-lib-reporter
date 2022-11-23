# vite-plugin-lib-reporter

## Installation

```bash
pnpm add vite-plugin-lib-reporter -D
```

## Configuration

Add in your `vite.config.ts`:

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import { libReporter } from "vite-plugin-lib-reporter";
import type { UserConfig } from "vite";

const config: UserConfig = {
  plugins: [
    sveltekit(),
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
