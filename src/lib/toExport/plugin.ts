import { Log, logGreen, logYellow, logRed } from '@kitql/helper'
import { writeFile, mkdir, readFile, unlink } from 'fs/promises'
import { promisify } from 'node:util'
import { gzip } from 'node:zlib'
import { join } from 'path'
import { minify } from 'terser'
import type { Plugin } from 'vite'

import { formatSize } from './formatString.js'

const log = new Log('lib-reporter')

export type Config = {
  /**
   * The name of the library
   */
  name: string

  /**
   * includes to add in the report
   */
  includes: string[]

  /**
   * excludes to remove of the report
   */
  excludes?: string[]

  /**
   * Break your build if you exceed a limit (size, minified and compressed in Kb)
   */
  limit?: {
    source?: {
      nb_file_max?: number
      size_max?: number
      minified_max?: number
      compressed_max?: number
    }
    treeshaked?: {
      nb_file_max?: number
      size_max?: number
      minified_max?: number
      compressed_max?: number
    }
  }

  /**
   * always log report in the console. By default, it's here only if there is an issue.
   */
  always_log_report?: boolean
}

// state
type Info = {
  missing: string[]
  size: number
  minified: number
  compressed: number
  output: {
    key: string
    size: number
    minified: number
    compressed: number
    removedExports: string[]
  }[]
}

type ConfigAndInfo = Config & {
  info: Record<string, Info>
  rawData: Record<any, any>
}

/**
 * fill only the config parameter! (local dev is only for me 😎)
 */
