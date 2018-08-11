const app = require('express')();
const express = require('express')
const path = require('path')
var http = require('http').Server(app);
var io = require('socket.io')(http);
// https://github.com/heroku/node-js-getting-started
// https://socket.io/get-started/chat

app.use(express.static('public'))

const PORT = process.env.PORT || 5000

let cactaurTemplate = {
  name: 'Cactaur',
  attack: '100',
  actions: ['100 needles', '10 needles', '1 needle', 'Cactaur is thinking about an escape!'], // add an easy attack to help win?
  escapes: ['knows it\'s time escape!', 'is packing its needles!', 'is turning around!'],
  dead: false,
  hp: 1000,
  maxHp: 1000,
  escapeCounter: 0,
  '100 needles': 100,
  '10 needles': 10,
  '1 needle': 1,
}
let cactaur = Object.assign({}, cactaurTemplate);
let gameStateTemplate = {
  id: 'multi',
  queue: ['boss'],
  queueCounter: 0,
  playerActions: [],
  playerDeaths: 0,
  actionCounter: 0,
  boss: cactaur,
  currentMessage: 'Waiting For Players!',
  playerMap: {},
  win: false,
  lose: false,
  gameover: false,
  started: false,
  nextPlayer: '',
  bossMsg: '',
}
let gameState = Object.assign({}, gameStateTemplate);

// game loop logic
let bossTurn = (gameState) => {
  if (gameState.boss.escapeCounter === 3) {
    gameState.bossMsg = 'Cactaur ran away!'
    gameState.lose = true;
    return gameState;
  }
  // determine if boss is under 50%;
  if (gameState.boss.hp <= (gameState.boss.maxHp / 2)) {
    // activate escape counter
    console.log('escape counter increment')
    gameState.bossMsg = 'Cactaur ' + gameState.boss.escapes[gameState.boss.escapeCounter];
    gameState.boss.escapeCounter += 1;
    gameState.queueCounter += 1;
    return gameState;
  }
  // based on queue minus 0 index
  let randomAction = gameState.boss.actions[Math.floor(Math.random() * (gameState.boss.actions.length))];
  let randomTarget = Math.floor(Math.random() * (gameState.queue.length - 1) + 1);
  console.log(randomAction, randomTarget)
  if (gameState.boss[randomAction]) {
    let dmg = gameState.boss[randomAction];
    let playerToDmg = gameState.playerMap[gameState.queue[randomTarget]];
    playerToDmg.hp -= dmg;
    gameState.bossMsg = 'Cactaur used ' + randomAction + '! Player ' + playerToDmg.number + ' was damaged for ' + dmg + 'HP!'
    gameState.queueCounter += 1;
    console.log(playerToDmg, dmg, gameState.currentMessage)
  }
  return gameState
}
let playerTurn = (gameState, playerKey) => {
  // process action array
  let action = gameState.playerActions[gameState.actionCounter];
  if (action.dmg) {
    gameState.boss.hp -= action.dmg;
  } else if (action.heal) {
    gameState.playerMap[playerKey].hp += action.heal;
    if (gameState.playerMap[playerKey].hp > gameState.playerMap[playerKey].maxHp) {
      gameState.playerMap[playerKey].hp = gameState.playerMap[playerKey].maxHp
    }
  }
  gameState.currentMessage = action.msg;
  gameState.actionCounter += 1;
  gameState.queueCounter += 1;
  if (gameState.queueCounter >= gameState.queue.length) {
    gameState.queueCounter = 0;
    console.log('boss turn')
  }
  console.log('PLAYERRUN', gameState.currentMessage)
  return gameState;
}
let gameLoop = (gameState) => {
  // check for gameovers
  if (gameState.lose || gameState.playerDeaths === gameState.queue.length - 1) {
    gameState.gameover = true;
    gameState.lose = true;
    return gameState;
  } else if (gameState.boss.hp <= 0) {
    gameState.gameover = true;
    gameState.win = true;
    return gameState;
  }

  var nextTurnKey = gameState.queue[gameState.queueCounter]
  // check for dead players
  if (gameState.playerMap[nextTurnKey]) {
    // player exists
    let player = gameState.playerMap[nextTurnKey];
    // check hp
    if (player.hp <= 0 && player.alive) {
      gameState.currentMessage = 'Player ' + player.number + ' has died!';
      player.alive = false;
      gameState.queueCounter += 1;
      gameState.playerDeaths += 1;
      return gameState;
    } else if (!player.alive) {
      gameState.queueCounter += 1;
      return gameState;
    }
  }
  console.log(nextTurnKey)
  let playerAction = gameState.playerActions[gameState.actionCounter];
  if (nextTurnKey === 'boss') {
    gameState.bossMsg = 'Cactaur is up...!'
    return bossTurn(gameState);
  } else if (playerAction && playerAction.owner === nextTurnKey) {
    console.log('action found')
    return playerTurn(gameState, nextTurnKey);
  } else {
    // gameState.currentMessage = 'Waiting for Player ' + gameState.playerMap[nextTurnKey].number;
    gameState.nextPlayer = nextTurnKey;
    return gameState;
  }
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('startBattle', () => {
    gameState.started = true;
  })

  socket.on('requestSlot', (json) => {
    let player = JSON.parse(json);
    gameState.queue.push(player.id);
    gameState.playerMap[player.id] = player;
    console.log('json', gameState.queue)
  });
  socket.on('playerAction', (json) => {
    console.log('action', json)
    let action = JSON.parse(json);
    let lastAction = gameState.playerActions[gameState.playerActions.length - 1];
    if (gameState.queue.length - gameState.playerDeaths === 2) {
      gameState.playerActions.push(action)
    } else if (lastAction && lastAction.owner !== action.owner) {
      gameState.playerActions.push(action)
    } else if (gameState.playerActions.length === 0) {
      gameState.playerActions.push(action)
    }
    console.log(gameState.playerActions)
  })

  socket.on('disconnect', () => {
    // someone disconnected
    // check number of players
  });

  let game = setInterval(() => {
    // call next turn
    let newState = gameState;
    if (!gameState.started) {
      // newState = gameState;
    }
    if (gameState.started) {
      newState = gameLoop(gameState);
    }
    if (gameState.gameover) {
      console.log('game ended');
      gameState = Object.assign({}, gameStateTemplate);
      cactaur = Object.assign({}, cactaurTemplate);
    }
    let json = JSON.stringify(newState);
    io.emit('tick', json);
  }, 1000)
});

http.listen(PORT, () => {
  console.log('listening on ', PORT);
});
