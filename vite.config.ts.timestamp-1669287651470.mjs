// vite.config.ts
import { sveltekit } from "file:///home/jycouet/udev/gh/lib/vite-plugin-lib-reporter/node_modules/.pnpm/@sveltejs+kit@1.0.0-next.559_svelte@3.53.1+vite@3.2.4/node_modules/@sveltejs/kit/src/exports/vite/index.js";

// src/lib/toExport/plugin.ts
import { Log, logGreen, logYellow, logRed } from "file:///home/jycouet/udev/gh/lib/vite-plugin-lib-reporter/node_modules/.pnpm/@kitql+helper@0.6.0/node_modules/@kitql/helper/esm/index.js";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import { join } from "path";
import { minify } from "file:///home/jycouet/udev/gh/lib/vite-plugin-lib-reporter/node_modules/.pnpm/terser@5.15.1/node_modules/terser/main.js";

// src/lib/toExport/formatString.ts
function formatSize(number) {
  return (number / 1024).toFixed(2) + " kb";
}

// src/lib/toExport/plugin.ts
var log = new Log("lib-reporter");
var folderDevStatic = "./static";
var fileName = `data-lib-reporter.json`;
function libReporter(config2) {
  const includes = (config2 == null ? void 0 : config2.includes) || [];
  const excludes = (config2 == null ? void 0 : config2.excludes) || [];
  function localPrjPath(path) {
    return path.replace(process.cwd() + "/", "");
  }
  function isInteresing(id) {
    for (let i = 0; i < includes.length; i++) {
      if (localPrjPath(id).includes(includes[i])) {
        return true;
      }
    }
    return false;
  }
  function isNotInteresing(id) {
    for (let i = 0; i < excludes.length; i++) {
      if (localPrjPath(id).includes(excludes[i])) {
        return true;
      }
    }
    return false;
  }
  const compress = promisify(gzip);
  let info = {};
  return {
    name: "lib:reporter",
    apply: "build",
    async moduleParsed(module) {
      var _a, _b;
      try {
        await unlink(join(folderDevStatic, fileName));
      } catch (error) {
      }
      if (isInteresing(module.id)) {
        const minified = (await minify(module.code ?? "")).code || "";
        const compressed = await compress(minified);
        info[module.id] = {
          missing: ((_a = info[module.id]) == null ? void 0 : _a.missing) || [],
          size: ((_b = module.code) == null ? void 0 : _b.length) || 0,
          minified: minified.length,
          compressed: compressed.length,
          output: []
        };
        const missing = [];
        [...module.importedIds, ...module.dynamicallyImportedIds].forEach((id) => {
          if (!isInteresing(id) && !isNotInteresing(id)) {
            missing.push(id);
          }
        });
        info[module.id].missing = [.../* @__PURE__ */ new Set([...info[module.id].missing, ...missing])];
      }
    },
    async writeBundle({ dir: outDir }, output) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
      if (outDir == null ? void 0 : outDir.endsWith("client")) {
        let format2 = function(nbFiles, size, minified, compressed) {
          return {
            nbFiles,
            size: formatSize(size).padStart(10),
            minified: formatSize(minified).padStart(10),
            compressed: formatSize(compressed).padStart(10)
          };
        }, addToLimit2 = function(type, subType, value, confLimit) {
          if (confLimit === void 0) {
            return;
          }
          const isKbValue = subType !== "nbFiles";
          const limitToUse = isKbValue ? confLimit * 1024 : confLimit;
          if (limitToUse < value) {
            listLimits.push(
              `${logRed("")}${type} ${subType} ${logRed(`${isKbValue ? formatSize(value) : value}`)} exceeded the limit of ${logYellow(`${isKbValue ? formatSize(limitToUse) : limitToUse}`)}`
            );
          }
        };
        var format = format2, addToLimit = addToLimit2;
        for (const key in output) {
          const { modules } = output[key];
          for (const id in modules) {
            if (isInteresing(id)) {
              const module = modules[id];
              const minified = (await minify(module.code ?? "")).code || "";
              const compressed = await compress(minified);
              info[id].output.push({
                key,
                size: module.renderedLength,
                minified: minified.length,
                compressed: compressed.length,
                removedExports: module.removedExports
              });
            }
          }
        }
        let oriNbFiles = 0;
        let oriSize = 0;
        let oriMinified = 0;
        let oriCompressed = 0;
        const optFiles = [];
        let optSize = 0;
        let optMinified = 0;
        let optCompressed = 0;
        let optMissing = [];
        const removedExports = [];
        const treeData = [];
        for (const key in info) {
          const { size, minified, compressed, output: output2, missing } = info[key];
          oriNbFiles++;
          oriSize += size;
          oriMinified += minified;
          oriCompressed += compressed;
          optFiles.push(...output2.map((c) => c.key));
          optMissing.push(...missing.map((c) => localPrjPath(c)));
          optSize += output2.reduce((acc, cur) => acc + cur.size, 0);
          optMinified += output2.reduce((acc, cur) => acc + cur.minified, 0);
          optCompressed += output2.reduce((acc, cur) => acc + cur.compressed, 0);
          output2.forEach((o) => {
            o.removedExports.forEach((r) => removedExports.push({ id: key, name: r }));
            if (compressed - o.compressed > 0) {
              treeData.push({
                location: localPrjPath(key),
                valueUsed: o.compressed,
                valueRemoved: compressed - o.compressed
              });
            } else {
              treeData.push({
                location: localPrjPath(key),
                valueUsed: o.compressed,
                valueRemoved: 0
              });
            }
          });
        }
        optMissing = [...new Set(optMissing)];
        const optNbFiles = new Set(optFiles).size;
        const results = {
          source: format2(oriNbFiles, oriSize, oriMinified, oriCompressed),
          treeshaked: format2(optNbFiles, optSize, optMinified, optCompressed)
        };
        const listLimits = [];
        addToLimit2("source", "nbFiles", oriNbFiles, (_b = (_a = config2.limit) == null ? void 0 : _a.source) == null ? void 0 : _b.nb_file_max);
        addToLimit2("source", "size", oriSize, (_d = (_c = config2.limit) == null ? void 0 : _c.source) == null ? void 0 : _d.size_max);
        addToLimit2("source", "minified", oriMinified, (_f = (_e = config2.limit) == null ? void 0 : _e.source) == null ? void 0 : _f.minified_max);
        addToLimit2(
          "source",
          "compressed",
          oriCompressed,
          (_h = (_g = config2.limit) == null ? void 0 : _g.source) == null ? void 0 : _h.compressed_max
        );
        addToLimit2(
          "treeshaked",
          "nbFiles",
          optNbFiles,
          (_j = (_i = config2.limit) == null ? void 0 : _i.treeshaked) == null ? void 0 : _j.nb_file_max
        );
        addToLimit2("treeshaked", "size", optSize, (_l = (_k = config2.limit) == null ? void 0 : _k.treeshaked) == null ? void 0 : _l.size_max);
        addToLimit2("treeshaked", "minified", optMinified, (_n = (_m = config2.limit) == null ? void 0 : _m.treeshaked) == null ? void 0 : _n.minified_max);
        addToLimit2(
          "treeshaked",
          "compressed",
          optCompressed,
          (_p = (_o = config2.limit) == null ? void 0 : _o.treeshaked) == null ? void 0 : _p.compressed_max
        );
        if (optMissing.length === 0 && listLimits.length === 0) {
          let contentJson = [];
          try {
            const content = await readFile(join(folderDevStatic, fileName), "utf-8");
            contentJson = JSON.parse(content.toString());
          } catch (error) {
          }
          contentJson = contentJson.filter((c) => c.name !== config2.name);
          contentJson.push({
            name: config2.name,
            results: {
              source: {
                nbFile: oriNbFiles,
                size: oriSize,
                minified: oriMinified,
                compressed: oriCompressed
              },
              treeshaked: {
                nbFile: new Set(optFiles).size,
                size: optSize,
                minified: optMinified,
                compressed: optCompressed
              }
            },
            treeData
          });
          await mkdir(folderDevStatic, { recursive: true });
          await writeFile(join(folderDevStatic, fileName), JSON.stringify(contentJson, null, 2));
        }
        if (optMissing.length === 0 && listLimits.length === 0) {
          if (config2.always_log_report) {
            log.info(`{ name: ${logGreen(config2.name)} }`);
            console.table(results);
            console.log("");
          } else {
            log.info(`{ name: ${logGreen(config2.name)} } ${logGreen(`\u2714 success`)}`);
          }
        }
        if (optMissing.length === 0) {
        } else {
          log.info(`{ name: ${logGreen(config2.name)} }`);
          console.table(results);
          const msg = `${logYellow("")}Missing ${logYellow("includes")} and/or ${logYellow("exculdes")}`;
          this.error({
            message: `${msg}: [${optMissing.map((c) => logRed(`'${c}'`)).join(", ")}]`,
            stack: `[lib:reporter] ${logGreen(config2.name)} => ${msg}. ${logRed(
              `Check your config`
            )} `
          });
          console.log("");
        }
        if (listLimits.length > 0) {
          log.info(`{ name: ${logGreen(config2.name)} }`);
          console.table(results);
          this.error({
            message: `\r
${listLimits.map((c) => ` - ${c}`).join("\r\n")}`,
            stack: `[lib:reporter] ${config2.name} => ${logRed(`limit exceeded.`)}`
          });
          console.log("");
        }
      }
    }
  };
}

