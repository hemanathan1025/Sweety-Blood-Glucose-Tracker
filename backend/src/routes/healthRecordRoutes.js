// Keeps all reading routes behind the login check.
const router = require('express').Router();
const controller = require('../controllers/healthRecordController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;