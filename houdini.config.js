/** @type {import('houdini').ConfigFile} */
const config = {
  apiUrl: 'https://countries.trevorblades.com/graphql',
  schemaPollInterval: 0,
  plugins: {
    'houdini-svelte': {
      client: './src/client',
    },
  },
}

export default config
