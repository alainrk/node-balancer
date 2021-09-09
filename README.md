# NodeJs simple clustered Load Balancer

[![stability-experimental](https://img.shields.io/badge/stability-experimental-orange.svg)](https://github.com/emersion/stability-badges#experimental)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

## Start consul (service registry)
```
consul agent -dev
```

## Start load balancer as cluster
```
npm start
```

## Start your services
```
forever start --killSignal=SIGINT example/app.js api
forever start --killSignal=SIGINT example/app.js api
forever start --killSignal=SIGINT example/app.js webapp
```

## Call services through load balancer
```
curl localhost:8080/api
curl localhost:8080/web
```

## TODO
- Setup tests on basic interface of balancer itself
- Support different service registry
- Better handling of sigterm/kill (pause on fork, notify about it, ...)
- Cli (?):
  - Parametrize clusterization
  - SR configuration

## Credits
Inspired by [NodeJs Design Patterns - HTTP Dynamic Load Balancer](https://github.com/PacktPublishing/Node.js-Design-Patterns-Third-Edition/tree/master/12-scalability-and-architectural-patterns/06-http-dynamic-load-balancer)