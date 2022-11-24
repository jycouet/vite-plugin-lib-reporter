<script lang="ts">
  import CirclePack from '$lib/CirclePack-html.svelte'
  import { formatSize } from '$lib/toExport/formatString'
  import { Html, LayerCake } from 'layercake'
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'

  let innerWidth: number
  let innerHeight: number

  $: sizeOptiWidth = innerWidth
    ? innerWidth < 900
      ? innerWidth - 50
      : innerWidth / $arr.length - 50
    : 600
  $: size = sizeOptiWidth > innerHeight - 250 ? innerHeight - 250 : sizeOptiWidth
  $: max = 0

  $: arr = writable<any[]>([])

  const lookingAt = (d: any) => {
    return d.results.treeshaked.compressed
  }

  onMount(async () => {
    const res = await fetch(`/data-lib-reporter.json`)
    $arr = await res.json()

    $arr.forEach(d => {
      if (lookingAt(d) > max) {
        max = lookingAt(d)
      }
    })
  })

  const getScale = (d: any, size: number) => {
    const maxScale = size
    const percent = (lookingAt(d) * 100) / max
    const pixel = (percent * maxScale) / 100
    const padding = (maxScale - pixel) / 2
    return padding
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<!-- <input type="number" bind:value={size} step="10" />

<hr /> -->

<div class="container">
  {#each $arr as dataReport}
    {#if dataReport}
      {@const p = getScale(dataReport, size)}
      <div class="lib" style="width: {size}px;">
        <table style="width: 100%; text-align: right;">
          <tr>
            <td style="font-size: x-large; text-align: left;">
              <b><u>{dataReport.name}</u></b>
            </td>
            <td>nbFiles</td>
            <td>size</td>
            <td>minified</td>
            <td>compressed</td>
          </tr>
          <tr>
            <td>Source</td>
            <td>{dataReport.results.source.nbFile}</td>
            <td>{formatSize(dataReport.results.source.size)}</td>
            <td>{formatSize(dataReport.results.source.minified)}</td>
            <td>{formatSize(dataReport.results.source.compressed)}</td>
          </tr>
          <tr>
            <td>Treeshaked</td>
            <td>{dataReport.results.treeshaked.nbFile}</td>
            <td>{formatSize(dataReport.results.treeshaked.size)}</td>
            <td>{formatSize(dataReport.results.treeshaked.minified)}</td>
            <td>{formatSize(dataReport.results.treeshaked.compressed)}</td>
          </tr>
        </table>
        <div class="wrapper" style="width: {size}px; height: {size}px;" height={size} width={size}>
          <div class="chart-container">
            <LayerCake
              padding={{ top: p, bottom: p, left: p, right: p }}
              data={dataReport.treeData}
            >
              <Html>
                <CirclePack />
              </Html>
            </LayerCake>
          </div>
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  @media (min-width: 900px) {
    .container {
      flex-direction: row;
    }
  }

  .lib {
    margin-top: 20px;
    color: white;
    justify-content: space-between;
    margin-left: auto;
    margin-right: auto;
  }

  .wrapper {
    margin-top: 20px;

    border: 3px solid #c173dd;
    background-color: #161b22;
  }

  .chart-container {
    width: 100%;
    height: 100%;
  }
</style>
