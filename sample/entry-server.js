import createApp from './app'
import { ERROR_NAME } from '../src'

export default (context) => {
  return new Promise((resolve, reject) => {
    const { app, router } = createApp()

    function handleError (err) {
      if (err &&
        err.name === ERROR_NAME &&
        err.type === 'redirect' &&
        typeof err.value === 'object') {
        err.value = router.resolve(err.value).href
      }

      reject(err)
    }

    router.onError(handleError)

    router.onReady((route) => {
      if (route && route.meta && route.meta.status) {
        context.status = route.meta.status
      }

      resolve(app)
    }, handleError)

    router.push(context.url)
  })
}
