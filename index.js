const app = require('express')();
const express = require('express')
const path = require('path')
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'))

const PORT = process.env.PORT || 5000

const cactaur = {
  name: 'Cactaur',
  attack: '100',
  actions: ['attack', 'escape'],
  dead: false,
  hp: 1000,
  escapeCounter: 0,
}

let player = {
  id: undefined
}

let gameState = {
  id: undefined,
  queue: [],
  queueCounter: 0,
  boss: cactaur,
  currentMessage: undefined
}

let gameLoop = (gameState) => {

}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    // someone disconnected
    // check number of players
  });

  socket.on('requestSlot', (playerId) => {
    // create player and return playerId with player number
  })

  setInterval(() => {
    console.log('tick')
    // call next turn
    io.emit('tick', 'tick');
  }, 1000)
});

http.listen(PORT, () => {
  console.log('listening on ', PORT);
});
