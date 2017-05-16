# vue-router-guard

[![Version](https://img.shields.io/npm/v/vue-router-guard.svg)](https://www.npmjs.com/package/vue-router-guard)
[![License](https://img.shields.io/npm/l/vue-router-guard.svg)](https://www.npmjs.com/package/vue-router-guard)
[![Build Status](https://travis-ci.org/ooxif/vue-router-guard.svg)](https://travis-ci.org/ooxif/vue-router-guard)
[![CircleCI Status](https://circleci.com/gh/ooxif/vue-router-guard.svg?style=shield)](https://circleci.com/gh/ooxif/vue-router-guard)
[![Coverage Status](https://img.shields.io/coveralls/ooxif/vue-router-guard/master.svg)](https://coveralls.io/github/ooxif/vue-router-guard?branch=master)
[![Code Climate Status](https://codeclimate.com/github/ooxif/vue-router-guard.svg)](https://codeclimate.com/github/ooxif/vue-router-guard)
[![codecov](https://codecov.io/gh/ooxif/vue-router-guard/branch/master/graph/badge.svg)](https://codecov.io/gh/ooxif/vue-router-guard)
[![Dependency Status](https://david-dm.org/ooxif/vue-router-guard.svg)](https://david-dm.org/ooxif/vue-router-guard)
[![devDependency Status](https://david-dm.org/ooxif/vue-router-guard/dev-status.svg)](https://david-dm.org/ooxif/vue-router-guard/?type=dev)
[![peerDependency Status](https://david-dm.org/ooxif/vue-router-guard/peer-status.svg)](https://david-dm.org/ooxif/vue-router-guard/?type=peer)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)

Extends route guards.

# Usage

```javascript
import { guard } from 'vue-router-guard'

export default {
  props: ['data'],

  beforeRouteEnter: guard((to, from, next) => {
    fetchRemoteData().then((data) => {
      // vue-router-guard can pass props to a component's instance.
      next.props({ data })()
    })
  })
}
```

# Advanced usage

 ```javascript
import { beforeRoute } from 'vue-router-guard'

export default {
  props: ['data', 'found'],
  
  // beforeRoute(Function) returns
  // { beforeRouteEnter: guard(Function), beforeRouteUpdate: guard(Function) }
  ...beforeRoute(function guard (to, from, next) {
    const { id } = to.params
    
    fetchRemoteData(id).then((data) => {
      next.props({ data, found: true })()
    }, () => {
      // redirect with 301
      return next.redirect('/new-location', 301)
      
      // or proceed with 404
      return next.status(404).props({ found: false })()
      
      // redirect() and status() must be handled on server-side.
      // @see sample/entry-server.js
      // @see sample/server.js
    })
  })
}
```

# Install

`npm install vue-router-guard`

> no need to do `Vue.use(...)`

# `next` methods

## `next(boolean|string|Object|Function|Error)`

is almost the same as original `next`.
(see https://router.vuejs.org/en/advanced/navigation-guards.html)

On the server, there are some differences.

### `next(false)` during SSR

will throw an error like below.

    Error {
        name: {string} 'vue-router-guard'
        type: {string} 'cancel'
        status: {number} 500 // you can set this by calling next.status(number)
                             // or next.cancel(number)
        value: undefined
    }

You can handle this error on the server using `router.onError(errorHandler)`
and `router.onReady(doneHandler, errorHandler)`.

    router.onError(err => {
        if (err && err.name === 'vue-router-guard' && err.type === 'cancel') {
            // ...
        }
    })

Check an example at [sample/server.js](/sample/server.js)

### `next(string|Object)` during SSR

will throw an error like below.

    Error {
        name: {string} 'vue-router-guard'
        type: {string} 'redirect'
        status: {number} 302 // you can set this by calling next.status(number)
                             // or next.redirect(string|Object, number)
        value: {string|Object}
    }

You can handle this error on the server using `router.onError(errorHandler)`
and `router.onReady(doneHandler, errorHandler)`.

    router.onError(err => {
        if (err && err.name === 'vue-router-guard' && err.type === 'redirect') {
            // ...
        }
    })

Check an example at [sample/server.js](/sample/server.js) and
[sample/entry-server.js](/sample/entry-server.js)

## `next.status(number) => next`

sets the number to `route.meta.status`.

You can refer this value at `router.onReady(doneHandler)`.

    router.onReady(route => {
       route.meta.status // is the value
    })

> This method returns the `next` itself to chain other methods.

> Caveat: SSR only - `next.status(number)` does nothing on the client-side.

Check an example at [sample/server.js](/sample/server.js) and
[sample/entry-server.js](/sample/entry-server.js)

## `next.cancel(number = 500)`

is an alias of `next.status(number)(false)`.

## `next.redirect(string|Object, number = 302)`

is an alias of `next.status(number)(string|Object)`.

## `next.props(Object) => next`

will pass the props to an instance of the component.

> This method returns the `next` itself to chain other methods.
