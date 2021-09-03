'use strict'

const cluster = require('cluster')
const numCPUs = 2 // require('os').cpus().length
const NodeBalancer = require('./nodeBalancer')
const logger = require('pino')({ prettyPrint: true })
const consul = require('consul')
const consulClient = consul({ host: 'localhost', port: 8500 })

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running\nCPUs available: ${numCPUs}`)
  const workers = {}

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork()
    workers[worker.id] = worker
  }

  const updateServices = () => {
    consulClient.agent.service.list((err, services) => {
      if (err || !services) return
      for (const worker of Object.values(workers)) {
        worker.send({ msg: 'services', services })
      }
    })
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.info(`worker ${worker.process.pid} died`)
    delete workers[worker.id]
    // if (code !== 0 && !worker.exitedAfterDisconnect) {
    //   logger.info(`The worker crashed, starting a new worker...`)
    //   const worker = cluster.fork()
    //   workers[worker.id] = worker
    // }
  })

  updateServices()
  setInterval(updateServices, 10000)
} else {
  logger.info(`Worker ${process.pid} started`)

  // Workers can share any TCP connection
  // In this case it is inside the balancer
  const app = new NodeBalancer({ port: 8080 })
  app.listen()

  process.on('message', (message) => {
    if (message.msg === 'services') {
      // logger.info(`[${process.pid}] Services: ${JSON.stringify(message.services)}`)
      app.updateServices(message.services)
    }
  })
}
