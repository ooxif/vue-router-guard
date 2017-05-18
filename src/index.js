const IS_SERVER = process.env.VUE_ENV === 'server'

const ERROR_NAME = 'vue-router-guard'
const VERSION = '__VERSION__'

function $object (...args) {
  const obj = Object.create(null)

  return args.length ? Object.assign(obj, ...args) : obj
}

function tell (type, value, status) {
  const err = new Error(`[${ERROR_NAME}] ${type}: ${value}`)

  err.status = status
  err.name = ERROR_NAME
  err.type = type
  err.value = value

  return err
}

function wrapProps (props, key, overrideWith) {
  let keyExists = key in props
  let origValue = props[key]
  let origType = keyExists ? typeof origValue : null

  if (origValue === 'function' && origValue.$restore) {
    origValue.$restore()

    return wrapProps(props, key, overrideWith)
  }

  function $restore () {
    if (keyExists) {
      props[key] = origValue
    } else {
      delete props[key]
    }
  }

  props[key] = function $props (route) {
    $restore()

    let origProps

    if (origValue) {
      if (origValue === true) origProps = route.params
      else if (origType === 'object') origProps = origValue
      else if (origType === 'function') origProps = origValue(route)
    }

    return typeof origProps === 'object' && origProps
      ? $object(origProps, overrideWith)
      : $object(overrideWith)
  }

  props[key].$restore = $restore

  return null
}

function wrapMatchedProps (matched, values) {
  matched.forEach((record) => {
    const { props } = record

    Object.keys(record.components).forEach((key) => {
      wrapProps(props, key, values)
    })
  })
}

function wrapNext (next, route) {
  let lastProps
  let lastStatus

  function $next (value) {
    const { length } = arguments

    lastProps && wrapMatchedProps(route.matched, lastProps)

    if (!IS_SERVER) return length ? next(value) : next()

    if (value === false) return next(tell('cancel', null, lastStatus || 500))

    const type = typeof value

    if ((type === 'object' && value !== null) || type === 'string') {
      return next(tell('redirect', value, lastStatus || 302))
    }

    if (lastStatus) route.meta.status = lastStatus

    length ? next(value) : next()
  }

  $next.cancel = function cancel (status) {
    lastProps = undefined
    lastStatus = status

    return $next(false)
  }

  $next.redirect = function redirect (to, status = 302) {
    lastProps = undefined
    lastStatus = status

    return $next(to)
  }

  $next.props = function props (overrideProps) {
    lastProps = overrideProps

    return $next
  }

  $next.status = function status (overrideStatus) {
    lastStatus = overrideStatus

    return $next
  }

  return $next
}

function guard (cb) {
  return function $guard (to, from, next) {
    return cb.call(this, to, from, wrapNext(next, to))
  }
}

function beforeRoute (cb) {
  return {
    beforeRouteEnter: guard(cb),
    beforeRouteUpdate: guard(cb)
  }
}

module.exports = {
  ERROR_NAME,
  VERSION,
  guard,
  beforeRoute
}
