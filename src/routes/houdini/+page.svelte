<script lang="ts">
  import type { PageData } from "./$houdini";

  export let data: PageData;

  $: ({ AllContinents } = data);
</script>

<h2>Houdini</h2>
<pre>{JSON.stringify($AllContinents.data, null, 2)}</pre>
