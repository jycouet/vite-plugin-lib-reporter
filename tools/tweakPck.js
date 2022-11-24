import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs'
import { join } from 'path'

function gooo() {
  /**
   * 1/ package.json
   */
  const filePath = './package/package.json'

  // read the file
  const packageJson = readFileSync(filePath, 'utf8')

  // parse the file
  const packageJsonObj = JSON.parse(packageJson)

  // modify the file (del scripts & move deps to devDeps)
  delete packageJsonObj.scripts
  delete packageJsonObj.devDependencies

  packageJsonObj.scripts = {
    report: 'npx vite serve ./ui/index.html --port 4177 --open',
  }

  // write the file
  writeFileSync(filePath, JSON.stringify(packageJsonObj, null, 2))

  /**
   * 2/ build output
   */
  copyRecursiveSync('./build', './package/ui')

  // tell to everyone that we are done ;)
  console.log('  ✔ tweak package.json done')
}

/**
 * Look ma, it's cp -R.
 * @param {string} src  The path to the thing to copy.
 * @param {string} dest The path to the new copy.
 */
const copyRecursiveSync = function (src, dest) {
  var exists = existsSync(src)
  var stats = exists && statSync(src)
  var isDirectory = exists && stats.isDirectory()
  if (isDirectory) {
    mkdirSync(dest)
    readdirSync(src).forEach(function (childItemName) {
      copyRecursiveSync(join(src, childItemName), join(dest, childItemName))
    })
  } else {
    copyFileSync(src, dest)
  }
}

gooo()
