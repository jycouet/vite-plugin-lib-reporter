<script lang="ts">
  import {
    createClient,
    setContextClient,
    getContextClient,
    gql,
    queryStore,
    dedupExchange,
    fetchExchange,
  } from "@urql/svelte";
  import { cacheExchange } from "@urql/exchange-graphcache";
  // import { authExchange, AuthConfig } from "@urql/exchange-auth";
  import { multipartFetchExchange } from "@urql/exchange-multipart-fetch";
  import { refocusExchange } from "@urql/exchange-refocus";
  import { requestPolicyExchange } from "@urql/exchange-request-policy";
  import { retryExchange } from "@urql/exchange-retry";
  // const tt = new AuthConfig();
  const client = createClient({
    url: "https://countries.trevorblades.com/graphql",
    exchanges: [
      dedupExchange,
      cacheExchange({}),
      fetchExchange,
      // authExchange(tt),
      multipartFetchExchange,
      refocusExchange(),
      requestPolicyExchange({}),
      retryExchange({}),
    ],
  });
  setContextClient(client);

  const AllContinents = queryStore({
    client: getContextClient(),
    query: gql`
      query AllContinents {
        continents {
          name
          code
        }
      }
    `,
  });
</script>

<h2>Urql</h2>
<pre>{JSON.stringify($AllContinents.data, null, 2)}</pre>
<!-- {#if $AllContinents.fetching}
  <p>Loading...</p>
{:else if $AllContinents.error}
  <p>Oh no... {$AllContinents.error.message}</p>
{:else}
  <pre>{JSON.stringify($AllContinents.data, null, 2)}</pre>
{/if} -->
