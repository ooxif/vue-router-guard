import Vue from 'vue'
import Router from 'vue-router'

// pages
import Foo from './pages/Foo.vue'

Vue.use(Router)

export default function createRouter () {
  return new Router({
    mode: 'history',

    routes: [
      { name: 'foo', path: '/foo/:id', component: Foo }
    ]
  })
}
