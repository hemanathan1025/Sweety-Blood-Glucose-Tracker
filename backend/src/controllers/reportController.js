// Returns report summaries from the report service.
const service = require('../services/reportService');

// Reuse one handler for each report period.
function createHandler(method) {
  return async (req, res, next) => {
    try {
      const data = await service[method](req.user.userId, req.query.date);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  daily: createHandler('daily'),
  monthToDate: createHandler('monthToDate'),
  monthly: createHandler('monthly'),
};