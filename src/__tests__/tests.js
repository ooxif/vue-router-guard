const VueRouter = require('vue-router')
const { ERROR_NAME, guard, beforeRoute } = require('../')

const IS_SERVER = process.env.VUE_ENV === 'server'

function $object (...args) {
  const obj = Object.create(null)

  return args.length ? Object.assign(obj, ...args) : obj
}

function $each (obj, cb) {
  const ret = $object()

  Object.keys(obj).forEach((key) => {
    ret[key] = cb(obj[key], key)
  })

  return ret
}

function error (type, opts = {}) {
  return $object(opts, {
    type,
    name: ERROR_NAME
  })
}

function createRouteList (routes) {
  const list = []

  routes.forEach((route) => {
    if (route.$p) {
      list.push(route.$p)
      delete route.$p
    } else {
      list.push({ name: route.name })
    }

    route.children && list.push(...createRouteList(route.children))
  })

  return list
}

function createRouter (props) {
  const C = $object()

  const R = (config) => {
    if (!props) return config

    config.props = config.components
      ? $object($each(config.components, () => props))
      : props

    return config
  }

  const routes = [
    R({ path: '/simple', name: 'simple', component: C }),
    R({ path: '/named', name: 'named', components: { default: C } }),

    R({
      path: '/a',
      name: 'a',
      component: C,
      children: [
        R({ path: 'a', name: 'a-a', component: C }),
        R({ path: 'b', name: 'a-b', components: { default: C } }),
        R({ path: ':child', $p: '/a/1', name: 'a-id', component: C })
      ]
    }),

    R({
      path: '/b',
      name: 'b',
      components: { default: C },
      children: [
        R({ path: 'a', name: 'b-a', component: C }),
        R({ path: 'b', name: 'b-b', components: { default: C } }),
        R({ path: ':child', $p: '/b/1', name: 'b-id', component: C })
      ]
    }),

    R({
      path: '/:id(\\d+)',
      $p: '/1',
      name: 'c',
      components: { default: C },
      children: [
        R({ path: 'a', $p: '/1/a', name: 'c-a', component: C }),
        R({ path: 'b', $p: '/1/b', name: 'c-b', components: { default: C } }),
        R({ path: ':child', $p: '/1/1', name: 'c-id', component: C })
      ]
    })
  ]

  const list = createRouteList(routes)
  const router = new VueRouter({ routes })

  return { list, router, routes }
}

function stubs (opts = {}) {
  const to = opts.to || {
    matched: [],
    meta: {}
  }

  const from = opts.from || {}
  const ret = opts.ret || {}
  const next = opts.next || (() => {})

  const cb = ($to, $from, $next) => {
    expect($to).toBe(to)
    expect($from).toBe(from)
    expect($next).toEqual(expect.any(Function))
    expect($next).toEqual(expect.objectContaining({
      cancel: expect.any(Function),
      redirect: expect.any(Function),
      props: expect.any(Function),
      status: expect.any(Function)
    }))

    return ret
  }

  return { cb, from, next, ret, to, cnt: 4 }
}

const isVoid = {}

function tNext (next, client, server) {
  expect(next).toHaveBeenCalledTimes(1)

  const args = next.mock.calls[0]
  const expected = IS_SERVER ? server : client

  if (expected === isVoid) {
    expect(args).toHaveLength(0)
    expect(args[0]).toBeUndefined()
  } else {
    expect(args).toHaveLength(1)

    const arg = args[0]

    if (typeof arg === 'object') {
      expect(Object.assign({}, arg))
        .toEqual(expect.objectContaining(IS_SERVER ? server : client))
    } else {
      expect(arg).toBe(IS_SERVER ? server : client)
    }
  }
}

const ctNext = 3

test('guard(Function)', () => {
  const { cb, cnt, from, next, ret, to } = stubs()

  expect.assertions(cnt + 2)

  const fn = guard(cb)

  expect(fn).toEqual(expect.any(Function))
  expect(fn(to, from, next)).toBe(ret)
})

