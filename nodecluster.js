'use strict'

const cluster = require('cluster')
const numCPUs = 2 // require('os').cpus().length
const NodeBalancer = require('./NodeBalancer')
const logger = require('pino')({ prettyPrint: true })

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running\nCPUs available: ${numCPUs}`)
  const workers = {}

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork()
    workers[worker.id] = worker
  }

  setInterval(() => {
    for (const worker of Object.values(workers)) {
      worker.send({ msg: 'Msg from master', date: Date.now() })
    }
  }, 3000)

  cluster.on('exit', (worker, code, signal) => {
    logger.info(`worker ${worker.process.pid} died`)
    delete workers[worker.id]
    // if (code !== 0 && !worker.exitedAfterDisconnect) {
    //   logger.info(`The worker crashed, starting a new worker...`)
    //   const worker = cluster.fork()
    //   workers[worker.id] = worker
    // }
  })
} else {
  logger.info(`Worker ${process.pid} started`)

  process.on('message', (message) => {
    logger.info(`[${process.pid}] Received: ${JSON.stringify(message)}`)
  })

  // Workers can share any TCP connection
  // In this case it is inside the balancer
  const app = new NodeBalancer({ port: 8080, serviceRegistryUpdateSecs: 15 })
  app.listen()
}