// vite.config.ts
var config = {
  plugins: [
    sveltekit(),
    libReporter({
      name: "Svelte",
      includes: ["node_modules/svelte"],
      always_log_report: true
    }),
    libReporter({
      name: "Layercake",
      includes: ["node_modules/layercake", "node_modules/d3", "node_modules/internmap"],
      excludes: ["svelte"],
      always_log_report: true
    })
  ]
};
var vite_config_default = config;
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL2xpYi90b0V4cG9ydC9wbHVnaW4udHMiLCAic3JjL2xpYi90b0V4cG9ydC9mb3JtYXRTdHJpbmcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9qeWNvdWV0L3VkZXYvZ2gvbGliL3ZpdGUtcGx1Z2luLWxpYi1yZXBvcnRlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvanljb3VldC91ZGV2L2doL2xpYi92aXRlLXBsdWdpbi1saWItcmVwb3J0ZXIvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvanljb3VldC91ZGV2L2doL2xpYi92aXRlLXBsdWdpbi1saWItcmVwb3J0ZXIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzdmVsdGVraXQgfSBmcm9tICdAc3ZlbHRlanMva2l0L3ZpdGUnXG5pbXBvcnQgdHlwZSB7IFVzZXJDb25maWcgfSBmcm9tICd2aXRlJ1xuXG5pbXBvcnQgeyBsaWJSZXBvcnRlciB9IGZyb20gJy4vc3JjL2xpYi90b0V4cG9ydC9wbHVnaW4nXG5cbmNvbnN0IGNvbmZpZzogVXNlckNvbmZpZyA9IHtcbiAgcGx1Z2luczogW1xuICAgIHN2ZWx0ZWtpdCgpLFxuICAgIGxpYlJlcG9ydGVyKHtcbiAgICAgIG5hbWU6ICdTdmVsdGUnLFxuICAgICAgaW5jbHVkZXM6IFsnbm9kZV9tb2R1bGVzL3N2ZWx0ZSddLFxuICAgICAgYWx3YXlzX2xvZ19yZXBvcnQ6IHRydWUsXG4gICAgfSksXG4gICAgbGliUmVwb3J0ZXIoe1xuICAgICAgbmFtZTogJ0xheWVyY2FrZScsXG4gICAgICBpbmNsdWRlczogWydub2RlX21vZHVsZXMvbGF5ZXJjYWtlJywgJ25vZGVfbW9kdWxlcy9kMycsICdub2RlX21vZHVsZXMvaW50ZXJubWFwJ10sXG4gICAgICBleGNsdWRlczogWydzdmVsdGUnXSxcbiAgICAgIGFsd2F5c19sb2dfcmVwb3J0OiB0cnVlLFxuICAgIH0pLFxuICBdLFxufVxuXG5leHBvcnQgZGVmYXVsdCBjb25maWdcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvanljb3VldC91ZGV2L2doL2xpYi92aXRlLXBsdWdpbi1saWItcmVwb3J0ZXIvc3JjL2xpYi90b0V4cG9ydFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvanljb3VldC91ZGV2L2doL2xpYi92aXRlLXBsdWdpbi1saWItcmVwb3J0ZXIvc3JjL2xpYi90b0V4cG9ydC9wbHVnaW4udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvanljb3VldC91ZGV2L2doL2xpYi92aXRlLXBsdWdpbi1saWItcmVwb3J0ZXIvc3JjL2xpYi90b0V4cG9ydC9wbHVnaW4udHNcIjtpbXBvcnQgeyBMb2csIGxvZ0dyZWVuLCBsb2dZZWxsb3csIGxvZ1JlZCB9IGZyb20gJ0BraXRxbC9oZWxwZXInXG5pbXBvcnQgeyB3cml0ZUZpbGUsIG1rZGlyLCByZWFkRmlsZSwgdW5saW5rIH0gZnJvbSAnZnMvcHJvbWlzZXMnXG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICdub2RlOnV0aWwnXG5pbXBvcnQgeyBnemlwIH0gZnJvbSAnbm9kZTp6bGliJ1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnXG5pbXBvcnQgeyBtaW5pZnkgfSBmcm9tICd0ZXJzZXInXG5pbXBvcnQgdHlwZSB7IFBsdWdpbiB9IGZyb20gJ3ZpdGUnXG5cbmltcG9ydCB7IGZvcm1hdFNpemUgfSBmcm9tICcuL2Zvcm1hdFN0cmluZy5qcydcblxuY29uc3QgbG9nID0gbmV3IExvZygnbGliLXJlcG9ydGVyJylcblxuY29uc3QgZm9sZGVyRGV2U3RhdGljID0gJy4vc3RhdGljJ1xuY29uc3QgZm9sZGVyRGVwbG95ZWRMaWJfdWkgPSAnLi9ub2RlX21vZHVsZXMvdml0ZS1wbHVnaW4tbGliLXJlcG9ydGVyL3VpJ1xuXG5jb25zdCBmaWxlTmFtZSA9IGBkYXRhLWxpYi1yZXBvcnRlci5qc29uYFxuXG5leHBvcnQgdHlwZSBDb25maWcgPSB7XG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgbGlicmFyeVxuICAgKi9cbiAgbmFtZTogc3RyaW5nXG5cbiAgLyoqXG4gICAqIGluY2x1ZGVzIHRvIGFkZCBpbiB0aGUgcmVwb3J0XG4gICAqL1xuICBpbmNsdWRlczogc3RyaW5nW11cblxuICAvKipcbiAgICogZXhjbHVkZXMgdG8gcmVtb3ZlIG9mIHRoZSByZXBvcnRcbiAgICovXG4gIGV4Y2x1ZGVzPzogc3RyaW5nW11cblxuICAvKipcbiAgICogQnJlYWsgeW91ciBidWlsZCBpZiB5b3UgZXhjZWVkIGEgbGltaXQgKHNpemUsIG1pbmlmaWVkIGFuZCBjb21wcmVzc2VkIGluIEtiKVxuICAgKi9cbiAgbGltaXQ/OiB7XG4gICAgc291cmNlPzoge1xuICAgICAgbmJfZmlsZV9tYXg/OiBudW1iZXJcbiAgICAgIHNpemVfbWF4PzogbnVtYmVyXG4gICAgICBtaW5pZmllZF9tYXg/OiBudW1iZXJcbiAgICAgIGNvbXByZXNzZWRfbWF4PzogbnVtYmVyXG4gICAgfVxuICAgIHRyZWVzaGFrZWQ/OiB7XG4gICAgICBuYl9maWxlX21heD86IG51bWJlclxuICAgICAgc2l6ZV9tYXg/OiBudW1iZXJcbiAgICAgIG1pbmlmaWVkX21heD86IG51bWJlclxuICAgICAgY29tcHJlc3NlZF9tYXg/OiBudW1iZXJcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogYWx3YXlzIGxvZyByZXBvcnQgaW4gdGhlIGNvbnNvbGUuIEJ5IGRlZmF1bHQsIGl0J3MgaGVyZSBvbmx5IGlmIHRoZXJlIGlzIGFuIGlzc3VlLlxuICAgKi9cbiAgYWx3YXlzX2xvZ19yZXBvcnQ/OiBib29sZWFuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaWJSZXBvcnRlcihjb25maWc6IENvbmZpZyk6IFBsdWdpbiB7XG4gIC8vIGNvbmZpZ3NcbiAgY29uc3QgaW5jbHVkZXMgPSBjb25maWc/LmluY2x1ZGVzIHx8IFtdXG4gIGNvbnN0IGV4Y2x1ZGVzID0gY29uZmlnPy5leGNsdWRlcyB8fCBbXVxuXG4gIGZ1bmN0aW9uIGxvY2FsUHJqUGF0aChwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBwYXRoLnJlcGxhY2UocHJvY2Vzcy5jd2QoKSArICcvJywgJycpXG4gIH1cblxuICAvLyB1dGlsaXRpZXNcbiAgZnVuY3Rpb24gaXNJbnRlcmVzaW5nKGlkOiBzdHJpbmcpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGluY2x1ZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobG9jYWxQcmpQYXRoKGlkKS5pbmNsdWRlcyhpbmNsdWRlc1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgZnVuY3Rpb24gaXNOb3RJbnRlcmVzaW5nKGlkOiBzdHJpbmcpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGV4Y2x1ZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobG9jYWxQcmpQYXRoKGlkKS5pbmNsdWRlcyhleGNsdWRlc1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgY29uc3QgY29tcHJlc3MgPSBwcm9taXNpZnkoZ3ppcClcblxuICAvLyBzdGF0ZVxuICB0eXBlIEluZm8gPSB7XG4gICAgbWlzc2luZzogc3RyaW5nW11cbiAgICBzaXplOiBudW1iZXJcbiAgICBtaW5pZmllZDogbnVtYmVyXG4gICAgY29tcHJlc3NlZDogbnVtYmVyXG4gICAgb3V0cHV0OiB7XG4gICAgICBrZXk6IHN0cmluZ1xuICAgICAgc2l6ZTogbnVtYmVyXG4gICAgICBtaW5pZmllZDogbnVtYmVyXG4gICAgICBjb21wcmVzc2VkOiBudW1iZXJcbiAgICAgIHJlbW92ZWRFeHBvcnRzOiBzdHJpbmdbXVxuICAgIH1bXVxuICB9XG4gIGxldCBpbmZvOiBSZWNvcmQ8c3RyaW5nLCBJbmZvPiA9IHt9XG5cbiAgLy8gUGx1Z2luXG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2xpYjpyZXBvcnRlcicsXG4gICAgYXBwbHk6ICdidWlsZCcsXG5cbiAgICBhc3luYyBtb2R1bGVQYXJzZWQobW9kdWxlKSB7XG4gICAgICAvLyBybXYgcHJldmlvdXMgZ2VuZXJhdGVkIGZpbGVzXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB1bmxpbmsoam9pbihmb2xkZXJEZXZTdGF0aWMsIGZpbGVOYW1lKSlcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7fVxuXG4gICAgICBpZiAoaXNJbnRlcmVzaW5nKG1vZHVsZS5pZCkpIHtcbiAgICAgICAgY29uc3QgbWluaWZpZWQgPSAoYXdhaXQgbWluaWZ5KG1vZHVsZS5jb2RlID8/ICcnKSkuY29kZSB8fCAnJ1xuICAgICAgICBjb25zdCBjb21wcmVzc2VkID0gYXdhaXQgY29tcHJlc3MobWluaWZpZWQpXG5cbiAgICAgICAgaW5mb1ttb2R1bGUuaWRdID0ge1xuICAgICAgICAgIG1pc3Npbmc6IGluZm9bbW9kdWxlLmlkXT8ubWlzc2luZyB8fCBbXSxcbiAgICAgICAgICBzaXplOiBtb2R1bGUuY29kZT8ubGVuZ3RoIHx8IDAsXG4gICAgICAgICAgbWluaWZpZWQ6IG1pbmlmaWVkLmxlbmd0aCxcbiAgICAgICAgICBjb21wcmVzc2VkOiBjb21wcmVzc2VkLmxlbmd0aCxcbiAgICAgICAgICBvdXRwdXQ6IFtdLFxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWlzc2luZzogc3RyaW5nW10gPSBbXVxuXG4gICAgICAgIC8vIEFkZCB0byB0aGUgbG9nIGlmIHNvbWUgc3R1ZmYgYXJlIG1pc3NpbmcuLi4gdG8gY291bnQgXCJyZWFsXCIgc3R1ZmYgbmVlZGVkIGJ5IHRoZSBsaWJcbiAgICAgICAgO1suLi5tb2R1bGUuaW1wb3J0ZWRJZHMsIC4uLm1vZHVsZS5keW5hbWljYWxseUltcG9ydGVkSWRzXS5mb3JFYWNoKGlkID0+IHtcbiAgICAgICAgICBpZiAoIWlzSW50ZXJlc2luZyhpZCkgJiYgIWlzTm90SW50ZXJlc2luZyhpZCkpIHtcbiAgICAgICAgICAgIG1pc3NpbmcucHVzaChpZClcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgaW5mb1ttb2R1bGUuaWRdLm1pc3NpbmcgPSBbLi4ubmV3IFNldChbLi4uaW5mb1ttb2R1bGUuaWRdLm1pc3NpbmcsIC4uLm1pc3NpbmddKV1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgYXN5bmMgd3JpdGVCdW5kbGUoeyBkaXI6IG91dERpciB9LCBvdXRwdXQpIHtcbiAgICAgIC8vIE9ubHkgaW50ZXN0ZWQgaW4gdGhlIGNsaWVudCBvdXRwdXQgZmlsZXNcbiAgICAgIGlmIChvdXREaXI/LmVuZHNXaXRoKCdjbGllbnQnKSkge1xuICAgICAgICAvLyBMZXQncyBjaGVjayBpbiB0aGUgb3V0cHV0IGZpbGVzIHdoYXQgcmVmZXJlbmNlZCB0aGUgb3JpbmFsIGZpbGVzXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIG91dHB1dCkge1xuICAgICAgICAgIGNvbnN0IHsgbW9kdWxlcyB9ID0gb3V0cHV0W2tleV0gYXMgYW55XG4gICAgICAgICAgZm9yIChjb25zdCBpZCBpbiBtb2R1bGVzKSB7XG4gICAgICAgICAgICBpZiAoaXNJbnRlcmVzaW5nKGlkKSkge1xuICAgICAgICAgICAgICBjb25zdCBtb2R1bGUgPSBtb2R1bGVzW2lkXVxuXG4gICAgICAgICAgICAgIC8vIGRlbGV0ZSBtb2R1bGUuY29kZTtcbiAgICAgICAgICAgICAgLy8gZGVsZXRlIG1vZHVsZS5hc3Q7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBtb2R1bGVzYCwgbW9kdWxlKTtcblxuICAgICAgICAgICAgICBjb25zdCBtaW5pZmllZCA9IChhd2FpdCBtaW5pZnkobW9kdWxlLmNvZGUgPz8gJycpKS5jb2RlIHx8ICcnXG4gICAgICAgICAgICAgIGNvbnN0IGNvbXByZXNzZWQgPSBhd2FpdCBjb21wcmVzcyhtaW5pZmllZClcblxuICAgICAgICAgICAgICBpbmZvW2lkXS5vdXRwdXQucHVzaCh7XG4gICAgICAgICAgICAgICAga2V5LFxuICAgICAgICAgICAgICAgIHNpemU6IG1vZHVsZS5yZW5kZXJlZExlbmd0aCxcbiAgICAgICAgICAgICAgICBtaW5pZmllZDogbWluaWZpZWQubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGNvbXByZXNzZWQ6IGNvbXByZXNzZWQubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJlbW92ZWRFeHBvcnRzOiBtb2R1bGUucmVtb3ZlZEV4cG9ydHMsXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gcHJlcGFyaW5nIHRoZSBkaXNwbGF5Li4uXG4gICAgICAgIGxldCBvcmlOYkZpbGVzID0gMFxuICAgICAgICBsZXQgb3JpU2l6ZSA9IDBcbiAgICAgICAgbGV0IG9yaU1pbmlmaWVkID0gMFxuICAgICAgICBsZXQgb3JpQ29tcHJlc3NlZCA9IDBcblxuICAgICAgICBjb25zdCBvcHRGaWxlczogc3RyaW5nW10gPSBbXVxuICAgICAgICBsZXQgb3B0U2l6ZSA9IDBcbiAgICAgICAgbGV0IG9wdE1pbmlmaWVkID0gMFxuICAgICAgICBsZXQgb3B0Q29tcHJlc3NlZCA9IDBcbiAgICAgICAgbGV0IG9wdE1pc3Npbmc6IHN0cmluZ1tdID0gW11cblxuICAgICAgICBjb25zdCByZW1vdmVkRXhwb3J0czogeyBpZDogc3RyaW5nOyBuYW1lOiBzdHJpbmcgfVtdID0gW11cbiAgICAgICAgY29uc3QgdHJlZURhdGE6IHtcbiAgICAgICAgICBsb2NhdGlvbjogc3RyaW5nXG4gICAgICAgICAgdmFsdWVVc2VkOiBudW1iZXJcbiAgICAgICAgICB2YWx1ZVJlbW92ZWQ6IG51bWJlclxuICAgICAgICB9W10gPSBbXVxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgaW5mb2AsIGluZm8pO1xuXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGluZm8pIHtcbiAgICAgICAgICBjb25zdCB7IHNpemUsIG1pbmlmaWVkLCBjb21wcmVzc2VkLCBvdXRwdXQsIG1pc3NpbmcgfSA9IGluZm9ba2V5XVxuICAgICAgICAgIG9yaU5iRmlsZXMrK1xuICAgICAgICAgIG9yaVNpemUgKz0gc2l6ZVxuICAgICAgICAgIG9yaU1pbmlmaWVkICs9IG1pbmlmaWVkXG4gICAgICAgICAgb3JpQ29tcHJlc3NlZCArPSBjb21wcmVzc2VkXG5cbiAgICAgICAgICBvcHRGaWxlcy5wdXNoKC4uLm91dHB1dC5tYXAoYyA9PiBjLmtleSkpXG4gICAgICAgICAgb3B0TWlzc2luZy5wdXNoKC4uLm1pc3NpbmcubWFwKGMgPT4gbG9jYWxQcmpQYXRoKGMpKSlcbiAgICAgICAgICBvcHRTaXplICs9IG91dHB1dC5yZWR1Y2UoKGFjYywgY3VyKSA9PiBhY2MgKyBjdXIuc2l6ZSwgMClcbiAgICAgICAgICBvcHRNaW5pZmllZCArPSBvdXRwdXQucmVkdWNlKChhY2MsIGN1cikgPT4gYWNjICsgY3VyLm1pbmlmaWVkLCAwKVxuICAgICAgICAgIG9wdENvbXByZXNzZWQgKz0gb3V0cHV0LnJlZHVjZSgoYWNjLCBjdXIpID0+IGFjYyArIGN1ci5jb21wcmVzc2VkLCAwKVxuXG4gICAgICAgICAgb3V0cHV0LmZvckVhY2gobyA9PiB7XG4gICAgICAgICAgICBvLnJlbW92ZWRFeHBvcnRzLmZvckVhY2gociA9PiByZW1vdmVkRXhwb3J0cy5wdXNoKHsgaWQ6IGtleSwgbmFtZTogciB9KSlcblxuICAgICAgICAgICAgaWYgKGNvbXByZXNzZWQgLSBvLmNvbXByZXNzZWQgPiAwKSB7XG4gICAgICAgICAgICAgIHRyZWVEYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBsb2NhbFByalBhdGgoa2V5KSxcbiAgICAgICAgICAgICAgICB2YWx1ZVVzZWQ6IG8uY29tcHJlc3NlZCxcbiAgICAgICAgICAgICAgICB2YWx1ZVJlbW92ZWQ6IGNvbXByZXNzZWQgLSBvLmNvbXByZXNzZWQsXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0cmVlRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICBsb2NhdGlvbjogbG9jYWxQcmpQYXRoKGtleSksXG4gICAgICAgICAgICAgICAgdmFsdWVVc2VkOiBvLmNvbXByZXNzZWQsXG4gICAgICAgICAgICAgICAgdmFsdWVSZW1vdmVkOiAwLFxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgb3B0TWlzc2luZyA9IFsuLi5uZXcgU2V0KG9wdE1pc3NpbmcpXVxuICAgICAgICBjb25zdCBvcHROYkZpbGVzID0gbmV3IFNldChvcHRGaWxlcykuc2l6ZVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdChuYkZpbGVzOiBudW1iZXIsIHNpemU6IG51bWJlciwgbWluaWZpZWQ6IG51bWJlciwgY29tcHJlc3NlZDogbnVtYmVyKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5iRmlsZXM6IG5iRmlsZXMsXG4gICAgICAgICAgICBzaXplOiBmb3JtYXRTaXplKHNpemUpLnBhZFN0YXJ0KDEwKSxcbiAgICAgICAgICAgIG1pbmlmaWVkOiBmb3JtYXRTaXplKG1pbmlmaWVkKS5wYWRTdGFydCgxMCksXG4gICAgICAgICAgICBjb21wcmVzc2VkOiBmb3JtYXRTaXplKGNvbXByZXNzZWQpLnBhZFN0YXJ0KDEwKSxcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZvcm1hdChvcmlOYkZpbGVzLCBvcmlTaXplLCBvcmlNaW5pZmllZCwgb3JpQ29tcHJlc3NlZCksXG4gICAgICAgICAgdHJlZXNoYWtlZDogZm9ybWF0KG9wdE5iRmlsZXMsIG9wdFNpemUsIG9wdE1pbmlmaWVkLCBvcHRDb21wcmVzc2VkKSxcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZFRvTGltaXQoXG4gICAgICAgICAgdHlwZTogJ3NvdXJjZScgfCAndHJlZXNoYWtlZCcsXG4gICAgICAgICAgc3ViVHlwZTogJ25iRmlsZXMnIHwgJ3NpemUnIHwgJ21pbmlmaWVkJyB8ICdjb21wcmVzc2VkJyxcbiAgICAgICAgICB2YWx1ZTogbnVtYmVyLFxuICAgICAgICAgIGNvbmZMaW1pdD86IG51bWJlcixcbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKGNvbmZMaW1pdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgaXNLYlZhbHVlID0gc3ViVHlwZSAhPT0gJ25iRmlsZXMnXG4gICAgICAgICAgY29uc3QgbGltaXRUb1VzZSA9IGlzS2JWYWx1ZSA/IGNvbmZMaW1pdCAqIDEwMjQgOiBjb25mTGltaXRcbiAgICAgICAgICAvLyBjb25zdCB2YWx1ZVRvVXNlID0gaXNLYlZhbHVlID8gdmFsdWUgLyAxMDI0IDogdmFsdWU7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coYGxpbWl0VG9Vc2VgLCBsaW1pdFRvVXNlKTtcblxuICAgICAgICAgIGlmIChsaW1pdFRvVXNlIDwgdmFsdWUpIHtcbiAgICAgICAgICAgIGxpc3RMaW1pdHMucHVzaChcbiAgICAgICAgICAgICAgYCR7bG9nUmVkKCcnKX0ke3R5cGV9ICR7c3ViVHlwZX0gYCArXG4gICAgICAgICAgICAgICAgYCR7bG9nUmVkKGAke2lzS2JWYWx1ZSA/IGZvcm1hdFNpemUodmFsdWUpIDogdmFsdWV9YCl9IGAgK1xuICAgICAgICAgICAgICAgIGBleGNlZWRlZCB0aGUgbGltaXQgb2YgYCArXG4gICAgICAgICAgICAgICAgYCR7bG9nWWVsbG93KGAke2lzS2JWYWx1ZSA/IGZvcm1hdFNpemUobGltaXRUb1VzZSkgOiBsaW1pdFRvVXNlfWApfWAsXG4gICAgICAgICAgICApXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTGltaXRzICYgZXJyb3JcbiAgICAgICAgY29uc3QgbGlzdExpbWl0czogc3RyaW5nW10gPSBbXVxuICAgICAgICBhZGRUb0xpbWl0KCdzb3VyY2UnLCAnbmJGaWxlcycsIG9yaU5iRmlsZXMsIGNvbmZpZy5saW1pdD8uc291cmNlPy5uYl9maWxlX21heClcbiAgICAgICAgYWRkVG9MaW1pdCgnc291cmNlJywgJ3NpemUnLCBvcmlTaXplLCBjb25maWcubGltaXQ/LnNvdXJjZT8uc2l6ZV9tYXgpXG4gICAgICAgIGFkZFRvTGltaXQoJ3NvdXJjZScsICdtaW5pZmllZCcsIG9yaU1pbmlmaWVkLCBjb25maWcubGltaXQ/LnNvdXJjZT8ubWluaWZpZWRfbWF4KVxuICAgICAgICBhZGRUb0xpbWl0KFxuICAgICAgICAgICdzb3VyY2UnLFxuICAgICAgICAgICdjb21wcmVzc2VkJyxcbiAgICAgICAgICBvcmlDb21wcmVzc2VkLFxuXG4gICAgICAgICAgY29uZmlnLmxpbWl0Py5zb3VyY2U/LmNvbXByZXNzZWRfbWF4LFxuICAgICAgICApXG4gICAgICAgIGFkZFRvTGltaXQoXG4gICAgICAgICAgJ3RyZWVzaGFrZWQnLFxuICAgICAgICAgICduYkZpbGVzJyxcbiAgICAgICAgICBvcHROYkZpbGVzLFxuXG4gICAgICAgICAgY29uZmlnLmxpbWl0Py50cmVlc2hha2VkPy5uYl9maWxlX21heCxcbiAgICAgICAgKVxuICAgICAgICBhZGRUb0xpbWl0KCd0cmVlc2hha2VkJywgJ3NpemUnLCBvcHRTaXplLCBjb25maWcubGltaXQ/LnRyZWVzaGFrZWQ/LnNpemVfbWF4KVxuICAgICAgICBhZGRUb0xpbWl0KCd0cmVlc2hha2VkJywgJ21pbmlmaWVkJywgb3B0TWluaWZpZWQsIGNvbmZpZy5saW1pdD8udHJlZXNoYWtlZD8ubWluaWZpZWRfbWF4KVxuICAgICAgICBhZGRUb0xpbWl0KFxuICAgICAgICAgICd0cmVlc2hha2VkJyxcbiAgICAgICAgICAnY29tcHJlc3NlZCcsXG4gICAgICAgICAgb3B0Q29tcHJlc3NlZCxcbiAgICAgICAgICBjb25maWcubGltaXQ/LnRyZWVzaGFrZWQ/LmNvbXByZXNzZWRfbWF4LFxuICAgICAgICApXG5cbiAgICAgICAgLy8gV3JpdGUganNvbiBkYXRhXG4gICAgICAgIGlmIChvcHRNaXNzaW5nLmxlbmd0aCA9PT0gMCAmJiBsaXN0TGltaXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGxldCBjb250ZW50SnNvbiA9IFtdXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkRmlsZShqb2luKGZvbGRlckRldlN0YXRpYywgZmlsZU5hbWUpLCAndXRmLTgnKVxuICAgICAgICAgICAgY29udGVudEpzb24gPSBKU09OLnBhcnNlKGNvbnRlbnQudG9TdHJpbmcoKSlcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge31cblxuICAgICAgICAgIGNvbnRlbnRKc29uID0gY29udGVudEpzb24uZmlsdGVyKChjOiBhbnkpID0+IGMubmFtZSAhPT0gY29uZmlnLm5hbWUpXG4gICAgICAgICAgY29udGVudEpzb24ucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiBjb25maWcubmFtZSxcbiAgICAgICAgICAgIHJlc3VsdHM6IHtcbiAgICAgICAgICAgICAgc291cmNlOiB7XG4gICAgICAgICAgICAgICAgbmJGaWxlOiBvcmlOYkZpbGVzLFxuICAgICAgICAgICAgICAgIHNpemU6IG9yaVNpemUsXG4gICAgICAgICAgICAgICAgbWluaWZpZWQ6IG9yaU1pbmlmaWVkLFxuICAgICAgICAgICAgICAgIGNvbXByZXNzZWQ6IG9yaUNvbXByZXNzZWQsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHRyZWVzaGFrZWQ6IHtcbiAgICAgICAgICAgICAgICBuYkZpbGU6IG5ldyBTZXQob3B0RmlsZXMpLnNpemUsXG4gICAgICAgICAgICAgICAgc2l6ZTogb3B0U2l6ZSxcbiAgICAgICAgICAgICAgICBtaW5pZmllZDogb3B0TWluaWZpZWQsXG4gICAgICAgICAgICAgICAgY29tcHJlc3NlZDogb3B0Q29tcHJlc3NlZCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0cmVlRGF0YSxcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgYXdhaXQgbWtkaXIoZm9sZGVyRGV2U3RhdGljLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuICAgICAgICAgIGF3YWl0IHdyaXRlRmlsZShqb2luKGZvbGRlckRldlN0YXRpYywgZmlsZU5hbWUpLCBKU09OLnN0cmluZ2lmeShjb250ZW50SnNvbiwgbnVsbCwgMikpXG4gICAgICAgIH1cblxuICAgICAgICAvLyB3ZSBhcmUgZG9uZSB3aGl0aCBldmVyeXRoaW5nLi4uIE5vdy4uLiBXaGF0IGRvIHdlIGxvZz9cblxuICAgICAgICAvLyBJZiBldmVyeXRoaW5nIGlzIG9rLi4uXG4gICAgICAgIGlmIChvcHRNaXNzaW5nLmxlbmd0aCA9PT0gMCAmJiBsaXN0TGltaXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmIChjb25maWcuYWx3YXlzX2xvZ19yZXBvcnQpIHtcbiAgICAgICAgICAgIGxvZy5pbmZvKGB7IG5hbWU6ICR7bG9nR3JlZW4oY29uZmlnLm5hbWUpfSB9YClcbiAgICAgICAgICAgIGNvbnNvbGUudGFibGUocmVzdWx0cylcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCcnKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2cuaW5mbyhgeyBuYW1lOiAke2xvZ0dyZWVuKGNvbmZpZy5uYW1lKX0gfSAke2xvZ0dyZWVuKGBcdTI3MTQgc3VjY2Vzc2ApfWApXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBjb25maWcgaXNzdWVzLi4uIEJyZWFrIHRoZSBidWlsZFxuICAgICAgICBpZiAob3B0TWlzc2luZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAvLyBsb2cuaW5mbyhgSW5jbHVkZXMgJiBleGN1bGRlcyBhcmUgd2VsbCBjb25maWd1cmVkYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nLmluZm8oYHsgbmFtZTogJHtsb2dHcmVlbihjb25maWcubmFtZSl9IH1gKVxuICAgICAgICAgIGNvbnNvbGUudGFibGUocmVzdWx0cylcbiAgICAgICAgICBjb25zdCBtc2cgPVxuICAgICAgICAgICAgYCR7bG9nWWVsbG93KCcnKX1NaXNzaW5nICR7bG9nWWVsbG93KCdpbmNsdWRlcycpfWAgKyBgIGFuZC9vciAke2xvZ1llbGxvdygnZXhjdWxkZXMnKX1gXG4gICAgICAgICAgdGhpcy5lcnJvcih7XG4gICAgICAgICAgICBtZXNzYWdlOiBgJHttc2d9OiBbJHtvcHRNaXNzaW5nLm1hcChjID0+IGxvZ1JlZChgJyR7Y30nYCkpLmpvaW4oJywgJyl9XWAsXG4gICAgICAgICAgICBzdGFjazogYFtsaWI6cmVwb3J0ZXJdICR7bG9nR3JlZW4oY29uZmlnLm5hbWUpfSA9PiAke21zZ30uICR7bG9nUmVkKFxuICAgICAgICAgICAgICBgQ2hlY2sgeW91ciBjb25maWdgLFxuICAgICAgICAgICAgKX0gYCxcbiAgICAgICAgICB9KVxuICAgICAgICAgIGNvbnNvbGUubG9nKCcnKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBsaW1pdCBpc3N1ZXMuLi4gQnJlYWsgdGhlIGJ1aWxkXG4gICAgICAgIGlmIChsaXN0TGltaXRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBsb2cuaW5mbyhgeyBuYW1lOiAke2xvZ0dyZWVuKGNvbmZpZy5uYW1lKX0gfWApXG4gICAgICAgICAgY29uc29sZS50YWJsZShyZXN1bHRzKVxuICAgICAgICAgIHRoaXMuZXJyb3Ioe1xuICAgICAgICAgICAgbWVzc2FnZTogYFxcclxcbiR7bGlzdExpbWl0cy5tYXAoYyA9PiBgIC0gJHtjfWApLmpvaW4oJ1xcclxcbicpfWAsXG4gICAgICAgICAgICBzdGFjazogYFtsaWI6cmVwb3J0ZXJdICR7Y29uZmlnLm5hbWV9ID0+ICR7bG9nUmVkKGBsaW1pdCBleGNlZWRlZC5gKX1gLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgY29uc29sZS5sb2coJycpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICB9XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL2p5Y291ZXQvdWRldi9naC9saWIvdml0ZS1wbHVnaW4tbGliLXJlcG9ydGVyL3NyYy9saWIvdG9FeHBvcnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2p5Y291ZXQvdWRldi9naC9saWIvdml0ZS1wbHVnaW4tbGliLXJlcG9ydGVyL3NyYy9saWIvdG9FeHBvcnQvZm9ybWF0U3RyaW5nLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2p5Y291ZXQvdWRldi9naC9saWIvdml0ZS1wbHVnaW4tbGliLXJlcG9ydGVyL3NyYy9saWIvdG9FeHBvcnQvZm9ybWF0U3RyaW5nLnRzXCI7ZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFNpemUobnVtYmVyOiBudW1iZXIpOiBzdHJpbmcge1xuICByZXR1cm4gKG51bWJlciAvIDEwMjQpLnRvRml4ZWQoMikgKyAnIGtiJ1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3VSxTQUFTLGlCQUFpQjs7O0FDQWUsU0FBUyxLQUFLLFVBQVUsV0FBVyxjQUFjO0FBQ2xhLFNBQVMsV0FBVyxPQUFPLFVBQVUsY0FBYztBQUNuRCxTQUFTLGlCQUFpQjtBQUMx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
