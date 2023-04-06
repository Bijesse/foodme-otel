// OTel Custom Instrumentation (line 2) - This require statement inserts the OTel API module into our application
//const opentelemetryAPI = require("@opentelemetry/api");

const express = require('express');
const logger = require('pino')();
const morgan = require('morgan');
const bodyParser = require('body-parser');

const fs = require('fs');
const open = require('open');

const RestaurantRecord = require('./model').Restaurant;
const MemoryStorage = require('./storage').Memory;

const API_URL = '/api/restaurant';
const API_URL_ID = API_URL + '/:id';
const API_URL_ORDER = '/api/order';


var removeMenuItems = function(restaurant) {
  var clone = {};

  Object.getOwnPropertyNames(restaurant).forEach(function(key) {
    if (key !== 'menuItems') {
      clone[key] = restaurant[key];
    }
  });

  return clone;
};

exports.start = function(PORT, STATIC_DIR, DATA_FILE, TEST_DIR) {
  var app = express();
  var storage = new MemoryStorage();

  // log requests
  app.use(morgan('combined'));

  // serve static files for demo client
  app.use(express.static(STATIC_DIR));

  // create application/json parser
  var jsonParser = bodyParser.json();

  // OTel Custom Instrumentation (lines 47-50) - This meter will allow us to capture custom metrics which we will use to keep track of the number of successful orders made 
  /*
  const meter = opentelemetryAPI.metrics.getMeter(
    'foodme-meter'
  );
  const orderCounter = meter.createUpDownCounter('orderCount');
  */
  
  // API
  app.get(API_URL, function(req, res, next) {
    res.status(200).send(storage.getAll().map(removeMenuItems));
  });

  app.post(API_URL, function(req, res, next) {
    var restaurant = new RestaurantRecord(req.body);
    var errors = [];

    if (restaurant.validate(errors)) {
      storage.add(restaurant);
      return res.send(201, restaurant);
    }

    return res.status(400).send({ error: errors });
  });

  app.post(API_URL_ORDER, jsonParser, function(req, res, next) {  
 
    // OTel Custom Instrumentation(lines 74-75) - We'll need to add attributes to our OTel spans. We do this by getting a reference to the active context, then getting a reference to the span
    /*
    const activeCtx = opentelemetryAPI.context.active();
    const activeSpan = opentelemetryAPI.trace.getSpan(activeCtx);
    */
    
    // OTel Custom Instrumentation(lines 79 & 110) - Throws error if more than 6 items are orders 
    //try {
  
      logger.info(req.body, 'checkout');
      
      // OTel Custom Instrumentation (line 84) - Here we increment our UpDownCounter (from line 50) by 1, since an order has been placed 
      //orderCounter.add(1);
      
      // OTel Custom Instrumentation (lines 88-99) - We are introducing 4 custom attributes by collecting data about the order and then assigning this data to an active span 
      /*
      var order = req.body;
      var itemCount = 0;
      var orderTotal = 0;
      order.items.forEach(function(item) { 
        itemCount += item.qty;
        orderTotal += item.price * item.qty;
      });
  
      activeSpan.setAttribute('customer', order.deliverTo.name);
      activeSpan.setAttribute('restaurant', order.restaurant.name);
      activeSpan.setAttribute('itemCount', itemCount);
      activeSpan.setAttribute('orderTotal', orderTotal);
      */
      
      // OTel Custom Instrumentation (lines 104 - 106) - Throws error if more than 6 items are ordered
      /*
      if (itemCount > 6) {
        throw new Error('Error occurred while processing order. Too many items')
      }
      */
      return res.status(201).send({ orderId: Date.now() });
    
    // } // <-- don't forget about this curly bracket when introducing OTel Custom Instrumentation!      
    
    // OTel Custom Instrumentation (lines 114 - 121) - Catch error if more than 6 items are orders. We record the exception as part of the span, and set the status code to "error"  
    /*
    catch(ex) {
        // order was not successful, so we decrement our UpDownCounter by 1
        orderCounter.add(-1);

        activeSpan.recordException(ex);
        activeSpan.setStatus({ code: opentelemetryAPI.SpanStatusCode.ERROR });
        throw ex; 
        }
      */
      return res.status(201).send({ orderId: Date.now() });
  });
  
  app.get(API_URL_ID, function(req, res, next) {
    var restaurant = storage.getById(req.params.id);
    if (restaurant) {
      return res.status(200).send(restaurant);
    }
    return res.status(400).send({ error: 'No restaurant with id "' + req.params.id + '"!' });
  });

  app.put(API_URL_ID, function(req, res, next) {
    var restaurant = storage.getById(req.params.id);
    var errors = [];

    if (restaurant) {
      restaurant.update(req.body);
      return res.status(200).send(restaurant);
    }

    restaurant = new RestaurantRecord(req.body);
    if (restaurant.validate(errors)) {
      storage.add(restaurant);
      return res.send(201, restaurant);
    }

    return res.send(400, { error: errors });
  });

  app.delete(API_URL_ID, function(req, res, next) {
    if (storage.deleteById(req.params.id)) {
      return res.send(204, null);
    }

    return res.send(400, { error: 'No restaurant with id "' + req.params.id + '"!' });
  });

  // read the data from json and start the server
  fs.readFile(DATA_FILE, function(err, data) {
    JSON.parse(data).forEach(function(restaurant) {
      storage.add(new RestaurantRecord(restaurant));
    });

    app.listen(PORT, function() {
      open('http://localhost:' + PORT + '/');
      console.log('Go to http://localhost:' + PORT + '/');
    });
  });

  // Windows and Node.js before 0.8.9 would crash
  // https://github.com/joyent/node/issues/1553
  try {
    process.on('SIGINT', function() {
      // save the storage back to the json file
      fs.writeFile(DATA_FILE, JSON.stringify(storage.getAll()), function() {
        process.exit(0);
      });
    });
  }
  catch (e) {}

};