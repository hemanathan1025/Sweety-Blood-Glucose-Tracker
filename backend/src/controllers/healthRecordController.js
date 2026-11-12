// Turns reading service results into HTTP responses.
const service = require('../services/healthRecordService');

// Reuse one response and error pattern for all reading routes.
function handle(action) {
  return async (req, res, next) => {
    try {
      const data = await action(req);
      res.status(data.status || 200).json({ success: true, message: data.message || 'OK', data: data.value });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  create: handle(async (req) => ({ status: 201, message: 'Reading created.', value: await service.create(req.user.userId, req.body) })),
  list: handle(async (req) => ({ value: await service.list(req.user.userId, req.query) })),
  getById: handle(async (req) => ({ value: await service.getById(req.user.userId, req.params.id) })),
  update: handle(async (req) => ({ message: 'Reading updated.', value: await service.update(req.user.userId, req.params.id, req.body) })),
  remove: handle(async (req) => ({ message: 'Reading deleted.', value: await service.remove(req.user.userId, req.params.id) })),
};