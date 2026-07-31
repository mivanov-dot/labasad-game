const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
  room: 1,            // 1: Lobby QR, 2: Mapa Oficina, 3: Reto Activo, 4: Resumen, 5: Despedida
  currentChallenge: 2,// 2: HubSpot, 3: SEO, 4: Siroko Coffee
  showIntro: false,
  inChallenge: false,
  players: {},
  winners: {}
};

io.on('connection', (socket) => {
  socket.on('join-game', (data) => {
    const pCount = Object.keys(gameState.players).length;
    const charNum = (pCount % 5) + 1; // Selecciona char1.png a char5.png
    
    // Posiciones fijas dentro de la oficina en pixel art
    const positions = [
      { x: 22, y: 68 }, { x: 42, y: 48 }, { x: 58, y: 48 },
      { x: 42, y: 78 }, { x: 58, y: 78 }, { x: 80, y: 58 }
    ];
    const pos = positions[pCount % positions.length];

    gameState.players[socket.id] = {
      id: socket.id,
      name: data.name || 'Jugador',
      charImg: `Personajes/char${charNum}.png`,
      x: pos.x,
      y: pos.y,
      taps: 0
    };
    io.emit('state', gameState);
  });

  socket.on('start-game', () => {
    if (gameState.room === 1) {
      gameState.room = 2; // Entrar a la oficina
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

        if (player.taps >= 100) {
          const achievements = {
            2: 'Especialista en Automatización & CRM',
            3: 'Líder de Protocolos & Estrategia SEO',
            4: 'Maestro Barista de Siroko ☕'
          };

          gameState.winners[ch] = {
            id: player.id,
            name: player.name,
            charImg: player.charImg,
            achievement: achievements[ch]
          };

          setTimeout(() => {
            gameState.inChallenge = false;
            Object.values(gameState.players).forEach(p => p.taps = 0);

            if (ch < 4) {
              gameState.currentChallenge += 1;
            } else {
              gameState.room = 4; // Resumen de aprendizajes
            }
            io.emit('state', gameState);
          }, 4000);
        }
      }
      io.emit('state', gameState);
    }
  });

  socket.on('next-room', () => {
    if (gameState.room === 4) gameState.room = 5;
    io.emit('state', gameState);
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    io.emit('state', gameState);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
