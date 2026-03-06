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

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://wechat-wine-xi.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};
const io = new Server(server, {
  cors: corsOptions,
});
app.set("trust proxy", 1); // ⭐ IMPORTANT for Render secure cookies

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
//public routes
app.use("/api/auth", require("./routes/auth.route"));

//auth routes
app.use(auth);
app.use("/api", require("./routes/user.routes"));

//creating storage for online users
//const onlineUsers = {};

//creating socket
io.on("connection", (socket) => {
  console.log("New user is connected", socket.id);

  //when user logged In store it in onlineUsers
  socket.on("user_logged_in", async (username) => {
    //code with online user->onlineUsers[username] = socket.id; // store user socket
    socket.join(username); //code while socket room
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
  //when client send message
  socket.on("send_message", async (data) => {
    try {
      //first we get the data from emit() event from frontend and save
      const { sender, receiver, message } = data;
      const newMessage = new Messages({ sender, receiver, message });
      await newMessage.save();
      //then we emit message from back to sender(the sender should see the updated message)
      io.to(sender).emit("receive_message", newMessage);
      io.to(receiver).emit("receive_message", newMessage);
      //while usung onlineuser as{}
      // const receiverSocket = onlineUsers[receiver];
      //if was for checking online
      // if (receiverSocket) {
      //   io.to(receiverSocket).emit("receive_message", newMessage);
      // }
    } catch (error) {
      console.error("Socket message error:", error.message);
    }
  });
  socket.on("typing", ({ sender, receiver }) => {
    // const receiverSocket = onlineUsers[receiver];

    // if (receiverSocket) {
    //   io.to(receiverSocket).emit("user-typing", { sender });
    // }
    socket.to(receiver).emit("user-typing", { sender, receiver });
  });
  socket.on("typing-ended", ({ sender, receiver }) => {
    socket.to(receiver).emit("user-typing-ended", { sender, receiver });
  });
  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    // for (const user in onlineUsers) {
    //   if (onlineUsers[user] === socket.id) {
    //     delete onlineUsers[user];
    //     break;
    //   }
    // }
    //Socket.IO automatically removes sockets from rooms.
  });
  socket.on("message_delivered", async ({ messageId, sender, receiver }) => {
    await Messages.findByIdAndUpdate(messageId, {
      status: "delivered",
    });

    io.to(sender).emit("message_status_update", {
      messageId,
      status: "delivered",
    });

    io.to(receiver).emit("message_status_update", {
      messageId,
      status: "delivered",
    });
  });
});

//start server
const port = process.env.PORT;
const startServer = async () => {
  await initializeDb();
  server.listen(port, () => console.log("Server is started with port", port));
};
startServer();
