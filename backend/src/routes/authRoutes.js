// Lists public auth routes and protected profile routes.
const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateProfile,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getProfile);
router.put("/me", authMiddleware, updateProfile);

module.exports = router;
