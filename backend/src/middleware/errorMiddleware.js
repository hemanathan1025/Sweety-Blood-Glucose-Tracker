// Returns one clear JSON error format for failed requests.
function notFound(req, res, next) {
  const error = new Error('Route not found.');
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
}

// Hide internal server details from API clients.
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number(error.statusCode || error.status) || 500;
  let message = status >= 500 ? 'An unexpected server error occurred.' : error.message;
  let code = error.code || 'INTERNAL_ERROR';
  if (error.type === 'entity.parse.failed') {
    message = 'Request body must contain valid JSON.';
    code = 'INVALID_JSON';
  }
  if (error.type === 'entity.too.large') {
    message = 'Request body is too large.';
    code = 'REQUEST_TOO_LARGE';
  }
  res.status(status).json({ success: false, error: { code, message } });
}

module.exports = { notFound, errorHandler };