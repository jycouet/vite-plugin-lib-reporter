import { readFileSync, writeFileSync } from 'fs'

function gooo() {
  const filePath = './package/package.json'

  // read the file
  const packageJson = readFileSync(filePath, 'utf8')

  // parse the file
  const packageJsonObj = JSON.parse(packageJson)

  // modify the file (del scripts & move deps to devDeps)
  delete packageJsonObj.scripts
  delete packageJsonObj.devDependencies

  // write the file
  writeFileSync(filePath, JSON.stringify(packageJsonObj, null, 2))

  // tell to everyone that we are done ;)
  console.log('  ✔ tweak package.json done')
}

gooo()
