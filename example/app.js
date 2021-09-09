const { createServer } = require('http')
const { nanoid } = require('nanoid')
const consul = require('consul')
const portfinder = require('portfinder')

const serviceType = process.argv[2]
const { pid } = process

async function main () {
  const consulClient = consul({ host: 'localhost', port: 8500 })

  const port = await portfinder.getPortPromise()
  const address = process.env.ADDRESS || 'localhost'
  const serviceId = nanoid()

  function registerService () {
    const service = {
      id: serviceId,
      name: serviceType,
      port,
      address,
      tags: [serviceType]
    }
    console.log(service)
    consulClient.agent.service.register(service, () => {
      console.log(`Registered service ${serviceType} - id: ${serviceId}`)
    })
  }

  function unregisterService (err) {
    err && console.log(err)
    consulClient.agent.service.deregister(serviceId, () => {
      console.log(`Unregistered service ${serviceType} - id: ${serviceId}`)
      process.exit(err ? 1 : 0)
    })
  }

  process.on('SIGINT', unregisterService)
  process.on('uncaughtException', unregisterService)
  process.on('exit', unregisterService)

  const server = createServer((req, res) => {
    let i = 1e7; while (i > 0) { i-- }
    console.log(`Handling request from ${pid}`)
    res.end(`${serviceType} response from ${pid}\n`)
  })

  server.listen(port, address, () => {
    registerService()
    console.log(`Started ${serviceType} at ${pid} on port ${port}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})