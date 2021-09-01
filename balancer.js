const { createServer } = require('http')
const httpProxy = require('http-proxy')
const consul = require('consul')

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

    // console.log('Updated servers', JSON.stringify(serversByService, ' ', 2))

    if (err) {
      if (err) console.log('Err:', err)
      res.writeHead(502)
      return res.end('Bad gateway')
    }
  })
  setTimeout(serviceUpdateRoutine, 3000)
}

serviceUpdateRoutine()

const server = createServer((req, res) => {
  console.log('Request:', req.url)
  const route = routing.find((route) => req.url.startsWith(route.path))

  if (!route) {
    res.writeHead(502)
    return res.end('Bad gateway')
  }

  console.log(route.service, serversByService[route.service])

  const servers = serversByService[route.service]

  if (!servers || !servers.length) {
    console.log('No servers for', route.service)
    res.writeHead(502)
    return res.end('Bad gateway')
  }

  route.index = (route.index + 1) % servers.length

  const server = servers[route.index]

  console.log(`Using server ${server.ID}`)

  const target = `http://${server.Address}:${server.Port}`
  proxy.web(req, res, { target })
})

server.listen(8080, () => {
  console.log('Load balancer is listening on port 8080')
})
