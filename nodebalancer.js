const httpProxy = require('http-proxy')
const consul = require('consul')
const logger = require('pino')({ prettyPrint: true })

const { createServer } = require('http')
const { join } = require('path')

const configRoutes = require(join(__dirname, 'config', 'routes.json'))

const consulClient = consul({ host: 'localhost', port: 8500 })
const proxy = httpProxy.createProxyServer()

function initParams (routes) {
  const serversByService = {}
  const routing = []
  for (const route of routes) {
    routing.push({ ...route, index: 0 })
    serversByService[route.service] = []
  }
  return { serversByService, routing }
}

function serviceUpdateRoutine () {
  consulClient.agent.service.list((err, services) => {
    if (err || !services) return

    for (const service in this.serversByService) {
      this.serversByService[service] = []
    }

    for (const service of Object.values(services)) {
      for (const tag of service.Tags) {
        this.serversByService[tag].push(service)
      }
    }

    logger.info(`Updated servers ${ JSON.stringify(this.serversByService, ' ', 2) }`)

    if (err) {
      if (err) logger.info('Err:', err)
      res.writeHead(502)
      return res.end('Bad gateway')
    }
  })
}

function requestHandler (req, res) {
  logger.info(`Process ${process.pid} | Request: ${req.url}`)

  const route = this.routing.find((route) => req.url.startsWith(route.path))

  if (!route) {
    res.writeHead(502)
    return res.end('Bad gateway')
  }

  const servers = this.serversByService[route.service]

  if (!servers || !servers.length) {
    logger.error(`No servers for path:${route.path} - service:${route.service}`)
    res.writeHead(502)
    return res.end('Bad gateway')
  }

  route.index = (route.index + 1) % servers.length

  const server = servers[route.index]

  logger.info(`Using server ${server.ID}`)

  const target = `http://${server.Address}:${server.Port}`
  proxy.web(req, res, { target }, (err) => {
    logger.error(err)
    res.writeHead(404)
    res.end(`Service ${route.service} not available`)
  })
}

function listen () {
  this.server.listen(this.port, () => {
    logger.info(`Load balancer is listening on port ${this.port}`)
  })
}

function nodebalancer ({ port = 8080, serviceRegistryUpdateSecs = 10 }) {
  const { serversByService, routing } = initParams(configRoutes)

  this.routing = routing
  this.serversByService = serversByService
  this.port = port

  serviceUpdateRoutine()
  setInterval(serviceUpdateRoutine.bind(this), serviceRegistryUpdateSecs * 1000)

  this.server = createServer(requestHandler.bind(this))
  this.listen = listen

  return this
}

module.exports = nodebalancer
