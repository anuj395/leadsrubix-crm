// src/utils/logger.js
// simple wrapper around console; replace with winston/pino as needed

exports.info = (msg, ...args) => console.log(`[INFO] ${msg}`, ...args);
exports.error = (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args);
exports.debug = (msg, ...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[DEBUG] ${msg}`, ...args);
  }
};
