<script lang="ts">
  import type { HierarchyCircularNode, HierarchyNode } from 'd3-hierarchy'
  import { hierarchy, pack, stratify } from 'd3-hierarchy'
  import { getContext } from 'svelte'

  const { width, height, data } = getContext('LayerCake') as any

  let parentKey = 'undefined'

  /** [labelVisibilityThreshold=r => r > 25] - By default, only show the text inside a circle if its radius exceeds a certain size. Provide your own function for different behavior. */
  export let labelVisibilityThreshold = (d: HCShape) => {
    // return false;
    const isSmallText = d.r < 25
    const isLastLevel = d.data?.children !== undefined

    return !isSmallText && !isLastLevel
  }

  const stroke = '#FFF'
  const strokeWidth = 1
  const textColor = '#FFF'
  const textStroke = '#C173DD'
  const textStrokeWidth = 0
  const spacing = 0

  const sortBy = (a: any, b: any) => b.depth - a.depth

  type Shape = {
    valueUsed: number
    id: string
    data: {
      valueUsed: number
    }
  }
  type HShape = HierarchyNode<Shape>
  type HCShape = HierarchyCircularNode<Shape>

  // let parent = {};
  $: dataset = $data

  $: stratifier = stratify()
    .path((d: any) => d.location)
    .id((d: any) => d)

  $: packer = pack().size([$width, $height]).padding(spacing)

  $: stratified = stratifier(dataset) as HShape
  // $: console.log(stratified);
  $: root = hierarchy<HShape>(stratified)
    .sum(d => {
      try {
        return d.data?.valueUsed || 1
      } catch (error) {}
      return 1
    })
    .sort(sortBy)

  $: packed = packer(root)

  $: descendants = packed.descendants() as HCShape[]

  // const titleCase = (d: any) => d.replace(/^\w/, (w: any) => w.toUpperCase());
  const titleSmall = (d: any) => {
    const s = d.split('/')
    return s[s.length - 1]
  }
  // const commas = format(",");

  function formatSize(number: number): string {
    return (number / 1024).toFixed(2) + ' kb'
  }
</script>

<div class="circle-pack" data-has-parent-key={parentKey !== undefined}>
  {#each descendants as d}
    <div class="circle-group" data-id={d.data.id} data-visible={labelVisibilityThreshold(d)}>
      <div
        class="circle"
        style="left:{d.x}px;top:{d.y}px;width:{d.r * 2}px;
          height:{d.r * 2}px;
          background-color:rgba(193, 115, 221,{d.depth * 0.1});
          border: {strokeWidth}px solid {stroke};"
      />
      <div
        class="text-group"
        style="
						color:{textColor};
						text-shadow:
							-{textStrokeWidth}px -{textStrokeWidth}px 0 {textStroke},
							{textStrokeWidth}px -{textStrokeWidth}px 0 {textStroke},
							-{textStrokeWidth}px {textStrokeWidth}px 0 {textStroke},
							{textStrokeWidth}px {textStrokeWidth}px 0 {textStroke};
						left:{d.x}px;
						top:{d.y - (labelVisibilityThreshold(d) ? 0 : d.r + 4)}px;
					"
      >
        <div class="text">{titleSmall(d.data.id)}</div>
        {#if d?.data?.data?.valueUsed}
          <div class="text value">{formatSize(d?.data?.data?.valueUsed)}</div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .circle-pack {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .circle,
  .text-group {
    position: absolute;
  }
  .circle {
    transform: translate(-50%, -50%);
  }
  /* Hide the root node if we want, useful if we are creating our own root */
  .circle-pack[data-has-parent-key='false'] .circle-group[data-id='all'] {
    display: none;
  }
  /* .circle-group:hover {
    z-index: 9999;
  } */
  .circle-group[data-visible='false'] .text-group {
    display: none;
    padding: 4px 7px;
    background: #fff;
    border: 1px solid #ccc;
    transform: translate(-50%, -100%);
    top: -4px;
  }
  .circle-group[data-visible='false']:hover .text-group {
    z-index: 999;
    display: block !important;
    /* On hover, set the text color to black and eliminate the shadow */
    text-shadow: none !important;
    color: #000 !important;
  }
  .circle-group[data-visible='false']:hover .circle {
    border-color: #000 !important;
  }
  .text-group {
    width: auto;
    top: 50%;
    left: 50%;
    text-align: center;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    pointer-events: none;
    cursor: pointer;
    line-height: 13px;
  }
  .text {
    width: 100%;
    font-size: 11px;
    /* text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; */
  }
  .text.value {
    font-size: 11px;
  }
  .circle {
    border-radius: 50%;
    top: 0;
    left: 0;
  }
</style>
