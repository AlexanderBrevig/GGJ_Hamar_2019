var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var art = require("ascii-art");

var namespaces = [];

let d = msg => {
  console.log(msg);
};

app.use("/static", express.static("public"));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", function(socket) {
  d("a user connected public");

  setupCreateRoom(socket);

  setupJoinRoom(socket);

  socket.on("disconnect", () => {
    d("user disconnected public");
  });
});

http.listen(3000, () => {
  d("listening on *:3000");
});

function setupCreateRoom(socket) {
  socket.on("createRoom", msg => {
    let roomId = Math.random()
      .toString(36)
      .substring(7);
    if (namespaces[roomId] === undefined) {
      namespaces[roomId] = io.of("/" + roomId);
      setupRoom(namespaces[roomId]);
    }
    d("room: " + roomId);
    art.font("join      " + roomId, "Doom", rendered => {
      socket.emit("room", {
        id: roomId,
        ascii: rendered
      });
    });
  });
}

function setupJoinRoom(socket) {
  socket.on("joinRoom", id => {
    if (namespaces[id] !== undefined) {
      d("joined: " + id);
      socket.emit("joined", id);
    } else {
      d("joinError:");
      socket.emit("joinError", "No such room");
    }
  });
}

function setupRoom(room) {
  room.on("connection", socket => {
    socket.on("joined", user => {
      d(user + " joined requested room");
      if (users[user] === undefined) {
        room.emit("joined", user);
        room.emit("task", {
          targets: ["everyone"],
          text: "Click the button 10 times",
          action: "clicker",
          timeLimit: 10
        });
      } else {
        socket.emit("joinError", "User exists");
      }
    });
    socket.on("disconnect", () => {
      d("user disconnected room");
    });
  });
}