test('beforeRoute(Function)', () => {
  const { cb, cnt, from, next, ret, to } = stubs()

  expect.assertions((cnt * 2) + 4)

  const fns = beforeRoute(cb)

  expect(fns).toEqual(expect.objectContaining({
    beforeRouteEnter: expect.any(Function),
    beforeRouteUpdate: expect.any(Function)
  }))

  expect(fns.beforeRouteEnter).not.toBe(fns.beforeRouteUpdate)
  expect(fns.beforeRouteEnter(to, from, next)).toBe(ret)
  expect(fns.beforeRouteUpdate(to, from, next)).toBe(ret)
})

describe('next', () => {
  const t = (tester, client, server) => () => {
    const next = jest.fn()
    const { cb, cnt, from, to } = stubs({ next })

    expect.assertions(cnt + ctNext)

    guard(($to, $from, $next) => {
      cb($to, $from, $next)
      tester($next)
    })(to, from, next)

    tNext(next, client, server)
  }

  test('()', t(next => next(), isVoid, isVoid))

  test(
    '(false)',
    t(next => next(false), false, error('cancel', {
      status: 500,
      value: null
    }))
  )

  test(
    '.status(404)(false)',
    t(next => next.status(404)(false), false, error('cancel', {
      status: 404,
      value: null
    }))
  )

  test(
    '(Object)',
    t(next => next({ name: 'foo' }), { name: 'foo' }, error('redirect', {
      status: 302,
      value: { name: 'foo' }
    }))
  )

  test(
    '.status(307)(Object)',
    t(
      next => next.status(307)({ name: 'foo' }),
      { name: 'foo' },
      error('redirect', {
        status: 307,
        value: { name: 'foo' }
      })
    )
  )

  test(
    '(string)',
    t(next => next('foo'), 'foo', error('redirect', {
      status: 302,
      value: 'foo'
    }))
  )

  test(
    '.status(308)(string)',
    t(next => next.status(308)('foo'), 'foo', error('redirect', {
      status: 308,
      value: 'foo'
    }))
  )
})

describe('next.cancel', () => {
  const t = (...args) => () => {
    const next = jest.fn()
    const { cb, cnt, from, to } = stubs({ next })

    expect.assertions(cnt + ctNext)

    guard(($to, $from, $next) => {
      cb($to, $from, $next)
      $next.cancel.apply($next, args)
    })(to, from, next)

    tNext(next, false, error('cancel', {
      status: args[0] || 500,
      value: null
    }))
  }

  test('()', t())
  test('(number)', t(400))
})

describe('next.redirect', () => {
  const t = (...args) => () => {
    const next = jest.fn()
    const redirect = args[0]
    const { cb, cnt, from, to } = stubs({ next })

    expect.assertions(cnt + ctNext)

    guard(($to, $from, $next) => {
      cb($to, $from, $next)
      $next.redirect.apply($next, args)
    })(to, from, next)

    tNext(next, redirect, error('redirect', {
      status: args[1] || 302,
      value: args[0]
    }))
  }

  test('(Object)', t({ name: 'foo' }))
  test('(Object, number)', t({ name: 'foo' }, 307))
  test('(string)', t('foo'))
  test('(string, number)', t('foo', 308))
})

describe('next.status', () => {
  test('(number)', () => {
    const next = jest.fn()
    const { cb, cnt, from, to } = stubs({ next })

    expect.assertions(cnt + ctNext + 1 + (IS_SERVER ? 1 : 0))

    guard(($to, $from, $next) => {
      cb($to, $from, $next)

      const $$next = $next.status(404)

      expect($$next).toBe($next)
      $next()
    })(to, from, next)

    tNext(next, isVoid, isVoid)

    IS_SERVER && expect(to.meta.status).toBe(404)
  })

  test('call twice', () => {
    const to = {
      matched: [{
        components: { default: {} },
        props: {}
      }],

      meta: {}
    }

    const { from, next } = stubs({ to })

    guard(($to, $from, $next) => {
      $next.status(201).status(202)()
    })(to, from, next)

    if (IS_SERVER) {
      expect(to.meta.status).toBe(202)
    } else {
      expect(to.meta).not.toHaveProperty('status')
    }
  })
})

