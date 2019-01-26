var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var art = require("ascii-art");

var namespaces = [];
var users = [];
var answers = [];
var currentTask = [];

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
      currentTask[roomId] = undefined;
      setupServerRoom(socket, namespaces, roomId); //TODO refactor
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
      d("joinError: room");
      socket.emit("joinError", "room");
    }
  });
}

function setupServerRoom(socketAll, spaces, roomId) {
  var room = spaces[roomId];
  room.on("connection", socket => {
    setupRoomJoin(socketAll, socket, roomId);
    socket.on("task", task => {
      var taskObject = parseTask(task);
      currentTask[roomId] = taskObject;
      room.emit("task", taskObject);
    });
    socket.on("answer", answer => {
      d(answer);
      answers.push(answer);
      if (currentTask[roomId].answers === answers.length) {
        calculateAnswers();
      }
    });
    socket.on("disconnect", () => {
      d("user disconnected room");
    });
  });

  function setupRoomJoin(socketAll, socket, roomId) {
    socket.on("joined", user => {
      d(user + " joined room " + roomId);
      if (!users[roomId].includes(user)) {
        users[roomId].push(user);
        d(users[roomId]);
        room.emit("joined", user);
      } else {
        d("joinError: user");
        socket.emit("joinError", "user");
      }
    });
  }

  function calculateAnswers() {
    var didAnswerFail = false;
    if (currentTask[roomId].action === "crack") {
      if (answers[1].data !== "add") {
        didAnswerSucceed(false);
        didAnswerFail = true;
      }
    }
    if (!didAnswerFail) didAnswerSucceed(true);
    answers = [];
    currentTask[roomId] = undefined;
  }

  function didAnswerSucceed(sux) {
    var answerStatus = {
      success: sux,
      message: "",
      responsible: "everyone"
    };
    if (currentTask[roomId].action === "crack") {
      if (sux) {
        answerStatus.message = "Attack defeated by ";
      } else {
        answerStatus.message = "Attack failed by ";
      }
      answerStatus.responsible = currentTask[roomId].players
        .map(el => {
          return "<span class='green'>" + el + "</span>";
        })
        .join(" ");
    } else {
      if (sux) {
        answerStatus.message = "Attack defeated by ";
        answerStatus.responsible = "<span class='green'>everyone</span>";
      } else {
        answerStatus.message = "Attack let through by ";
        answers.forEach(ans => {
          if (ans.data !== currentTask[roomId].objective) {
            answerStatus.responsible +=
              "<span class='green'>" + ans.user + "</span> ";
          }
        });
      }
    }
    room.emit("answerSummary", answerStatus);
  }

  function parseTask(task) {
    d("PARSE: " + task);
    var taskObject = {
      players: ["everyone"],
      action: "",
      objective: "",
      modifier: "",
      text: "",
      answers: users[roomId].length
    };
    task = task.split(" ");
    if (task[0] === "crack") {
      taskObject.answers = 3;
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
