import createApp from './app'

const { app, router } = createApp()

function mount () {
  app.$mount('#app')
}

router.onReady(mount, mount)
