//importing modules and middlewire
const cors = require("cors");
const http = require("http");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const express = require("express");
const { initializeDb } = require("./db/db.connect");
const app = express();
const Messages = require("./models/db.messages");
//implementiong socket.io and creating sever with express and socket.io
const { Server } = require("socket.io");
const auth = require("./middilewire/auth");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // your frontend URL
    credentials: true,
  },
});
//global middlewire
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000", // your frontend URL
    credentials: true,
  }),
);
app.use(cookieParser());
//public routes
app.use("/api/auth", require("./routes/auth.route"));

//auth routes
app.use(auth);
app.use("/api", require("./routes/user.routes"));

//creating socket
io.on("connection", (socket) => {
  console.log("New user is connected", socket.id);
  //when client send message
  socket.on("send_message", async (data) => {
    try {
      const { sender, receiver, message } = data;
      const newMessage = new Messages({ sender, receiver, message });
      await newMessage.save();
      socket.emit("receive_message", newMessage);
      //how the reciver get msg
      socket.broadcast.emit("receive_message", newMessage);
    } catch (error) {
      console.error("Socket message error:", error.message);
    }
  });
  socket.on("typing", ({ sender, receiver }) => {
    socket.broadcast.emit("user-typing", { sender });
  });
  socket.on("typing-ended", ({ sender }) => {
    socket.broadcast.emit("user-typing-ended", { sender });
  });
  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
  socket.on("message_delivered", async ({ messageId }) => {
    await Messages.findByIdAndUpdate(messageId, {
      status: "delivered",
    });

    io.emit("message_status_update", {
      messageId,
      status: "delivered",
    });
  });
  socket.on("user_logged_in", async (username) => {
    try {
      // Find all undelivered messages for this receiver
      const undelivered = await Messages.find({
        receiver: username,
        status: { $ne: "delivered" },
      });

      if (undelivered.length > 0) {
        // Update all to delivered in DB
        const ids = undelivered.map((msg) => msg._id);
        await Messages.updateMany(
          { _id: { $in: ids } },
          { status: "delivered" },
        );

        // Notify all clients (including senders) about updated status
        ids.forEach((id) => {
          io.emit("message_status_update", {
            messageId: id,
            status: "delivered",
          });
        });
      }
    } catch (err) {
      console.error("Error marking messages delivered:", err);
    }
  });
});
//start server
const port = process.env.PORT;
const startServer = async () => {
  await initializeDb();
  server.listen(port, () => console.log("Server is started with port", port));
};
startServer();
