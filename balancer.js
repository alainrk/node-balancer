const { createServer } = require('http')
const httpProxy = require('http-proxy')
const consul = require('consul')
const logger = require('pino')({ prettyPrint: true })
const { join } = require('path')

const configRoutes = require(join(__dirname, 'config', 'routes.json'))

const serversByService = {}
const routing = []

for (const route of configRoutes) {
  routing.push({ ...route, index: 0 })
  serversByService[route.service] = []
}

const consulClient = consul({ host: 'localhost', port: 8500 })
const proxy = httpProxy.createProxyServer()

function serviceUpdateRoutine () {
  consulClient.agent.service.list((err, services) => {
    if (err || !services) return

    for (const service in serversByService) {
      serversByService[service] = []
    }

    for (const service of Object.values(services)) {
      for (const tag of service.Tags) {
        serversByService[tag].push(service)
      }
    }

    logger.info(`Updated servers ${ JSON.stringify(serversByService, ' ', 2) }`)
    // logger.info('Updated servers', JSON.stringify(serversByService, ' ', 2))

    if (err) {
      if (err) logger.info('Err:', err)
      res.writeHead(502)
      return res.end('Bad gateway')
    }
  })
  setTimeout(serviceUpdateRoutine, 10 * 1000)
}

function requestHandler (req, res) {
  logger.info('Request:', req.url)

  const route = routing.find((route) => req.url.startsWith(route.path))

  if (!route) {
    res.writeHead(502)
    return res.end('Bad gateway')
  }

  const servers = serversByService[route.service]

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

serviceUpdateRoutine()

const server = createServer(requestHandler)

server.listen(8080, () => {
  logger.info('Load balancer is listening on port 8080')
})
