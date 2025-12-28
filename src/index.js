// Fix for Node.js 22/23 Buffer compatibility
global.Buffer = global.Buffer || require('buffer').Buffer;

const mongoose = require('mongoose');
const axios = require('axios'); // Add axios import
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');

// Set Mongoose 6 strictQuery option
mongoose.set('strictQuery', false);

// Reloader Function
const url = `${process.env.BASE_API_URL}/health`; // Replace with your Render URL
const interval = 50000; // Interval in milliseconds (50 seconds)

function reloadWebsite() {
  axios
    .get(url)
    .then((response) => {
      logger.info(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch((error) => {
      logger.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}

function startReloader() {
  setInterval(reloadWebsite, interval);
}

let server;
mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
  logger.info('Connected to MongoDB');
  server = app.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
    startReloader(); // Start the reloader once the server is up
  });
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
