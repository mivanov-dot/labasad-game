const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const TAP_GOAL = 50;

// Salas: 1 Recepción | 2 HubSpot | 3 SEO/Polser | 4 Siroko Coffee | 5 Resumen | 6 Despedida
const CHALLENGE_ROOMS = [2, 3, 4];

const ACHIEVEMENTS = {
  2: 'Aprendiz de HubSpot',
  3: 'Maestro del Algoritmo y Guardián de Polser',
  4: 'Adicto al Café'
};

let gameState = {
  room: 1,
  players: {},   // socket.id -> { id, name, avatar, taps, achievements: [], onFire }
  winners: {}    // roomNumber -> { id, name, avatar, achievement }
};

app.use(express.static(path.join(__dirname, 'public')));

function broadcast() {
  io.emit('state', gameState);
}

function resetTapsForChallenge() {
  Object.values(gameState.players).forEach(p => { p.taps = 0; });
}

function advanceRoom() {
  if (gameState.room >= 6) return;
  gameState.room += 1;
  if (CHALLENGE_ROOMS.includes(gameState.room)) {
    resetTapsForChallenge();
  }
  broadcast();
}

function registerWinner(room, player) {
  if (gameState.winners[room]) return; // ya hay ganador, evitar duplicados
  const achievement = ACHIEVEMENTS[room] || null;

  gameState.winners[room] = {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    achievement
  };

  if (achievement) player.achievements.push(achievement);
  if (room === 4) player.onFire = true;

  broadcast();
  setTimeout(advanceRoom, 4000); // pequeña pausa para celebrar antes de avanzar
}

io.on('connection', (socket) => {

  socket.on('join-player', ({ name, avatar }) => {
    gameState.players[socket.id] = {
      id: socket.id,
      name: (name || 'Jugador').toString().substring(0, 14),
      avatar: avatar || '🧑‍💻',
      taps: 0,
      achievements: [],
      onFire: false
    };
    socket.emit('joined', gameState.players[socket.id]);
    broadcast();
  });

  socket.on('start-game', () => {
    if (gameState.room === 1) advanceRoom();
  });

  socket.on('tap', () => {
    const player = gameState.players[socket.id];
    if (!player) return;
    if (!CHALLENGE_ROOMS.includes(gameState.room)) return;
    if (gameState.winners[gameState.room]) return; // el reto ya se ganó

    player.taps += 1;

    if (player.taps >= TAP_GOAL) {
      registerWinner(gameState.room, player);
    } else {
      broadcast();
    }
  });

  socket.on('next-room', () => {
    advanceRoom();
  });

  socket.on('restart-game', () => {
    gameState = { room: 1, players: {}, winners: {} };
    broadcast();
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    broadcast();
  });
});

server.listen(PORT, () => {
  console.log(`🏢 LABASAD Office Quest escuchando en el puerto ${PORT}`);
});
