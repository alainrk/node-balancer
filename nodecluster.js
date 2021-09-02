const cluster = require('cluster')
const numCPUs = require('os').cpus().length
const nodebalancer = require('./nodebalancer')
const logger = require('pino')({ prettyPrint: true })

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running\nCPUs available: ${numCPUs}`)

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.info(`worker ${worker.process.pid} died`)
  })
} else {
  // Workers can share any TCP connection
  // In this case it is inside the balancer
  const app = nodebalancer({ port: 8080, serviceRegistryUpdateSecs: 100 })
  app.listen()

  logger.info(`Worker ${process.pid} started`)
}
