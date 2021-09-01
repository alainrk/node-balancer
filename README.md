Inspired by [NodeJs Design Patterns - HTTP Dynamic Load Balancer](https://github.com/PacktPublishing/Node.js-Design-Patterns-Third-Edition/tree/master/12-scalability-and-architectural-patterns/06-http-dynamic-load-balancer)

# Start consul
```
consul agent -dev
```

# Start load balancer and apps
```
forever start balancer.js

forever start --killSignal=SIGINT app.js api
forever start --killSignal=SIGINT app.js api
forever start --killSignal=SIGINT app.js webapp
```

# Call service
```
curl localhost:8080/api
curl localhost:8080/web
```