describe('next.props', () => {
  const list = createRouter().list.concat(['/not-found'])

  const testPropsList = [
    undefined,
    null,
    true,
    { foo: true },
    to => $object({ bar: 1 }, to.params)
  ]

  testPropsList.forEach((props) => {
    const type = props === null ? 'null' : typeof props

    describe(`route.props = ${type}`, () => {
      list.forEach((route) => {
        const { router } = createRouter(props)
        const to = router.resolve(route).route
        const desc = typeof route === 'object'
          ? `{ name: ${route.name} }`
          : route

        test(`${desc} => ${to.fullPath}`, () => {
          const addProps = { a: 1 }
          const params = to.params
          const origPropsMapList = to.matched.map(r => $object(r.props))
          const expectedFnsMapList = []

          const expectedComposedPropsMapList = to.matched
            .map((record, i) => {
              const origPropsMap = origPropsMapList[i]

              return $each(record.components, (value, name) => (
                name in origPropsMap ? origPropsMap[name] : $object()
              ))
            })
            .map((origPropsMap) => {
              const expectedFnsMap = $object()

              const expectedComposedPropsMap = $each(
                origPropsMap,

                (origProps, name) => {
                  expectedFnsMap[name] = expect.any(Function)

                  const origPropsType = typeof origProps
                  let resolvedProps

                  if (origProps === true) {
                    resolvedProps = params
                  } else if (origPropsType === 'function') {
                    resolvedProps = origProps(to)
                  } else if (origProps && origPropsType === 'object') {
                    resolvedProps = origProps
                  }

                  return resolvedProps
                    ? $object(resolvedProps, addProps)
                    : $object(addProps)
                }
              )

              expectedFnsMapList.push(expectedFnsMap)

              return expectedComposedPropsMap
            })

          const numPropsMapsListTests = (origPropsMapList.length + 1) * 3
          const next = jest.fn()
          const { cb, cnt, from } = stubs({ next, to })

          expect.assertions(cnt + 1 + ctNext + numPropsMapsListTests)

          guard(($to, $from, $next) => {
            cb($to, $from, $next)

            const $$next = $next.props({ a: 1 })

            expect($$next).toBe($next)
            $next()
          })(to, from, next)

          tNext(next, isVoid, isVoid)

          const wrappedPropsMapList = to.matched.map(r => r.props)

          expect(wrappedPropsMapList).toHaveLength(origPropsMapList.length)

          origPropsMapList.forEach((origPropsMap, i) => {
            expect(wrappedPropsMapList[i]).toEqual(expectedFnsMapList[i])
          })

          const composedPropsMapList = to.matched
            .map(r => $each(r.props, p => p(to)))

          expect(composedPropsMapList).toHaveLength(origPropsMapList.length)

          origPropsMapList.forEach((origPropsMap, i) => {
            expect(composedPropsMapList[i])
              .toEqual(expectedComposedPropsMapList[i])
          })

          const lastPropsMapList = to.matched.map(r => $object(r.props))

          expect(lastPropsMapList).toHaveLength(origPropsMapList.length)

          origPropsMapList.forEach((origPropsMap, i) => {
            expect(lastPropsMapList[i]).toEqual(origPropsMapList[i])
          })
        })
      })
    })
  })

  test('call twice', () => {
    const to = { matched: [{
      components: { default: {} },
      props: { default: { a: 1 } }
    }] }

    const { from, next } = stubs()

    guard(($to, $from, $next) => {
      $next.props({ a: 2, b: 2 }).props({ a: 3 })()
    })(to, from, next)

    expect(to.matched[0].props.default()).toEqual({ a: 3 })
  })

  test('wrap twice', () => {
    const to = { matched: [{
      components: { default: {} },
      props: { default: { a: 1 } }
    }] }

    const { from, next } = stubs()

    guard(($to, $from, $next) => {
      $next.props({ a: 2, b: 2 })()
    })(to, from, next)

    expect(to.matched[0].props.default).toEqual(expect.any(Function))

    guard(($to, $from, $next) => {
      $next.props({ a: 3 })()
    })(to, from, next)

    expect(to.matched[0].props.default()).toEqual({ a: 3 })
    expect(to.matched[0].props.default).toEqual({ a: 1 })
  })
})
