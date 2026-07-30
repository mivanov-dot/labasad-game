const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
  room: 1, // 1: Lobby, 2: Mapa Oficina, 3: Intro Reto, 4: Reto Taps, 5: Resumen, 6: Despedida
  currentChallenge: 2, // 2: HubSpot, 3: SEO, 4: Siroko
  showIntro: false,
  inChallenge: false,
  players: {},
  winners: {}
};

// Checkpoints en coordenadas del mapa de la oficina
const CHECKPOINTS = {
  2: { x: 220, y: 320, name: 'HubSpot & CRM' },
  3: { x: 580, y: 320, name: 'Redacción SEO' },
  4: { x: 400, y: 150, name: 'Siroko Coffee' }
};

const CHARACTERS = ['char1', 'char2', 'char3', 'char4'];

io.on('connection', (socket) => {
  socket.on('join-game', (data) => {
    const charIndex = Object.keys(gameState.players).length % CHARACTERS.length;
    gameState.players[socket.id] = {
      id: socket.id,
      name: data.name || 'Jugador',
      sprite: CHARACTERS[charIndex],
      x: 380 + Math.random() * 40,
      y: 240 + Math.random() * 40,
      moving: false,
      taps: 0
    };
    io.emit('state', gameState);
  });

  socket.on('start-game', () => {
    if (gameState.room === 1) {
      gameState.room = 2; // Ir al Mapa
      io.emit('state', gameState);
    }
  });

  socket.on('player-move', (dir) => {
    const player = gameState.players[socket.id];
    if (player && gameState.room === 2 && !gameState.showIntro && !gameState.inChallenge) {
      const speed = 5;
      player.x += dir.x * speed;
      player.y += dir.y * speed;
      player.moving = (dir.x !== 0 || dir.y !== 0);

      // Límites mapa
      player.x = Math.max(50, Math.min(750, player.x));
      player.y = Math.max(80, Math.min(420, player.y));

      // Comprobar si llega al checkpoint del reto activo
      const targetCP = CHECKPOINTS[gameState.currentChallenge];
      if (targetCP) {
        const dist = Math.hypot(player.x - targetCP.x, player.y - targetCP.y);
        if (dist < 45) {
          gameState.showIntro = true; // Activar pantalla de contexto
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

        if (player.taps >= 100) { // LÍMITE A 100 TAPS
          const achievements = {
            2: 'Especialista en Automatización & CRM',
            3: 'Líder de Protocolos & Estrategia SEO',
            4: 'Maestro Barista de Siroko ☕'
          };

          gameState.winners[ch] = {
            id: player.id,
            name: player.name,
            sprite: player.sprite,
            achievement: achievements[ch]
          };

          setTimeout(() => {
            gameState.inChallenge = false;
            Object.values(gameState.players).forEach(p => p.taps = 0);

            if (ch < 4) {
              gameState.currentChallenge += 1;
            } else {
              gameState.room = 5; // Resumen final
            }
            io.emit('state', gameState);
          }, 4000);
        }
      }
      io.emit('state', gameState);
    }
  });

  socket.on('next-room', () => {
    if (gameState.room === 5) gameState.room = 6;
    io.emit('state', gameState);
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    io.emit('state', gameState);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));
