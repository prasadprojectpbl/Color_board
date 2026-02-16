const express = require("express");
const http = require("http");
const cors = require("cors");
const { userJoin, getUsers, userLeave } = require("./utils/user");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Test route
app.get("/", (req, res) => {
  res.send("Server is running successfully");
});

// Store room image
let imageUrl = "";

// SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("user-joined", (data) => {
    const { roomId, userName, host, presenter } = data;

    if (!roomId || !userName) return;

    const user = userJoin(socket.id, userName, roomId, host, presenter);

    socket.join(user.room);

    const roomUsers = getUsers(user.room);

    socket.emit("message", {
      message: "Welcome to the Whiteboard",
    });

    socket.broadcast.to(user.room).emit("message", {
      message: `${user.username} has joined`,
    });

    io.to(user.room).emit("users", roomUsers);
    io.to(user.room).emit("canvasImage", imageUrl);
  });

  socket.on("drawing", (data) => {
    imageUrl = data;
    socket.broadcast.emit("canvasImage", imageUrl);
  });

  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      const roomUsers = getUsers(user.room);

      io.to(user.room).emit("message", {
        message: `${user.username} left the chat`,
      });

      io.to(user.room).emit("users", roomUsers);
    }

    console.log("User disconnected:", socket.id);
  });
});

// PORT (Render requires this)
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
