var GameRenderer = require('./renderer');

var WAITING = 'waiting';
var IN_PROGRESS = 'in-progress';
var ABANDONED = 'abandoned';
var FINISHED = 'finished';
var FINISHED_DRAW = 'finished-draw';

var Game = function (options) {
  this.socket = options.socket;
  this.id = null;
  this.status = WAITING;
  this.winner = null;
  this.myTeam = null;
  this.next = 'x';
  this.grid = [
    [
      null,
      null,
      null
    ],
    [
      null,
      null,
      null
    ],
    [
      null,
      null,
      null
    ]
  ];

  this.renderer = new GameRenderer({
    game: this,
    container: options.container
  });

  this.renderer.render();

  this.socket.addEventListener('open', this.join.bind(this));
  this.socket.addEventListener('message', handleMessage.bind(this));
};

Game.prototype.fillSquare = function (options) {
  this.socket.send(JSON.stringify({
    action: 'fillSquare',
    data: {
      coords: {
        x: options.x,
        y: options.y,
      },
      team: this.myTeam
    }
  }));
};

Game.prototype.join = function () {
  this.socket.send(JSON.stringify({
    action: 'joinGame',
    gameId: null
  }));
};

Game.prototype.leave = function () {
  this.socket.send(JSON.stringify({
    action: 'leaveGame',
    data: {
      team: this.myTeam
    }
  }));
};

var handleMessage = function (e) {
  var message;
  try {
    message = JSON.parse(e.data);
  } catch (error) {
    console.error('Received malformed JSON from server: ' + e.data);
    console.error(error.stack);
  }

  if (typeof handlers[message.action] === 'function') {
    handlers[message.action].bind(this)(message);
  }
};

var handlers = {
  joinGame: function (message) {
    this.id = message.data.gameId;
    this.myTeam = message.data.team;

    handlers.updateGameStatus.bind(this)({
      data: {
        status: (this.myTeam === 'x') ? WAITING : IN_PROGRESS
      }
    });

    // window.history.pushState({}, '', '/' + this.id);

    requestAnimationFrame(function () {
      document.getElementById('game-id').textContent = this.id;
      document.getElementById('game-team').textContent = this.myTeam.toUpperCase();
    }.bind(this));
  },
  updateGameStatus: function (message) {
    this.status = message.data.status;
    var statusString;

    switch(this.status) {
      case IN_PROGRESS:
        statusString = 'In progress';
      break;
      case WAITING:
        statusString = 'Waiting for opponent to join';
      break;
      case ABANDONED:
        statusString = 'Abandoned (a player left the game)';
      break;
      case FINISHED:
        statusString = 'Finished';
      break;
      case FINISHED_DRAW:
        statusString = 'Draw';
      break;
    }

    requestAnimationFrame(function () {
      document.getElementById('game-status').textContent = statusString;
    }.bind(this));
  },
  updateGrid: function (message) {
    this.grid = message.data.grid;
    this.renderer.render();
  },
  updateWinner: function (message) {
    this.winner = message.data.winner;
  }
};

module.exports = Game;