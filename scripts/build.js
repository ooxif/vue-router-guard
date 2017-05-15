const fs = require('fs')
const path = require('path')
const del = require('del')
const rollup = require('rollup')
const babel = require('rollup-plugin-babel')
const replace = require('rollup-plugin-replace')
const pkg = require('../package.json')

let promise = Promise.resolve()

promise = promise.then(() => del(['dist/*']));

['es', 'cjs', 'umd'].forEach((format) => {
  promise = promise
    .then(() => (
      rollup.rollup({
        entry: 'src/index.js',
        external: Object.keys(pkg.dependencies || {}),
        plugins: [
          replace({ __VERSION__: pkg.version }),
          babel(Object.assign(pkg.babel, {
            babelrc: false,
            exclude: 'node_modules/**',
            runtimeHelpers: true,
            presets: pkg.babel.presets.map(x => (
              x === 'latest' ? ['latest', { es2015: { modules: false } }] : x
            ))
          }))
        ]
      })
      .then(bundle => bundle.write({
        dest: `dist/${format === 'cjs' ? 'index' : `index.${format}`}.js`,
        format,
        sourceMap: true,
        moduleName: format === 'umd' ? pkg.name : undefined
      }))
    ))
})

function write (dest, content) {
  fs.writeFileSync(dest, content, 'utf-8')
}

function copy (file) {
  write(path.join('dist', file), fs.readFileSync(file, 'utf-8'))
}

// Copy package.json and LICENSE.txt
promise = promise.then(() => {
  delete pkg.private
  delete pkg.devDependencies
  delete pkg.scripts
  delete pkg.babel
  delete pkg.jest
  write('dist/package.json', JSON.stringify(pkg, null, '  '))
  copy('LICENSE.txt')
  copy('README.md')
})

promise.catch(err => console.error(err.stack))
