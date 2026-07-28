// src/middlewares/errorHandler.js
// central error-handling middleware
module.exports.errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  console.error('[Error Handler]:', err);
  res.status(status).json({ message });
};
