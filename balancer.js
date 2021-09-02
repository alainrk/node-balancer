const { createServer } = require('http')
const httpProxy = require('http-proxy')
const consul = require('consul')
const logger = require('pino')({ prettyPrint: true })

const routing = [
  { path: '/api', service: 'api', index: 0 },
  { path: '/web', service: 'web', index: 0 }
]

let serversByService = {}

const consulClient = consul({ host: 'localhost', port: 8500 })
const proxy = httpProxy.createProxyServer()

function serviceUpdateRoutine () {
  consulClient.agent.service.list((err, services) => {
    serversByService = {}

    if (err || !services) return

    for (const service of Object.values(services)) {
      for (const tag of service.Tags) {
        if (!serversByService[tag]) serversByService[tag] = []
        serversByService[tag].push(service)
      }
    }

    // logger.info('Updated servers', JSON.stringify(serversByService, ' ', 2))

    if (err) {
      if (err) logger.info('Err:', err)
      res.writeHead(502)
      return res.end('Bad gateway')
    }
  })
  setTimeout(serviceUpdateRoutine, 10 * 1000)
}

serviceUpdateRoutine()

const server = createServer((req, res) => {
  logger.info('Request:', req.url)

  const route = routing.find((route) => req.url.startsWith(route.path))

  if (!route) {
    res.writeHead(502)
    return res.end('Bad gateway')
  }

  // logger.info(route.service, serversByService[route.service])

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
})

server.listen(8080, () => {
  logger.info('Load balancer is listening on port 8080')
})
