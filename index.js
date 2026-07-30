const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

// ESTADO GLOBAL DEL JUEGO
let gameState = {
  room: 1,            // 1: Mapa Oficina, 2: Reto HubSpot, 3: Reto SEO, 4: Reto Siroko, 5: Resumen, 6: Despedida
  inChallenge: false, // Indica si están dentro del minijuego de toques
  players: {},
  winners: {}
};

// Límites del mapa (en píxeles)
const MAP_WIDTH = 800;
const MAP_HEIGHT = 500;

// Posición del Rombo Interactivo en el mapa
const CHECKPOINT = { x: 400, y: 150, radius: 50 };

io.on('connection', (socket) => {
  console.log('Jugador conectado:', socket.id);

  socket.on('join-game', (data) => {
    gameState.players[socket.id] = {
      id: socket.id,
      name: data.name || 'Jugador',
      avatar: data.avatar || '🕹️',
      x: 350 + Math.random() * 100, // Aparecen en el centro de la oficina
      y: 350 + Math.random() * 50,
      taps: 0,
      onFire: false
    };
    io.emit('state', gameState);
  });

  // MOVIMIENTO CON JOYSTICK
  socket.on('player-move', (dir) => {
    const player = gameState.players[socket.id];
    if (player && gameState.room === 1 && !gameState.inChallenge) {
      const speed = 4;
      player.x += dir.x * speed;
      player.y += dir.y * speed;

      // Limitar a los bordes de la pantalla
      player.x = Math.max(30, Math.min(MAP_WIDTH - 30, player.x));
      player.y = Math.max(30, Math.min(MAP_HEIGHT - 30, player.y));

      // Detección de colisión con el Rombo Interactivo
      const dist = Math.hypot(player.x - CHECKPOINT.x, player.y - CHECKPOINT.y);
      if (dist < CHECKPOINT.radius) {
        // Al tocar el rombo, entran al reto
        gameState.inChallenge = true;
        gameState.room = 2; // Primer reto: HubSpot
      }

      io.emit('state', gameState);
    }
  });

  // RETO DE PULSACIONES (TAPS)
  socket.on('tap', () => {
    const player = gameState.players[socket.id];
    if (player && gameState.inChallenge && gameState.room >= 2 && gameState.room <= 4) {
      if (!gameState.winners[gameState.room]) {
        player.taps += 1;
        if (player.taps >= 25) player.onFire = true;

        // ¿Ganador de la sala?
        if (player.taps >= 50) {
          const achievements = {
            2: 'Máster en Email Marketing & Secuencias',
            3: 'Redactor SEO Senior & Polser Pro',
            4: 'Barista de Siroko: Pulso de Acero ☕'
          };
          
          gameState.winners[gameState.room] = {
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            achievement: achievements[gameState.room]
          };

          // Pasar al siguiente nivel automáticamente tras 3.5 seg
          setTimeout(() => {
            if (gameState.room === 4) {
              gameState.room = 5; // Ir a resumen
              gameState.inChallenge = false;
            } else {
              gameState.room += 1; // Siguiente reto
              // Resetear toques de los jugadores para el siguiente reto
              Object.values(gameState.players).forEach(p => { p.taps = 0; p.onFire = false; });
            }
            io.emit('state', gameState);
          }, 3500);
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
server.listen(PORT, () => console.log(`Servidor 2D en puerto ${PORT}`));
