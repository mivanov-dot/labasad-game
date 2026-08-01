// Constantes del mapa (al inicio del archivo index.js)
const MAP_WIDTH = 850;
const MAP_HEIGHT = 520;

// Escuchador de movimiento del Joystick
socket.on('player-move', (dir) => {
  const player = gameState.players[socket.id];
  if (player && gameState.room === 2 && !gameState.showIntro && !gameState.inChallenge) {
    const speed = 4;
    player.x += dir.x * speed;
    player.y += dir.y * speed;

    // Limitar a los bordes de la pantalla
    player.x = Math.max(30, Math.min(MAP_WIDTH - 30, player.x));
    player.y = Math.max(30, Math.min(MAP_HEIGHT - 30, player.y));

    // Obtener la posición del rombo según el reto activo
    const cpCoords = {
      2: { x: 150, y: 110 },
      3: { x: 710, y: 110 },
      4: { x: 425, y: 400 }
    };
    const cp = cpCoords[gameState.currentChallenge];

    // Detección de colisión con el Rombo Interactivo (radio de 40px)
    if (cp) {
      const dist = Math.hypot(player.x - cp.x, player.y - cp.y);
      if (dist < 40) {
        gameState.showIntro = true; // Abre la ventana explicativa centrada
      }
    }

    io.emit('state', gameState);
  }
});
