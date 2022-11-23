import { Log, logGreen, logYellow, logRed } from '@kitql/helper'
import { writeFile } from 'fs/promises'
import { promisify } from 'node:util'
import { gzip } from 'node:zlib'
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
   * @experimental to export raw data and display a nice graph
   */
  export_to?: string
}

export function libReporter(config: Config): Plugin {
  // configs
  const includes = config?.includes || []
  const excludes = config?.excludes || []

  function localPrjPath(path: string): string {
    return path.replace(process.cwd() + '/', '')
  }

  // utilities
  function isInteresing(id: string) {
    for (let i = 0; i < includes.length; i++) {
      if (localPrjPath(id).includes(includes[i])) {
        return true
      }
    }
    return false
  }
  function isNotInteresing(id: string) {
    for (let i = 0; i < excludes.length; i++) {
      if (localPrjPath(id).includes(excludes[i])) {
        return true
      }
    }
    return false
  }
  const compress = promisify(gzip)

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
  let info: Record<string, Info> = {}

  // Plugin
  return {
    name: 'vite:lib:reporter',
    apply: 'build',

    async moduleParsed(module) {
      if (isInteresing(module.id)) {
        const minified = (await minify(module.code ?? '')).code || ''
        const compressed = await compress(minified)

        info[module.id] = {
          missing: info[module.id]?.missing || [],
          size: module.code?.length || 0,
          minified: minified.length,
          compressed: compressed.length,
          output: [],
        }

        const missing: string[] = []

        // Add to the log if some stuff are missing... to count "real" stuff needed by the lib
        ;[...module.importedIds, ...module.dynamicallyImportedIds].forEach(id => {
          if (!isInteresing(id) && !isNotInteresing(id)) {
            missing.push(id)
          }
        })

        info[module.id].missing = [...new Set([...info[module.id].missing, ...missing])]
      }
    },

    async writeBundle({ dir: outDir }, output) {
      // Only intested in the client output files
      if (outDir?.endsWith('client')) {
        // Let's check in the output files what referenced the orinal files
        for (const key in output) {
          const { modules } = output[key] as any
          for (const id in modules) {
            if (isInteresing(id)) {
              const module = modules[id]

              // delete module.code;
              // delete module.ast;
              // console.log(`modules`, module);

              const minified = (await minify(module.code ?? '')).code || ''
              const compressed = await compress(minified)

              info[id].output.push({
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

        for (const key in info) {
          const { size, minified, compressed, output, missing } = info[key]
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

        function format(nbFiles: number, size: number, minified: number, compressed: number) {
          return {
            nbFiles: nbFiles,
            size: formatSize(size).padStart(10),
            minified: formatSize(minified).padStart(10),
            compressed: formatSize(compressed).padStart(10),
          }
        }

        log.info(`Lib: ${logGreen(config.name)}`)
        const optNbFiles = new Set(optFiles).size
        const results = {
          source: format(oriNbFiles, oriSize, oriMinified, oriCompressed),
          treeshaked: format(optNbFiles, optSize, optMinified, optCompressed),
        }
        console.table(results)

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
              `Expected "${type}" "${subType}" to be less or equal than ` +
                `${isKbValue ? formatSize(limitToUse) : limitToUse} ` +
                `${isKbValue ? '' : 'files '}` +
                `but got ${isKbValue ? formatSize(value) : value} ` +
                `${isKbValue ? '' : 'files'}`,
            )
          }
        }

        if (optMissing.length === 0) {
          // log.info(`Includes & exculdes are well configured`);
        } else {
          log.error(
            `Missing in ${logYellow('includes')} and/or ${logYellow('exculdes')}: [${optMissing
              .map(c => logRed(`'${c}'`))
              .join(', ')}]`,
          )
        }

        // Write json data
        if (config.export_to) {
          await writeFile(
            `${config.export_to}data-${config.name.toLocaleLowerCase()}.json`,
            JSON.stringify(
              {
                name: config.name,
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
              },
              null,
              2,
            ),
          )
        }

        // Limits & error
        const listLimits: string[] = []
        addToLimit('source', 'nbFiles', oriNbFiles, config.limit?.source?.nb_file_max)
        addToLimit('source', 'size', oriSize, config.limit?.source?.size_max)
        addToLimit('source', 'minified', oriMinified, config.limit?.source?.minified_max)
        addToLimit(
          'source',
          'compressed',
          oriCompressed,

          config.limit?.source?.compressed_max,
        )
        addToLimit(
          'treeshaked',
          'nbFiles',
          optNbFiles,

          config.limit?.treeshaked?.nb_file_max,
        )
        addToLimit('treeshaked', 'size', optSize, config.limit?.treeshaked?.size_max)
        addToLimit('treeshaked', 'minified', optMinified, config.limit?.treeshaked?.minified_max)
        addToLimit(
          'treeshaked',
          'compressed',
          optCompressed,
          config.limit?.treeshaked?.compressed_max,
        )

        if (listLimits.length > 0) {
          this.error({
            message: `\r\n${listLimits.map(c => ` - ${c}`).join('\r\n')}`,
            stack: `[vite:lib:reporter] limit exceeded.`,
          })
        }
      }
    },
  }
}
