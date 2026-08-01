const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
  room: 1,            // 1: Lobby QR, 2: Mapa Oficina, 3: Resumen, 4: Despedida
  currentChallenge: 2,// 2: HubSpot, 3: SEO, 4: Siroko Coffee
  showIntro: false,
  inChallenge: false,
  players: {},
  winners: {}
};

const MAP_WIDTH = 850;
const MAP_HEIGHT = 520;

io.on('connection', (socket) => {
  socket.on('join-game', (data) => {
    gameState.players[socket.id] = {
      id: socket.id,
      name: data.name || 'Jugador',
      avatar: data.avatar || '🕹️',
      role: data.role || 'Equipo LABASAD',
      x: 360 + Math.random() * 80,
      y: 230 + Math.random() * 40,
      taps: 0
    };
    io.emit('state', gameState);
  });

  socket.on('start-game', () => {
    if (gameState.room === 1) {
      gameState.room = 2;
      io.emit('state', gameState);
    }
  });

  // MOVIMIENTO CON JOYSTICK (CÓDIGO ULTRA FLUIDO QUE TE FUNCIONABA)
  socket.on('player-move', (dir) => {
    const player = gameState.players[socket.id];
    if (player && gameState.room === 2 && !gameState.showIntro && !gameState.inChallenge) {
      const speed = 5;
      player.x += (dir.x || 0) * speed;
      player.y += (dir.y || 0) * speed;

      // Limitar a los bordes del mapa
      player.x = Math.max(30, Math.min(MAP_WIDTH - 30, player.x));
      player.y = Math.max(30, Math.min(MAP_HEIGHT - 30, player.y));

      // Comprobar colisión con el rombo del reto activo
      const cpCoords = {
        2: { x: 150, y: 110 },
        3: { x: 710, y: 110 },
        4: { x: 425, y: 400 }
      };
      const cp = cpCoords[gameState.currentChallenge];

      if (cp) {
        const dist = Math.hypot(player.x - cp.x, player.y - cp.y);
        if (dist < 40) {
          gameState.showIntro = true; // Activa la ventana centrada
        }
      }

      io.emit('state', gameState);
    }
  });

  socket.on('confirm-intro', () => {
    gameState.showIntro = false;
    gameState.inChallenge = true;
    io.emit('state', gameState);
  });

  socket.on('tap', () => {
    const player = gameState.players[socket.id];
    if (player && gameState.inChallenge) {
      const ch = gameState.currentChallenge;
      if (!gameState.winners[ch]) {
        player.taps += 1;

        if (player.taps >= 100) {
          const achievements = {
            2: 'Máster en Automatización & Secuencias CRM',
            3: 'Líder en Protocolo SEO & Redacción Blog',
            4: 'Barista Pro Siroko: Pulso de Acero ☕'
          };

          gameState.winners[ch] = {
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            role: player.role,
            achievement: achievements[ch]
          };

          setTimeout(() => {
            gameState.inChallenge = false;
            Object.values(gameState.players).forEach(p => p.taps = 0);

            if (ch < 4) {
              gameState.currentChallenge += 1;
            } else {
              gameState.room = 3;
            }
            io.emit('state', gameState);
          }, 3500);
        }
      }
      io.emit('state', gameState);
    }
  });

  socket.on('next-room', () => {
    if (gameState.room === 3) gameState.room = 4;
    io.emit('state', gameState);
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    io.emit('state', gameState);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
