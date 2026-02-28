const express = require("express");
const { sendMessage, allUsers } = require("../controllers/user.controller");
const router = express.Router();

router.get("/messages", sendMessage);
router.get("/users", allUsers);

module.exports = router;
