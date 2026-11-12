// Keeps all report routes behind the login check.
const router = require('express').Router();
const controller = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/daily', controller.daily);
router.get('/month-to-date', controller.monthToDate);
router.get('/monthly', controller.monthly);

module.exports = router;