;['client', 'server'].forEach((VUE_ENV) => {
  jest.resetModules()

  process.env.VUE_ENV = VUE_ENV

  describe(VUE_ENV, () => {
    require('./tests')
  })
})
