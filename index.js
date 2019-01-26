var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var art = require("ascii-art");

var namespaces = [];
var users = [];

let d = msg => {
  console.log(msg);
};

app.use("/static", express.static("public"));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", function(socket) {
  d("a user connected public");

  setupCreateRoom(socket); //used by admin
  setupJoinRoom(socket); //used by players

  socket.on("disconnect", () => {
    d("user disconnected public");
  });
});

http.listen(3000, () => {
  d("listening on *:3000");
});

/*
    SETUP SOCKET LISTENERS AND CALLBACKS
*/
function setupCreateRoom(socket) {
  socket.on("createRoom", msg => {
    let roomId = Math.random()
      .toString(36)
      .substring(7);
    if (namespaces[roomId] === undefined) {
      namespaces[roomId] = io.of("/" + roomId);
      users[roomId] = ["test1", "test3"];
      setupServerRoom(namespaces, roomId); //TODO refactor
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

function setupServerRoom(spaces, roomId) {
  var room = spaces[roomId];
  room.on("connection", socket => {
    setupRoomJoin(socket, roomId);
    socket.on("task", task => {
      var taskObject = parseTask(task);
      room.emit("task", taskObject);
    });
    socket.on("disconnect", () => {
      d("user disconnected room");
    });
  });

  function setupRoomJoin(socket, roomId) {
    socket.on("joined", user => {
      d(user + " joined room " + roomId);
      if (!users[roomId].includes(user)) {
        users[roomId].push(user);
        d(users[roomId]);
        room.emit("joined", user);
      } else {
        socket.emit("joinError", "User exists");
      }
    });
  }

  function parseTask(task) {
    d("PARSE: " + task);
    var taskObject = {
      players: ["everyone"],
      action: "",
      objective: "",
      modifier: "",
      text: ""
    };
    task = task.split(" ");
    if (task[0] === "crack") {
      taskObject.action = task[0];
      taskObject.players = users[roomId]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      taskObject.objective = task[1];
      taskObject.modifier = task[2];
    } else if (task[0] === "all") {
      taskObject.action = task[1];
      if (task[1] === "click") {
        taskObject.objective = task[2];
        if (task[3] !== undefined) {
          taskObject.modifier = task[3]
            .replace("(", "")
            .replace(")", "")
            .split(",");
        }
      }
      if (task[1] === "hold") {
        taskObject.objective = task[2];
      }
      if (task[1] === "count") {
        taskObject.objective = task[2];
      }
    }
    return taskObject;
  }
}
