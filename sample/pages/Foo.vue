<template>
  <div>Foo {{ found ? remoteData.value : 'Not Found' }}</div>
</template>

<script>
  import { beforeRoute } from 'vue-router-guard'

  function fetchRemoteData (id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id,
          value: `fetched ID#${id}`
        })
      }, 16)
    })
  }

  export default {
    name: 'foo',

    props: {
      found: {
        required: true,
        type: Boolean
      },

      remoteData: {
        type: Object
      }
    },

    ...beforeRoute((to, from, next) => {
      const { id } = to.params

      fetchRemoteData(id).then((remoteData) => {
        if (id === '3') {
          next.status(404).props({ found: false })()
        } else if (id === '4') {
          next.redirect({ name: 'foo', params: { id: 1 } } )
        } else {
          next.props({ remoteData, found: true })()
        }
      })
    })
  }
</script>
