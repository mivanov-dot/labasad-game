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

// Coordenadas del rombo animado según el reto activo (Escala 800x500)
const CHECKPOINTS = {
  2: { x: 200, y: 150, name: 'Oficina HubSpot & CRM' },
  3: { x: 600, y: 150, name: 'Redacción SEO & Blog' },
  4: { x: 400, y: 380, name: 'Terraza Siroko Coffee' }
};

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

  socket.on('trigger-checkpoint', () => {
    if (gameState.room === 2 && !gameState.showIntro && !gameState.inChallenge) {
      gameState.showIntro = true;
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

        // META DE 100 PULSACIONES
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
              gameState.room = 3; // Ir al Resumen Final
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
server.listen(PORT, () => console.log(`Servidor LABASAD Quest activo en puerto ${PORT}`));
