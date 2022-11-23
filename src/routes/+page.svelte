<script lang="ts">
  import { Html, LayerCake } from "layercake";
  import { onMount } from "svelte";
  import { writable } from "svelte/store";

  import CirclePack from "$lib/CirclePack-html.svelte";
  import { formatSize } from "$lib/toExport/formatString";

  let reports = ["houdini", "urql"];
  let innerWidth: number;

  // const padding_min = 10;
  $: size = innerWidth
    ? innerWidth < 900
      ? innerWidth - 50
      : innerWidth / $arr.length - 50
    : 600;
  $: max = 0;

  $: arr = writable<any[]>([]);

  async function dataFetch(name: string) {
    try {
      const res = await fetch(`/reports/data-${name}.json`);
      return await res.json();
    } catch (error) {}
    return null;
  }

  const lookingAt = (d: any) => {
    return d.results.treeshaked.compressed;
  };

  onMount(async () => {
    $arr = await Promise.all(reports.map(async (c) => await dataFetch(c)));

    $arr.forEach((d) => {
      if (lookingAt(d) > max) {
        max = lookingAt(d);
      }
    });
  });

  const getScale = (d: any, size: number) => {
    const maxScale = size;
    const percent = (lookingAt(d) * 100) / max;
    const pixel = (percent * maxScale) / 100;
    const padding = (maxScale - pixel) / 2;
    return padding;
  };
</script>

<svelte:window bind:innerWidth />

<!-- <input type="number" bind:value={size} step="10" />

<hr /> -->

<div class="container">
  {#each $arr as data}
    {#if data}
      {@const p = getScale(data, size)}
      <div class="lib" style="width: {size}px;">
        <table style="width: 100%; text-align: right;">
          <tr>
            <td style="font-size: x-large; text-align: left;">
              <b><u>{data.name}</u></b>
            </td>
            <td>nbFiles</td>
            <td>size</td>
            <td>minified</td>
            <td>compressed</td>
          </tr>
          <tr>
            <td>Source</td>
            <td>{data.results.source.nbFile}</td>
            <td>{formatSize(data.results.source.size)}</td>
            <td>{formatSize(data.results.source.minified)}</td>
            <td>{formatSize(data.results.source.compressed)}</td>
          </tr>
          <tr>
            <td>Treeshaked</td>
            <td>{data.results.treeshaked.nbFile}</td>
            <td>{formatSize(data.results.treeshaked.size)}</td>
            <td>{formatSize(data.results.treeshaked.minified)}</td>
            <td>{formatSize(data.results.treeshaked.compressed)}</td>
          </tr>
        </table>
        <div
          class="wrapper"
          style="width: {size}px; height: {size}px;"
          height={size}
          width={size}
        >
          <div class="chart-container">
            <LayerCake
              padding={{ top: p, bottom: p, left: p, right: p }}
              data={data.treeData}
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