export function libReporter(configs: Config[], localDev?: boolean): Plugin {
  // configs
  const configInfos = configs as ConfigAndInfo[]
  for (let i = 0; i < configInfos.length; i++) {
    configInfos[i].excludes = configs[i].excludes ?? []
    configInfos[i].info = {}
  }

  function localPrjPath(path: string): string {
    return path.replace(process.cwd() + '/', '')
  }

  // utilities
  function isInteresing(includes: string[], id: string) {
    for (let i = 0; i < includes.length; i++) {
      if (localPrjPath(id).includes(includes[i])) {
        return true
      }
    }
    return false
  }

  function isNotInteresing(excludes: string[] | undefined, id: string) {
    if (!excludes) {
      return false
    }

    for (let i = 0; i < excludes.length; i++) {
      if (localPrjPath(id).includes(excludes[i])) {
        return true
      }
    }
    return false
  }
  const compress = promisify(gzip)

  const folderDevStatic = './static'
  const folderDeployedLib_ui = './node_modules/vite-plugin-lib-reporter/ui'
  const folderToUse = localDev ? folderDevStatic : folderDeployedLib_ui

  const fileName = `data-lib-reporter.json`

  // Plugin
  return {
    name: 'lib:reporter',
    apply: 'build',

    async moduleParsed(module) {
      for (let i = 0; i < configInfos.length; i++) {
        if (isInteresing(configInfos[i].includes, module.id)) {
          const minified = (await minify(module.code ?? '')).code || ''
          const compressed = await compress(minified)

          configInfos[i].info[module.id] = {
            missing: configInfos[i].info[module.id]?.missing || [],
            size: module.code?.length || 0,
            minified: minified.length,
            compressed: compressed.length,
            output: [],
          }

          const missing: string[] = []

          // Add to the log if some stuff are missing... to count "real" stuff needed by the lib
          ;[...module.importedIds, ...module.dynamicallyImportedIds].forEach(id => {
            if (
              !isInteresing(configInfos[i].includes, id) &&
              !isNotInteresing(configInfos[i].excludes, id)
            ) {
              missing.push(id)
            }
          })

          configInfos[i].info[module.id].missing = [
            ...new Set([...configInfos[i].info[module.id].missing, ...missing]),
          ]
        }
      }
    },

    async writeBundle({ dir: outDir }, output) {
      for (let i = 0; i < configInfos.length; i++) {
        // Only intested in the client output files
        if (outDir?.endsWith('client')) {
          // Let's check in the output files what referenced the orinal files
          for (const key in output) {
            const { modules } = output[key] as any
            for (const id in modules) {
              if (isInteresing(configInfos[i].includes, id)) {
                const module = modules[id]

                // delete module.code;
                // delete module.ast;
                // console.log(`modules`, module);

                const minified = (await minify(module.code ?? '')).code || ''
                const compressed = await compress(minified)

                configInfos[i].info[id].output.push({
                  key,
                  size: module.renderedLength,
                  minified: minified.length,
                  compressed: compressed.length,
                  removedExports: module.removedExports,
                })
              }
            }
          }

          // preparing the display...
          let oriNbFiles = 0
          let oriSize = 0
          let oriMinified = 0
          let oriCompressed = 0

          const optFiles: string[] = []
          let optSize = 0
          let optMinified = 0
          let optCompressed = 0
          let optMissing: string[] = []

          const removedExports: { id: string; name: string }[] = []
          const treeData: {
            location: string
            valueUsed: number
            valueRemoved: number
          }[] = []
          // console.log(`info`, info);

          for (const key in configInfos[i].info) {
            const { size, minified, compressed, output, missing } = configInfos[i].info[key]
            oriNbFiles++
            oriSize += size
            oriMinified += minified
            oriCompressed += compressed

            optFiles.push(...output.map(c => c.key))
            optMissing.push(...missing.map(c => localPrjPath(c)))
            optSize += output.reduce((acc, cur) => acc + cur.size, 0)
            optMinified += output.reduce((acc, cur) => acc + cur.minified, 0)
            optCompressed += output.reduce((acc, cur) => acc + cur.compressed, 0)

            output.forEach(o => {
              o.removedExports.forEach(r => removedExports.push({ id: key, name: r }))

              if (compressed - o.compressed > 0) {
                treeData.push({
                  location: localPrjPath(key),
                  valueUsed: o.compressed,
                  valueRemoved: compressed - o.compressed,
                })
              } else {
                treeData.push({
                  location: localPrjPath(key),
                  valueUsed: o.compressed,
                  valueRemoved: 0,
                })
              }
            })
          }
          optMissing = [...new Set(optMissing)]
          const optNbFiles = new Set(optFiles).size

          function format(nbFiles: number, size: number, minified: number, compressed: number) {
            return {
              nbFiles: nbFiles,
              size: formatSize(size).padStart(10),
              minified: formatSize(minified).padStart(10),
              compressed: formatSize(compressed).padStart(10),
            }
          }
          const results = {
            source: format(oriNbFiles, oriSize, oriMinified, oriCompressed),
            treeshaked: format(optNbFiles, optSize, optMinified, optCompressed),
          }

          function addToLimit(
            type: 'source' | 'treeshaked',
            subType: 'nbFiles' | 'size' | 'minified' | 'compressed',
            value: number,
            confLimit?: number,
          ) {
            if (confLimit === undefined) {
              return
            }
            const isKbValue = subType !== 'nbFiles'
            const limitToUse = isKbValue ? confLimit * 1024 : confLimit
            // const valueToUse = isKbValue ? value / 1024 : value;
            // console.log(`limitToUse`, limitToUse);

            if (limitToUse < value) {
              listLimits.push(
                `${logRed('')}${type} ${subType} ` +
                  `${logRed(`${isKbValue ? formatSize(value) : value}`)} ` +
                  `exceeded the limit of ` +
                  `${logYellow(`${isKbValue ? formatSize(limitToUse) : limitToUse}`)}`,
              )
            }
          }

          // Limits & error
          const listLimits: string[] = []
          addToLimit('source', 'nbFiles', oriNbFiles, configInfos[i].limit?.source?.nb_file_max)
          addToLimit('source', 'size', oriSize, configInfos[i].limit?.source?.size_max)
          addToLimit('source', 'minified', oriMinified, configInfos[i].limit?.source?.minified_max)
          addToLimit(
            'source',
            'compressed',
            oriCompressed,
            configInfos[i].limit?.source?.compressed_max,
          )
          addToLimit(
            'treeshaked',
            'nbFiles',
            optNbFiles,
            configInfos[i].limit?.treeshaked?.nb_file_max,
          )
          addToLimit('treeshaked', 'size', optSize, configInfos[i].limit?.treeshaked?.size_max)
          addToLimit(
            'treeshaked',
            'minified',
            optMinified,
            configInfos[i].limit?.treeshaked?.minified_max,
          )
          addToLimit(
            'treeshaked',
            'compressed',
            optCompressed,
            configInfos[i].limit?.treeshaked?.compressed_max,
          )

          // Write json data
          if (optMissing.length === 0 && listLimits.length === 0) {
            configInfos[i].rawData = {
              name: configInfos[i].name,
              results: {
                source: {
                  nbFile: oriNbFiles,
                  size: oriSize,
                  minified: oriMinified,
                  compressed: oriCompressed,
                },
                treeshaked: {
                  nbFile: new Set(optFiles).size,
                  size: optSize,
                  minified: optMinified,
                  compressed: optCompressed,
                },
              },
              treeData,
            }
          }

          // we are done whith everything... Now... What do we log?

          // If everything is ok...
          if (optMissing.length === 0 && listLimits.length === 0) {
            if (configInfos[i].always_log_report) {
              log.info(`{ name: ${logGreen(configInfos[i].name)} }`)
              console.table(results)
              console.log('')
            } else {
              log.info(
                `${logGreen(`✔ ${formatSize(optCompressed).padStart(10)}`)} { name: ${logGreen(
                  configInfos[i].name,
                )} }`,
              )
            }
          }

          // If we have config issues... Break the build
          if (optMissing.length === 0) {
            // log.info(`Includes & exculdes are well configured`);
          } else {
            log.info(`{ name: ${logGreen(configInfos[i].name)} }`)
            console.table(results)
            const msg =
              `${logYellow('')}Missing ${logYellow('includes')}` +
              ` and/or ${logYellow('exculdes')}`
            this.error({
              message: `${msg}: [${optMissing.map(c => logRed(`'${c}'`)).join(', ')}]`,
              stack: `[lib:reporter] ${logGreen(configInfos[i].name)} => ${msg}. ${logRed(
                `Check your config`,
              )} `,
            })
            console.log('')
          }

          // If we have limit issues... Break the build
          if (listLimits.length > 0) {
            log.info(`{ name: ${logGreen(configInfos[i].name)} }`)
            console.table(results)
            this.error({
              message: `\r\n${listLimits.map(c => ` - ${c}`).join('\r\n')}`,
              stack: `[lib:reporter] ${configInfos[i].name} => ${logRed(`limit exceeded.`)}`,
            })
            console.log('')
          }
        }
      }
    },

    async closeBundle() {
      // write the file
      await mkdir(folderToUse, { recursive: true })
      const contentJson = configInfos.filter(c => c.rawData).map(c => c.rawData)
      await writeFile(join(folderToUse, fileName), JSON.stringify(contentJson, null, 2))
    },
  }
}
