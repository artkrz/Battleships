const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Debug endpoint to see active rooms
app.get('/api/rooms', (req, res) => {
    const roomList = [];
    rooms.forEach((room, code) => {
        roomList.push({
            code: code,
            hasHost: !!room.players.host,
            hasGuest: !!room.players.guest,
            gameStarted: room.gameStarted
        });
    });
    res.json({ rooms: roomList, count: roomList.length });
});

// Game rooms storage
const rooms = new Map();
const disconnectTimeouts = new Map(); // Track disconnect timeouts for reconnection grace period

// Generate random room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Create a new room
function createRoom(hostSocket) {
    let roomCode;
    do {
        roomCode = generateRoomCode();
    } while (rooms.has(roomCode));
    
    const room = {
        code: roomCode,
        players: {
            host: {
                id: hostSocket.id,
                ready: false,
                board: null,
                ships: null,
                shipsRemaining: 5,
                shots: 0,
                hits: 0
            },
            guest: null
        },
        score: {
            host: 0,
            guest: 0
        },
        currentTurn: 'host',
        gameStarted: false,
        gameOver: false
    };
    
    rooms.set(roomCode, room);
    return room;
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Create a new room
    socket.on('create-room', () => {
        const room = createRoom(socket);
        socket.join(room.code);
        socket.roomCode = room.code;
        socket.playerRole = 'host';
        
        socket.emit('room-created', { roomCode: room.code });
        console.log(`Room created: ${room.code} by ${socket.id}`);
    });
    
    // Join an existing room
    socket.on('join-room', (roomCode) => {
        const code = roomCode.toUpperCase();
        const room = rooms.get(code);
        
        if (!room) {
            socket.emit('join-error', { message: 'Pokój nie istnieje' });
            return;
        }
        
        if (room.players.guest) {
            socket.emit('join-error', { message: 'Pokój jest pełny' });
            return;
        }
        
        if (room.gameStarted) {
            socket.emit('join-error', { message: 'Gra już się rozpoczęła' });
            return;
        }
        
        // Add guest to room
        room.players.guest = {
            id: socket.id,
            ready: false,
            board: null,
            ships: null,
            shipsRemaining: 5,
            shots: 0,
            hits: 0
        };
        
        socket.join(code);
        socket.roomCode = code;
        socket.playerRole = 'guest';
        
        socket.emit('room-joined', { roomCode: code });
        
        // Notify host that guest joined
        const hostSocket = room.players.host.id;
        io.to(hostSocket).emit('opponent-joined');
        
        // Both players can now setup their boards
        io.to(code).emit('start-setup');
        
        console.log(`Player ${socket.id} joined room ${code}`);
    });
    
    // Player is ready with their board
    socket.on('player-ready', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        
        const playerRole = socket.playerRole;
        const player = room.players[playerRole];
        
        if (player) {
            player.ready = true;
            player.board = data.board;
            player.ships = data.ships;
            
            // Notify opponent that player is ready
            socket.to(socket.roomCode).emit('opponent-ready');
            
            // Check if both players are ready
            if (room.players.host.ready && room.players.guest && room.players.guest.ready) {
                room.gameStarted = true;
                room.currentTurn = 'host';
                
                // Notify both players to start the game
                io.to(room.players.host.id).emit('game-start', { 
                    isYourTurn: true,
                    playerRole: 'host'
                });
                io.to(room.players.guest.id).emit('game-start', { 
                    isYourTurn: false,
                    playerRole: 'guest'
                });
                
                console.log(`Game started in room ${socket.roomCode}`);
            }
        }
    });
    
    // Handle attack
    socket.on('attack', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.gameOver) return;
        
        const playerRole = socket.playerRole;
        
        // Verify it's the player's turn
        if (room.currentTurn !== playerRole) {
            socket.emit('not-your-turn');
            return;
        }
        
        const opponentRole = playerRole === 'host' ? 'guest' : 'host';
        const opponent = room.players[opponentRole];
        const attacker = room.players[playerRole];
        
        if (!opponent || !opponent.board) return;
        
        const { row, col } = data;
        const targetCell = opponent.board[row][col];
        
        // Check if already hit
        if (targetCell.isHit) {
            socket.emit('invalid-attack');
            return;
        }
        
        // Mark as hit
        targetCell.isHit = true;
        attacker.shots++;
        
        let result = {
            row,
            col,
            isHit: targetCell.hasShip,
            shipId: targetCell.shipId,
            isSunk: false,
            sunkShip: null,
            gameOver: false,
            winner: null
        };
        
        if (targetCell.hasShip) {
            attacker.hits++;
            
            // Find the ship and check if sunk
            const ship = opponent.ships.find(s => s.id === targetCell.shipId);
            if (ship) {
                ship.hits++;
                if (ship.hits === ship.size) {
                    ship.isSunk = true;
                    opponent.shipsRemaining--;
                    result.isSunk = true;
                    result.sunkShip = ship;
                    
                    // Mark adjacent cells as revealed
                    ship.cells.forEach(([r, c]) => {
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                const nr = r + dr;
                                const nc = c + dc;
                                if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
                                    opponent.board[nr][nc].isHit = true;
                                }
                            }
                        }
                    });
                    
                    // Check for game over
                    if (opponent.shipsRemaining === 0) {
                        room.gameOver = true;
                        result.gameOver = true;
                        result.winner = playerRole;
                        
                        // Update score
                        room.score[playerRole]++;
                        result.score = room.score;
                        
                        result.stats = {
                            winner: {
                                shots: attacker.shots,
                                hits: attacker.hits
                            },
                            loser: {
                                shots: opponent.shots,
                                hits: opponent.hits
                            }
                        };
                    }
                }
            }
        }
        
        // Send result to attacker
        socket.emit('attack-result', result);
        
        // Send to opponent
        socket.to(socket.roomCode).emit('opponent-attacked', result);
        
        // Switch turns if game not over
        if (!room.gameOver) {
            room.currentTurn = opponentRole;
            io.to(room.players[playerRole].id).emit('turn-change', { isYourTurn: false });
            io.to(room.players[opponentRole].id).emit('turn-change', { isYourTurn: true });
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        
        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                const playerRole = socket.playerRole;
                
                // Only delete room after grace period (30 seconds)
                // This allows for page refreshes and brief disconnections
                const timeoutKey = `${socket.roomCode}-${playerRole}`;
                
                const timeout = setTimeout(() => {
                    const currentRoom = rooms.get(socket.roomCode);
                    if (currentRoom) {
                        // Notify opponent if they're still connected
                        io.to(socket.roomCode).emit('opponent-disconnected');
                        
                        // Only delete if game hasn't started or if both players disconnected
                        if (!currentRoom.gameStarted || 
                            (playerRole === 'host' && !currentRoom.players.guest) ||
                            (playerRole === 'guest')) {
                            rooms.delete(socket.roomCode);
                            console.log(`Room ${socket.roomCode} deleted after timeout`);
                        }
                    }
                    disconnectTimeouts.delete(timeoutKey);
                }, 30000); // 30 second grace period
                
                disconnectTimeouts.set(timeoutKey, timeout);
                console.log(`Disconnect timeout started for ${socket.roomCode} (${playerRole})`);
            }
        }
    });
    
    // Reconnect to existing room
    socket.on('reconnect-room', (data) => {
        const { roomCode, playerRole } = data;
        const code = roomCode.toUpperCase();
        const room = rooms.get(code);
        
        if (!room) {
            socket.emit('reconnect-error', { message: 'Pokój nie istnieje' });
            return;
        }
        
        // Cancel any pending disconnect timeout
        const timeoutKey = `${code}-${playerRole}`;
        if (disconnectTimeouts.has(timeoutKey)) {
            clearTimeout(disconnectTimeouts.get(timeoutKey));
            disconnectTimeouts.delete(timeoutKey);
            console.log(`Reconnect timeout cancelled for ${code} (${playerRole})`);
        }
        
        // Update socket id for the player
        if (playerRole === 'host' && room.players.host) {
            room.players.host.id = socket.id;
        } else if (playerRole === 'guest' && room.players.guest) {
            room.players.guest.id = socket.id;
        }
        
        socket.join(code);
        socket.roomCode = code;
        socket.playerRole = playerRole;
        
        socket.emit('reconnect-success', { room: room });
        console.log(`Player ${socket.id} reconnected to room ${code} as ${playerRole}`);
    });
    
    // Leave room
    socket.on('leave-room', () => {
        if (socket.roomCode) {
            const room = rooms.get(socket.roomCode);
            if (room) {
                socket.to(socket.roomCode).emit('opponent-disconnected');
                rooms.delete(socket.roomCode);
            }
            socket.leave(socket.roomCode);
            socket.roomCode = null;
            socket.playerRole = null;
        }
    });
    
    // Request rematch (play again in same room)
    socket.on('request-rematch', () => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        
        const playerRole = socket.playerRole;
        room.players[playerRole].wantsRematch = true;
        
        console.log(`${playerRole} requested rematch in room ${socket.roomCode}`);
        
        // Notify opponent
        socket.to(socket.roomCode).emit('rematch-requested');
        
        // Check if both want rematch
        const host = room.players.host;
        const guest = room.players.guest;
        
        if (host && guest && host.wantsRematch && guest.wantsRematch) {
            // Reset game state
            room.gameStarted = false;
            room.gameOver = false;
            room.currentTurn = 'host';
            
            // Reset player states
            ['host', 'guest'].forEach(role => {
                const player = room.players[role];
                if (player) {
                    player.ready = false;
                    player.board = null;
                    player.ships = null;
                    player.shipsRemaining = 5;
                    player.shots = 0;
                    player.hits = 0;
                    player.wantsRematch = false;
                }
            });
            
            // Notify both players to start setup
            io.to(socket.roomCode).emit('rematch-start', { score: room.score });
            console.log(`Rematch started in room ${socket.roomCode}`);
        }
    });
    
    // Cancel rematch request
    socket.on('cancel-rematch', () => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        
        const playerRole = socket.playerRole;
        room.players[playerRole].wantsRematch = false;
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚢 Statki server running on http://localhost:${PORT}`);
});
