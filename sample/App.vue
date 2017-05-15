<template>
  <div id="app">
    <ul>
      <li><router-link to="/foo/1">/foo/1</router-link></li>
      <li><router-link to="/foo/2">/foo/2</router-link></li>
      <li><router-link to="/foo/3">/foo/3 (will be not found)</router-link></li>
      <li><router-link to="/foo/4">/foo/4 (will redirect to /foo/1)</router-link></li>
    </ul>

    <router-view />
  </div>
</template>

<script>
  export default {
    name: 'app'
  }
</script>
