# NodeJs simple clustered Load Balancer

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

## Credits
Inspired by [NodeJs Design Patterns - HTTP Dynamic Load Balancer](https://github.com/PacktPublishing/Node.js-Design-Patterns-Third-Edition/tree/master/12-scalability-and-architectural-patterns/06-http-dynamic-load-balancer)