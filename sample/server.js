const fs = require('fs')
const path = require('path')
const express = require('express')
const resolve = file => path.resolve(__dirname, file)
const { createBundleRenderer } = require('vue-server-renderer')
const { ERROR_NAME } = require('../src')

const isProd = process.env.NODE_ENV === 'production'

const app = express()

const template = fs.readFileSync(resolve('./index.template.html'), 'utf-8')

function createRenderer (bundle, options) {
  return createBundleRenderer(bundle, Object.assign(options, {
    template,
    // recommended for performance
    runInNewContext: false
  }))
}

let renderer
let readyPromise

if (isProd) {
  // In production: create server renderer using built server bundle.
  // The server bundle is generated by vue-ssr-webpack-plugin.
  const bundle = require('./dist/vue-ssr-server-bundle.json')
  // The client manifests are optional, but it allows the renderer
  // to automatically infer preload/prefetch links and directly add <script>
  // tags for any async chunks used during render, avoiding waterfall requests.
  const clientManifest = require('./dist/vue-ssr-client-manifest.json')
  renderer = createRenderer(bundle, {
    clientManifest
  })
} else {
  // In development: setup the dev server with watch and hot-reload,
  // and create a new renderer on bundle / index template update.
  readyPromise = require('./build/setup-dev-server')(app, (bundle, options) => {
    renderer = createRenderer(bundle, options)
  })
}

const serve = (path, cache) => express.static(resolve(path), {
  maxAge: cache && isProd ? 60 * 60 * 24 * 30 : 0
})

app.use('/dist', serve('./dist', true))
app.use('/public', serve('./public', true))
app.use('/manifest.json', serve('./manifest.json', true))

function render (req, res) {
  res.setHeader('Content-Type', 'text/html')

  const handleError = (err) => {
    const { name, status } = err || { status: 500 }

    if (name === ERROR_NAME) {
      if (err.type === 'redirect') {
        res.redirect(status || 302, err.value)

        return
      }
    }

    res.status(status).end(`Error - ${status}`)

    if (typeof status !== 'number' || status < 100 || status >= 500) {
      console.error(`error during render : ${req.url}`)
      console.error(err.stack)
    }
  }

  const context = {
    url: req.url
  }

  renderer.renderToString(context, (err, html) => {
    if (err) {
      return handleError(err)
    }

    res.status(context.status || 200).end(html)
  })
}

app.get('*', isProd ? render : (req, res) => {
  readyPromise.then(() => render(req, res))
})

const port = process.env.PORT || 8080

app.listen(port, () => {
  console.log(`server started at localhost:${port}`)
})
