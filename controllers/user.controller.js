const Messages = require("../models/db.messages");
const Users = require("../models/db.users");
const sendMessage = async (req, res) => {
  const { sender, receiver } = req.query;

  try {
    const messages = await Messages.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ createdAt: 1 });

    res.status(201).json({ messages });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error in sending message", message: error.message });
  }
};

const allUsers = async (req, res) => {
  const { currentUser } = req.query;
  try {
    const users = await Users.find({ username: { $ne: currentUser } });
    res.status(200).json({
      success: true,
      users,
      message:
        users.length === 0
          ? "Currently no users is there"
          : "users fetched successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error in fetching users.", message: error.message });
  }
};
module.exports = { sendMessage, allUsers };
