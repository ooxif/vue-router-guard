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

# usage

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

# advanced usage

 ```javascript
import { beforeRoute } from 'vue-router-guard'

export default {
  props: ['data', 'found'],
  
  // beforeRoute(Function) returns
  // { beforeRouteEnter: guard(Function), beforeRouteUpdate: guard(Function) }
  ...beforeRoute(function guard (to, from, next) {
    const { id } = to.params
    
    fetchRemoteData(id).then((data) => {
      next.props({ data })()
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
