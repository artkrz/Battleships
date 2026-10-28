// Game Configuration
const SHIPS_STANDARD = [
    { name: 'Lotniskowiec', size: 5, id: 'carrier' },
    { name: 'Pancernik', size: 4, id: 'battleship' },
    { name: 'Krążownik', size: 3, id: 'cruiser' },
    { name: 'Łódź podwodna', size: 3, id: 'submarine' },
    { name: 'Niszczyciel', size: 2, id: 'destroyer' }
];

// Double ships for 20x20 mode
// Double ships for 15x15 mode
const SHIPS_LARGE = [
    { name: 'Lotniskowiec 1', size: 5, id: 'carrier1' },
    { name: 'Lotniskowiec 2', size: 5, id: 'carrier2' },
    { name: 'Pancernik 1', size: 4, id: 'battleship1' },
    { name: 'Pancernik 2', size: 4, id: 'battleship2' },
    { name: 'Krążownik 1', size: 3, id: 'cruiser1' },
    { name: 'Krążownik 2', size: 3, id: 'cruiser2' },
    { name: 'Łódź podwodna 1', size: 3, id: 'submarine1' },
    { name: 'Łódź podwodna 2', size: 3, id: 'submarine2' },
    { name: 'Niszczyciel 1', size: 2, id: 'destroyer1' },
    { name: 'Niszczyciel 2', size: 2, id: 'destroyer2' }
];

// Game options (configurable)
const gameOptions = {
    gridSize: 10,
    shootAgainOnHit: true,
    turnTimer: 0 // 0 = disabled, otherwise seconds
};

// Dynamic getters
function getGridSize() {
    return gameOptions.gridSize;
}

function getShips() {
    return gameOptions.gridSize === 15 ? SHIPS_LARGE : SHIPS_STANDARD;
}

function getShipCount() {
    return getShips().length;
}

// ================== SOUND SYSTEM ==================
let audioContext = null;
const soundBuffers = new Map();
let soundBus;
let soundsMuted = false;
let combatSoundUntil = 0;
let pendingTurnChange = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const limiter = audioContext.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.ratio.value = 8;
        soundBus = audioContext.createGain();
        soundBus.gain.value = soundsMuted ? 0 : 0.5;
        soundBus.connect(limiter);
        limiter.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
}

function loadSound(type) {
    if (!soundBuffers.has(type)) {
        soundBuffers.set(type, fetch(`assets/audio/${type}.wav?v=3`)
            .then(response => {
                if (!response.ok) throw new Error('Audio unavailable');
                return response.arrayBuffer();
            })
            .then(data => audioContext.decodeAudioData(data))
            .catch(() => { soundBuffers.delete(type); return null; }));
    }
    return soundBuffers.get(type);
}

async function playSound(type) {
    initAudio();
    if (soundsMuted) return;
    const buffer = await loadSound(type);
    if (!buffer || soundsMuted || audioContext.state !== 'running') return;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(soundBus);
    // Let the final sinking impact finish before the quiet end-of-game cue.
    const when = ['win', 'lose'].includes(type) ? Math.max(audioContext.currentTime, combatSoundUntil) : audioContext.currentTime;
    source.start(when);
    if (['hit', 'miss', 'sunk'].includes(type)) combatSoundUntil = when + buffer.duration;
    source.onended = () => source.disconnect();
}

document.getElementById('sound-toggle').addEventListener('click', event => {
    soundsMuted = !soundsMuted;
    if (soundBus) soundBus.gain.value = soundsMuted ? 0 : 0.5;
    event.currentTarget.textContent = soundsMuted ? 'Dźwięk: wył.' : 'Dźwięk: wł.';
    event.currentTarget.setAttribute('aria-pressed', String(soundsMuted));
});
document.addEventListener('pointerdown', () => {
    initAudio();
    ['hit', 'miss', 'sunk', 'place', 'turn', 'win', 'lose'].forEach(loadSound);
}, { once: true });

// Game State
const gameState = {
    mode: 'local', // 'local' or 'online'
    currentPlayer: 1,
    phase: 'start',
    isHorizontal: true,
    selectedShip: null,
    players: {
        1: { board: [], ships: [], shipsRemaining: 5, shots: 0, hits: 0 },
        2: { board: [], ships: [], shipsRemaining: 5, shots: 0, hits: 0 }
    },
    hasAttacked: false,
    // Online specific
    socket: null,
    roomCode: null,
    playerRole: null, // 'host' or 'guest'
    isMyTurn: false,
    opponentReady: false,
    myBoard: null,
    myShips: null,
    enemyBoardState: null, // Track what we know about enemy board
    roomScore: { host: 0, guest: 0 }, // Track wins in the room
    // Timer
    turnTimerId: null,
    turnTimeRemaining: 0
};

// Initialize boards
function initializeBoard() {
    const board = [];
    for (let i = 0; i < getGridSize(); i++) {
        board[i] = [];
        for (let j = 0; j < getGridSize(); j++) {
            board[i][j] = { hasShip: false, shipId: null, isHit: false };
        }
    }
    return board;
}

// DOM Elements
const screens = {
    start: document.getElementById('start-screen'),
    options: document.getElementById('options-screen'),
    lobby: document.getElementById('lobby-screen'),
    waiting: document.getElementById('waiting-screen'),
    setup: document.getElementById('setup-screen'),
    transition: document.getElementById('transition-screen'),
    onlineWaiting: document.getElementById('online-waiting-screen'),
    game: document.getElementById('game-screen'),
    gameover: document.getElementById('gameover-screen')
};

// Screen Management
function showScreen(screenName) {
    if (screenName !== 'game') {
        stopTimer();
        clearTimeout(pendingTurnChange);
        pendingTurnChange = null;
    }
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
    gameState.phase = screenName;
}

// ================== SOCKET.IO SETUP ==================
function initializeSocket() {
    if (gameState.socket) return;
    
    gameState.socket = io();
    
    gameState.socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    gameState.socket.on('room-created', (data) => {
        gameState.roomCode = data.roomCode;
        gameState.playerRole = 'host';
        document.getElementById('room-code').textContent = data.roomCode;
        showScreen('waiting');
        // Generate QR code for easy joining
        generateQRCode(data.roomCode);
    });
    
    gameState.socket.on('room-joined', (data) => {
        gameState.roomCode = data.roomCode;
        gameState.playerRole = 'guest';

        // Apply options from host
        if (data.options) {
            gameOptions.gridSize = data.options.gridSize;
            gameOptions.shootAgainOnHit = data.options.shootAgainOnHit;
            gameOptions.turnTimer = data.options.turnTimer;
        }
    });
    
    gameState.socket.on('join-error', (data) => {
        alert(data.message);
    });
    
    gameState.socket.on('opponent-joined', () => {
        // Host sees this - opponent joined
    });
    
    gameState.socket.on('start-setup', (data) => {
        // Apply options if provided (for guest)
        if (data && data.options) {
            gameOptions.gridSize = data.options.gridSize;
            gameOptions.shootAgainOnHit = data.options.shootAgainOnHit;
            gameOptions.turnTimer = data.options.turnTimer;
        }
        startOnlineSetup();
    });
    
    gameState.socket.on('opponent-ready', () => {
        gameState.opponentReady = true;
    });
    
    gameState.socket.on('game-start', (data) => {
        gameState.isMyTurn = data.isYourTurn;
        gameState.playerRole = data.playerRole;
        startOnlineBattle();
        if (data.isYourTurn) {
            playSound('turn');
            startTimer();
        }
    });
    
    gameState.socket.on('attack-result', (result) => {
        handleAttackResult(result);
    });
    
    gameState.socket.on('opponent-attacked', (result) => {
        handleOpponentAttack(result);
    });
    
    gameState.socket.on('turn-change', (data) => {
        gameState.isMyTurn = data.isYourTurn;
        updateOnlineGameUI();

        if (data.isYourTurn) {
            if (!data.restartTimer) {
            // New turn - play sound
                playSound('turn');
            }
            startTimer();
        } else {
            stopTimer();
        }
    });
    
    gameState.socket.on('opponent-disconnected', () => {
        alert('Przeciwnik rozłączył się');
        leaveRoom();
        showScreen('start');
    });
    
    gameState.socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
    
    // Rematch handling
    gameState.socket.on('rematch-requested', () => {
        // Opponent wants rematch - auto-accept if we're on gameover screen waiting
        if (gameState.waitingForRematch) {
            // We're already waiting, this shouldn't happen but handle it
        } else {
            // Show that opponent wants to play again
            const btn = document.getElementById('play-again-btn');
            btn.textContent = '✓ Przeciwnik chce rewanżu - kliknij!';
            btn.classList.add('rematch-ready');
        }
    });
    
    gameState.socket.on('rematch-start', (data) => {
        // Both players agreed to rematch
        const btn = document.getElementById('play-again-btn');
        btn.textContent = 'Zagraj ponownie';
        btn.disabled = false;
        btn.classList.remove('rematch-ready');
        
        // Update score from server
        if (data && data.score) {
            gameState.roomScore = data.score;
        }
        
        // Apply options if provided
        if (data && data.options) {
            gameOptions.gridSize = data.options.gridSize;
            gameOptions.shootAgainOnHit = data.options.shootAgainOnHit;
            gameOptions.turnTimer = data.options.turnTimer;
        }

        // Reset and start setup
        startOnlineSetup();
    });
}

// ================== CREATE GRID ==================
function createGrid(containerId, isSetup = false, isEnemy = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    // Set grid size dynamically
    const gridSize = getGridSize();

    // Update body class and CSS variable for cell size
    if (gridSize === 15) {
        document.body.classList.add('large-grid');
        document.body.classList.remove('standard-grid');
        // Set cell size directly for 15x15 grid to fit on screen
        // 15 cells + gaps need to fit in ~95vw
        document.documentElement.style.setProperty('--cell-size', 'min(6vw, 24px)');
    } else {
        document.body.classList.add('standard-grid');
        document.body.classList.remove('large-grid');
        document.documentElement.style.setProperty('--cell-size', 'min(9vw, 36px)');
    }

    container.style.gridTemplateColumns = `repeat(${gridSize}, var(--cell-size))`;
    container.style.gridTemplateRows = `repeat(${gridSize}, var(--cell-size))`;
    container.dataset.gridSize = gridSize;

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            if (isSetup) {
                cell.addEventListener('click', () => handleSetupClick(row, col));
                cell.addEventListener('mouseenter', () => showShipPreview(row, col));
                cell.addEventListener('mouseleave', clearPreview);
                cell.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    showShipPreview(row, col);
                }, { passive: false });
                cell.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    handleSetupClick(row, col);
                    clearPreview();
                }, { passive: false });
            } else if (isEnemy) {
                if (gameState.mode === 'online') {
                    cell.addEventListener('click', () => handleOnlineAttack(row, col));
                } else {
                    cell.addEventListener('click', () => handleAttack(row, col));
                }
            }
            
            container.appendChild(cell);
        }
    }
}

// ================== SHIP SELECTION ==================
function createShipButtons() {
    const container = document.getElementById('ships-to-place');
    container.innerHTML = '';
    
    getShips().forEach(ship => {
        const btn = document.createElement('button');
        btn.className = 'ship-btn';
        btn.dataset.shipId = ship.id;
        btn.textContent = `${ship.name} (${ship.size})`;
        btn.addEventListener('click', () => selectShip(ship.id));
        container.appendChild(btn);
    });
}

function selectShip(shipId) {
    const player = gameState.mode === 'online' 
        ? { ships: gameState.myShips || [] }
        : gameState.players[gameState.currentPlayer];
    const isPlaced = player.ships.some(s => s.id === shipId);
    
    if (isPlaced) return;
    
    gameState.selectedShip = getShips().find(s => s.id === shipId);
    
    document.querySelectorAll('.ship-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.shipId === shipId) {
            btn.classList.add('selected');
        }
    });
}

function updateShipButtons() {
    const player = gameState.mode === 'online' 
        ? { ships: gameState.myShips || [] }
        : gameState.players[gameState.currentPlayer];
    
    document.querySelectorAll('.ship-btn').forEach(btn => {
        const shipId = btn.dataset.shipId;
        const isPlaced = player.ships.some(s => s.id === shipId);
        btn.classList.toggle('placed', isPlaced);
        btn.classList.remove('selected');
    });
    
    gameState.selectedShip = null;
}

// ================== ROTATION ==================
function toggleRotation() {
    gameState.isHorizontal = !gameState.isHorizontal;
    document.getElementById('rotate-btn').textContent = 
        `Obróć (${gameState.isHorizontal ? 'poziomo' : 'pionowo'})`;
    clearPreview();
}

// ================== SHIP PLACEMENT PREVIEW ==================
function showShipPreview(row, col) {
    if (!gameState.selectedShip) return;
    
    clearPreview();
    const cells = getShipCells(row, col, gameState.selectedShip.size, gameState.isHorizontal);
    const board = gameState.mode === 'online' ? gameState.myBoard : gameState.players[gameState.currentPlayer].board;
    const ships = gameState.mode === 'online' ? gameState.myShips : gameState.players[gameState.currentPlayer].ships;
    const isValid = canPlaceShipOnBoard(row, col, gameState.selectedShip.size, gameState.isHorizontal, board);
    
    cells.forEach(([r, c], index) => {
        if (r >= 0 && r < getGridSize() && c >= 0 && c < getGridSize()) {
            const cell = document.querySelector(`#setup-grid .cell[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.add(isValid ? 'preview' : 'preview-invalid');
                // Add ship part class for preview shape
                const partClass = getShipPartClass(index, gameState.selectedShip.size, gameState.isHorizontal);
                cell.classList.add(partClass);
            }
        }
    });
}

function clearPreview() {
    document.querySelectorAll('.preview, .preview-invalid').forEach(cell => {
        cell.classList.remove('preview', 'preview-invalid');
        // Remove ship part classes from preview cells that aren't placed ships
        if (!cell.classList.contains('ship')) {
            cell.classList.remove('ship-bow-right', 'ship-bow-left', 'ship-bow-up', 'ship-bow-down',
                                  'ship-stern-right', 'ship-stern-left', 'ship-stern-up', 'ship-stern-down',
                                  'ship-body-h', 'ship-body-v', 'ship-single-h', 'ship-single-v');
        }
    });
}

function getShipCells(row, col, size, isHorizontal) {
    const cells = [];
    for (let i = 0; i < size; i++) {
        if (isHorizontal) {
            cells.push([row, col + i]);
        } else {
            cells.push([row + i, col]);
        }
    }
    return cells;
}

function canPlaceShip(row, col, size, isHorizontal) {
    const player = gameState.players[gameState.currentPlayer];
    return canPlaceShipOnBoard(row, col, size, isHorizontal, player.board);
}

function canPlaceShipOnBoard(row, col, size, isHorizontal, board) {
    const cells = getShipCells(row, col, size, isHorizontal);
    
    // Check bounds
    for (const [r, c] of cells) {
        if (r < 0 || r >= getGridSize() || c < 0 || c >= getGridSize()) {
            return false;
        }
    }
    
    // Check for overlapping ships and adjacent ships
    for (const [r, c] of cells) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < getGridSize() && nc >= 0 && nc < getGridSize()) {
                    if (board[nr][nc].hasShip) {
                        return false;
                    }
                }
            }
        }
    }
    
    return true;
}

// ================== PLACE SHIP ==================
// Helper function to get ship part class based on position
function getShipPartClass(index, totalSize, isHorizontal) {
    if (totalSize === 1) {
        return isHorizontal ? 'ship-single-h' : 'ship-single-v';
    }
    
    if (index === 0) {
        // Stern (back of ship)
        return isHorizontal ? 'ship-stern-right' : 'ship-stern-down';
    } else if (index === totalSize - 1) {
        // Bow (front of ship)
        return isHorizontal ? 'ship-bow-right' : 'ship-bow-down';
    } else {
        // Body (middle sections)
        return isHorizontal ? 'ship-body-h' : 'ship-body-v';
    }
}

function handleSetupClick(row, col) {
    if (!gameState.selectedShip) return;
    
    const ship = gameState.selectedShip;
    const board = gameState.mode === 'online' ? gameState.myBoard : gameState.players[gameState.currentPlayer].board;
    const ships = gameState.mode === 'online' ? gameState.myShips : gameState.players[gameState.currentPlayer].ships;
    
    if (!canPlaceShipOnBoard(row, col, ship.size, gameState.isHorizontal, board)) return;
    
    const cells = getShipCells(row, col, ship.size, gameState.isHorizontal);
    const isHorizontal = gameState.isHorizontal;
    
    // Place ship on board
    cells.forEach(([r, c], index) => {
        board[r][c].hasShip = true;
        board[r][c].shipId = ship.id;
        board[r][c].shipPart = getShipPartClass(index, ship.size, isHorizontal);
        
        const cell = document.querySelector(`#setup-grid .cell[data-row="${r}"][data-col="${c}"]`);
        if (cell) {
            cell.classList.add('ship');
            cell.classList.add(board[r][c].shipPart);
            cell.classList.remove('preview', 'preview-invalid');
        }
    });
    
    // Record ship placement
    ships.push({
        id: ship.id,
        name: ship.name,
        size: ship.size,
        cells: cells,
        isHorizontal: isHorizontal,
        hits: 0,
        isSunk: false
    });
    
    playSound('place');
    
    updateShipButtons();
    checkSetupComplete();
    renderFleetSprites('setup-grid', ships);
}

function checkSetupComplete() {
    const ships = gameState.mode === 'online' ? gameState.myShips : gameState.players[gameState.currentPlayer].ships;
    const allPlaced = ships.length === getShips().length;
    document.getElementById('confirm-setup').disabled = !allPlaced;
}

function resetSetup() {
    if (gameState.mode === 'online') {
        gameState.myBoard = initializeBoard();
        gameState.myShips = [];
    } else {
        const player = gameState.players[gameState.currentPlayer];
        player.board = initializeBoard();
        player.ships = [];
    }
    
    createGrid('setup-grid', true);
    updateShipButtons();
    checkSetupComplete();
    renderFleetSprites('setup-grid', ships);
}

// ================== RANDOM PLACEMENT ==================
function randomPlacement() {
    // Reset first
    if (gameState.mode === 'online') {
        gameState.myBoard = initializeBoard();
        gameState.myShips = [];
    } else {
        const player = gameState.players[gameState.currentPlayer];
        player.board = initializeBoard();
        player.ships = [];
    }
    
    const board = gameState.mode === 'online' ? gameState.myBoard : gameState.players[gameState.currentPlayer].board;
    const ships = gameState.mode === 'online' ? gameState.myShips : gameState.players[gameState.currentPlayer].ships;
    
    // Place each ship randomly
    for (const shipTemplate of getShips()) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 100) {
            const row = Math.floor(Math.random() * getGridSize());
            const col = Math.floor(Math.random() * getGridSize());
            const isHorizontal = Math.random() > 0.5;
            
            if (canPlaceShipOnBoard(row, col, shipTemplate.size, isHorizontal, board)) {
                const cells = getShipCells(row, col, shipTemplate.size, isHorizontal);
                
                cells.forEach(([r, c], index) => {
                    board[r][c].hasShip = true;
                    board[r][c].shipId = shipTemplate.id;
                    board[r][c].shipPart = getShipPartClass(index, shipTemplate.size, isHorizontal);
                });
                
                ships.push({
                    id: shipTemplate.id,
                    name: shipTemplate.name,
                    size: shipTemplate.size,
                    cells: cells,
                    isHorizontal: isHorizontal,
                    hits: 0,
                    isSunk: false
                });
                
                placed = true;
            }
            attempts++;
        }
    }
    
    // Update UI
    createGrid('setup-grid', true);
    
    // Show ships on grid with proper ship part classes
    for (let row = 0; row < getGridSize(); row++) {
        for (let col = 0; col < getGridSize(); col++) {
            if (board[row][col].hasShip) {
                const cell = document.querySelector(`#setup-grid .cell[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.classList.add('ship');
                    if (board[row][col].shipPart) {
                        cell.classList.add(board[row][col].shipPart);
                    }
                }
            }
        }
    }
    
    updateShipButtons();
    checkSetupComplete();
    renderFleetSprites('setup-grid', ships);
}

// ================== LOCAL GAME FLOW ==================
function startLocalGame() {
    gameState.mode = 'local';
    gameState.currentPlayer = 1;
    gameState.players[1].board = initializeBoard();
    gameState.players[2].board = initializeBoard();
    gameState.players[1].ships = [];
    gameState.players[2].ships = [];
    gameState.players[1].shipsRemaining = getShipCount();
    gameState.players[2].shipsRemaining = getShipCount();
    gameState.players[1].shots = 0;
    gameState.players[2].shots = 0;
    gameState.players[1].hits = 0;
    gameState.players[2].hits = 0;
    gameState.isHorizontal = true;
    
    showScreen('setup');
    document.getElementById('setup-title').textContent = 'Gracz 1 - Rozmieść statki';
    createGrid('setup-grid', true);
    createShipButtons();
    document.getElementById('rotate-btn').textContent = 'Obróć (poziomo)';
    document.getElementById('confirm-setup').disabled = true;
}

function confirmSetup() {
    if (gameState.mode === 'online') {
        confirmOnlineSetup();
        return;
    }
    
    if (gameState.currentPlayer === 1) {
        gameState.currentPlayer = 2;
        document.getElementById('transition-title').textContent = 'Przekaż telefon graczowi 2';
        document.getElementById('transition-subtitle').textContent = 'Nie podglądaj planszy przeciwnika!';
        showScreen('transition');
    } else {
        gameState.currentPlayer = 1;
        document.getElementById('transition-title').textContent = 'Gra rozpoczyna się! Przekaż telefon graczowi 1';
        document.getElementById('transition-subtitle').textContent = '';
        showScreen('transition');
        gameState.phase = 'game-start';
    }
}

function continueGame() {
    if (gameState.phase === 'game-start') {
        startBattle();
    } else if (gameState.currentPlayer === 2 && gameState.phase === 'transition') {
        showScreen('setup');
        document.getElementById('setup-title').textContent = 'Gracz 2 - Rozmieść statki';
        createGrid('setup-grid', true);
        createShipButtons();
        gameState.isHorizontal = true;
        document.getElementById('rotate-btn').textContent = 'Obróć (poziomo)';
        document.getElementById('confirm-setup').disabled = true;
    } else {
        startBattle();
    }
}

function startBattle() {
    showScreen('game');
    gameState.hasAttacked = false;
    document.getElementById('end-turn-btn').style.display = 'block';
    updateGameUI();
    startTimer();
}

function updateGameUI() {
    const currentPlayer = gameState.currentPlayer;
    const enemyPlayer = currentPlayer === 1 ? 2 : 1;
    
    document.getElementById('game-title').textContent = `Tura gracza ${currentPlayer}`;
    document.getElementById('player1-ships').innerHTML = `Gracz 1: <span class="ship-count">${gameState.players[1].shipsRemaining}</span> statków`;
    document.getElementById('player2-ships').innerHTML = `Gracz 2: <span class="ship-count">${gameState.players[2].shipsRemaining}</span> statków`;
    
    renderEnemyGrid(enemyPlayer);
    renderOwnGrid(currentPlayer);
    
    document.getElementById('end-turn-btn').disabled = !gameState.hasAttacked;
}

function renderEnemyGrid(enemyPlayer) {
    const container = document.getElementById('enemy-grid');
    container.innerHTML = '';
    const board = gameState.players[enemyPlayer].board;
    const gridSize = getGridSize();
    container.style.gridTemplateColumns = `repeat(${gridSize}, var(--cell-size))`;
    container.style.gridTemplateRows = `repeat(${gridSize}, var(--cell-size))`;
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const cellData = board[row][col];
            
            if (cellData.isHit) {
                if (cellData.hasShip) {
                    const ship = gameState.players[enemyPlayer].ships.find(s => s.id === cellData.shipId);
                    if (ship && ship.isSunk) {
                        cell.classList.add('sunk');
                    } else {
                        cell.classList.add('hit');
                    }
                } else {
                    cell.classList.add('miss');
                }
            } else {
                cell.addEventListener('click', () => handleAttack(row, col));
            }
            
            container.appendChild(cell);
        }
    }
}

function renderFleetSprites(containerId, ships) {
    const grid = document.getElementById(containerId);
    grid.querySelectorAll('.fleet-sprite').forEach(sprite => sprite.remove());
    for (const ship of ships) {
        if (!ship.cells.length) continue;
        const [row, col] = ship.cells[0];
        const anchor = grid.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (!anchor) continue;
        const sprite = document.createElement('img');
        sprite.src = `assets/ship-${ship.size}.svg`;
        sprite.alt = '';
        sprite.draggable = false;
        sprite.className = 'fleet-sprite' + (ship.isHorizontal ? '' : ' vertical') + (ship.isSunk ? ' wreck' : '');
        sprite.style.setProperty('--ship-length', ship.size);
        anchor.appendChild(sprite);
    }
}

function renderOwnGrid(playerNum) {
    const container = document.getElementById('own-grid');
    container.innerHTML = '';
    const board = gameState.players[playerNum].board;
    const gridSize = getGridSize();
    container.style.gridTemplateColumns = `repeat(${gridSize}, var(--cell-size))`;
    container.style.gridTemplateRows = `repeat(${gridSize}, var(--cell-size))`;
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const cellData = board[row][col];
            
            if (cellData.hasShip) {
                const ship = gameState.players[playerNum].ships.find(s => s.id === cellData.shipId);
                if (cellData.isHit) {
                    if (ship && ship.isSunk) {
                        cell.classList.add('sunk');
                    } else {
                        cell.classList.add('hit');
                    }
                } else {
                    cell.classList.add('ship');
                    if (cellData.shipPart) {
                        cell.classList.add(cellData.shipPart);
                    }
                }
            } else if (cellData.isHit) {
                cell.classList.add('miss');
            }
            
            container.appendChild(cell);
        }
    }
    renderFleetSprites('own-grid', gameState.players[playerNum].ships);
}

// ================== TIMER SYSTEM ==================
function startTimer() {
    stopTimer(); // Clear any existing timer

    if (gameOptions.turnTimer === 0) {
        updateTimerDisplay(null);
        return;
    }

    gameState.turnTimeRemaining = gameOptions.turnTimer;
    updateTimerDisplay(gameState.turnTimeRemaining);

    gameState.turnTimerId = setInterval(() => {
        gameState.turnTimeRemaining--;
        updateTimerDisplay(gameState.turnTimeRemaining);

        if (gameState.turnTimeRemaining <= 0) {
            stopTimer();
            handleTimerExpired();
        }
    }, 1000);
}

function stopTimer() {
    if (gameState.turnTimerId) {
        clearInterval(gameState.turnTimerId);
        gameState.turnTimerId = null;
    }
}

function updateTimerDisplay(seconds) {
    const timerElement = document.getElementById('turn-timer');
    if (!timerElement) return;

    if (seconds === null || gameOptions.turnTimer === 0) {
        timerElement.style.display = 'none';
        return;
    }

    timerElement.style.display = 'block';
    timerElement.textContent = `⏱️ ${seconds}s`;

    if (seconds <= 5) {
        timerElement.classList.add('warning');
    } else {
        timerElement.classList.remove('warning');
    }
}

function handleTimerExpired() {
    if (gameState.phase !== 'game') return;
    if (gameState.mode === 'online') {
        // The server owns online turn expiry; never invent an attack locally.
        gameState.isMyTurn = false;
        updateOnlineGameUI();
    } else {
        endTurn();
        document.getElementById('transition-subtitle').textContent = 'Czas minął — tura przepada bez strzału.';
    }
}

function handleAttack(row, col) {
    if (gameState.phase !== 'game' || gameState.hasAttacked) return;
    
    const currentPlayer = gameState.currentPlayer;
    const enemyPlayer = currentPlayer === 1 ? 2 : 1;
    const board = gameState.players[enemyPlayer].board;
    
    if (board[row][col].isHit) return;
    
    board[row][col].isHit = true;
    gameState.players[currentPlayer].shots++;

    const wasHit = board[row][col].hasShip;
    let shouldAutoEndTurn = false;

    // Allow another shot on hit if option is enabled
    if (wasHit && gameOptions.shootAgainOnHit) {
        gameState.hasAttacked = false;
        // Restart timer for next shot
        if (gameOptions.turnTimer > 0) {
            startTimer();
        }
    } else {
        gameState.hasAttacked = true;
        // Stop timer - player made their move
        stopTimer();
        // Always auto-end turn after a miss in local mode (no timer needed)
        if (gameState.mode === 'local') {
            shouldAutoEndTurn = true;
        } else if (gameOptions.turnTimer > 0) {
            shouldAutoEndTurn = true;
        }
    }
    
    if (wasHit) {
        gameState.players[currentPlayer].hits++;
        
        const ship = gameState.players[enemyPlayer].ships.find(s => s.id === board[row][col].shipId);
        if (ship) {
            ship.hits++;
            if (ship.hits === ship.size) {
                ship.isSunk = true;
                gameState.players[enemyPlayer].shipsRemaining--;
                
                ship.cells.forEach(([r, c]) => {
                    const cell = document.querySelector(`#enemy-grid .cell[data-row="${r}"][data-col="${c}"]`);
                    if (cell) {
                        cell.classList.remove('hit');
                        cell.classList.add('sunk');
                    }
                });
                
                revealAdjacentCells(ship, enemyPlayer);
                playSound('sunk');
            } else {
                playSound('hit');
            }
        }
    } else {
        playSound('miss');
    }
    
    updateGameUI();
    
    if (gameState.players[enemyPlayer].shipsRemaining === 0) {
        stopTimer();
        gameState.hasAttacked = true;
        gameState.phase = 'battle-ending';
        document.getElementById('end-turn-btn').disabled = true;
        pendingTurnChange = setTimeout(() => endGame(currentPlayer), 500);
    } else if (shouldAutoEndTurn) {
        // Auto-end turn after a brief delay to let player see result
        pendingTurnChange = setTimeout(() => {
            endTurn();
        }, 1500);
    }
}

function revealAdjacentCells(ship, enemyPlayer) {
    const board = gameState.players[enemyPlayer].board;
    
    ship.cells.forEach(([r, c]) => {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < getGridSize() && nc >= 0 && nc < getGridSize()) {
                    if (!board[nr][nc].hasShip && !board[nr][nc].isHit) {
                        board[nr][nc].isHit = true;
                    }
                }
            }
        }
    });
}

function endTurn() {
    if (gameState.mode !== 'local' || gameState.phase !== 'game') return;
    clearTimeout(pendingTurnChange);
    pendingTurnChange = null;
    stopTimer();
    const nextPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    gameState.currentPlayer = nextPlayer;
    gameState.hasAttacked = false;
    
    document.getElementById('transition-title').textContent = `Przekaż telefon graczowi ${nextPlayer}`;
    document.getElementById('transition-subtitle').textContent = 'Nie podglądaj planszy przeciwnika!';
    showScreen('transition');
    gameState.phase = 'battle-transition';
}

function endGame(winner) {
    stopTimer();
    showScreen('gameover');
    
    if (gameState.mode === 'online') {
        const isWinner = (winner === 'host' && gameState.playerRole === 'host') || 
                         (winner === 'guest' && gameState.playerRole === 'guest');
        document.getElementById('winner-text').textContent = isWinner ? 'Zwycięstwo!' : 'Flota pokonana';
        playSound(isWinner ? 'win' : 'lose');
    } else {
        document.getElementById('winner-text').textContent = `Gracz ${winner} zwycięża`;
        playSound('win');
    }
    
    document.getElementById('gameover-screen').classList.toggle('defeat', gameState.mode === 'online' && !((winner === 'host' && gameState.playerRole === 'host') || (winner === 'guest' && gameState.playerRole === 'guest')));
    const stats = document.getElementById('game-stats');
    
    if (gameState.mode === 'online') {
        const myWins = gameState.playerRole === 'host' ? gameState.roomScore.host : gameState.roomScore.guest;
        const opponentWins = gameState.playerRole === 'host' ? gameState.roomScore.guest : gameState.roomScore.host;
        
        stats.innerHTML = `
            <div class="score-display">
                <span class="my-score">Ty: ${myWins}</span>
                <span class="score-separator">-</span>
                <span class="opponent-score">Przeciwnik: ${opponentWins}</span>
            </div>
            <p style="margin-top: 16px;"><strong>Twoje statystyki:</strong></p>
            <p>Strzały: ${gameState.myStats?.shots || 0} | Trafienia: ${gameState.myStats?.hits || 0}</p>
        `;
        // Show rematch buttons for online mode
        document.getElementById('play-again-btn').textContent = 'Zagraj ponownie';
        document.getElementById('leave-game-btn').style.display = 'inline-block';
        gameState.waitingForRematch = false;
    } else {
        const p1 = gameState.players[1];
        const p2 = gameState.players[2];
        stats.innerHTML = [p1, p2].map((player, index) => {
            const accuracy = player.shots ? Math.round(player.hits / player.shots * 100) : 0;
            return `<article class="result-card ${winner === index + 1 ? 'result-winner' : ''}">
                <div class="result-player"><span>Gracz ${index + 1}</span><span class="result-rank">${winner === index + 1 ? 'ZWYCIĘZCA' : 'POKONANY'}</span></div>
                <div class="result-metrics"><div><strong>${player.shots}</strong><span>Strzały</span></div><div><strong>${player.hits}</strong><span>Trafienia</span></div><div><strong>${accuracy}<small>%</small></strong><span>Celność</span></div></div>
                <div class="accuracy-track" aria-hidden="true"><i style="width:${accuracy}%"></i></div>
            </article>`;
        }).join('');
        // Hide leave button for local mode
        document.getElementById('leave-game-btn').style.display = 'none';
    }
}

function playAgain() {
    if (gameState.mode === 'online' && gameState.socket && gameState.roomCode) {
        // Request rematch in same room
        gameState.socket.emit('request-rematch');
        gameState.waitingForRematch = true;
        
        // Update button to show waiting state
        const btn = document.getElementById('play-again-btn');
        btn.textContent = 'Oczekiwanie na przeciwnika...';
        btn.disabled = true;
    } else {
        // Local mode - just go back to start
        showScreen('start');
    }
}

// ================== ONLINE GAME FLOW ==================
function showOnlineLobby() {
    gameState.mode = 'online';
    initializeSocket();
    showScreen('lobby');
}

function createRoom() {
    gameState.socket.emit('create-room', {
        gridSize: gameOptions.gridSize,
        shootAgainOnHit: gameOptions.shootAgainOnHit,
        turnTimer: gameOptions.turnTimer
    });
}

function joinRoom() {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (code.length !== 6) {
        alert('Kod pokoju musi mieć 6 znaków');
        return;
    }
    gameState.socket.emit('join-room', code);
}

function copyRoomCode() {
    const code = document.getElementById('room-code').textContent;
    const btn = document.getElementById('copy-code-btn');
    
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            showCopySuccess(btn);
        }).catch(() => {
            // Fallback if clipboard API fails
            fallbackCopy(code, btn);
        });
    } else {
        // Fallback for older browsers
        fallbackCopy(code, btn);
    }
}

function fallbackCopy(text, btn) {
    // Create a temporary input element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess(btn);
    } catch (err) {
        showCopyError(btn);
    }
    
    document.body.removeChild(textArea);
}

function showCopySuccess(btn) {
    btn.textContent = '✓ Skopiowano!';
    btn.classList.add('copy-success');
    setTimeout(() => {
        btn.textContent = '📋 Kopiuj kod';
        btn.classList.remove('copy-success');
    }, 2000);
}

function showCopyError(btn) {
    btn.textContent = '✗ Błąd';
    setTimeout(() => {
        btn.textContent = '📋 Kopiuj kod';
    }, 2000);
}

function generateQRCode(code) {
    const img = document.getElementById('qr-code');
    const joinUrl = `${window.location.origin}?join=${code}`;
    const encodedUrl = encodeURIComponent(joinUrl);
    
    // Use QR code API service
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodedUrl}&bgcolor=ffffff&color=1a1a2e`;
    img.width = 160;
    img.height = 160;
}

function shareRoom() {
    const code = document.getElementById('room-code').textContent;
    const joinUrl = `${window.location.origin}?join=${code}`;
    const shareData = {
        title: 'Statki - Dołącz do gry!',
        text: `Dołącz do mojej gry w Statki! Kod pokoju: ${code}`,
        url: joinUrl
    };
    
    if (navigator.share) {
        // Use native share (works with AirDrop on iOS, share sheet on Android)
        navigator.share(shareData).catch(err => {
            // User cancelled or error - fallback to copy
            if (err.name !== 'AbortError') {
                copyRoomCode();
            }
        });
    } else {
        // Fallback - copy the URL
        const btn = document.getElementById('share-btn');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(joinUrl).then(() => {
                btn.textContent = '✓ Link skopiowany!';
                setTimeout(() => {
                    btn.textContent = '📤 Udostępnij';
                }, 2000);
            });
        } else {
            fallbackCopy(joinUrl, btn);
        }
    }
}

function cancelRoom() {
    leaveRoom();
    showScreen('lobby');
}

function leaveRoom() {
    if (gameState.socket) {
        gameState.socket.emit('leave-room');
    }
    gameState.roomCode = null;
    gameState.playerRole = null;
    gameState.roomScore = { host: 0, guest: 0 };
}

function startOnlineSetup() {
    gameState.myBoard = initializeBoard();
    gameState.myShips = [];
    gameState.enemyBoardState = initializeBoard();
    gameState.enemyShipsRemaining = getShipCount();
    gameState.isHorizontal = true;
    gameState.opponentReady = false;
    gameState.myStats = { shots: 0, hits: 0 };
    
    showScreen('setup');
    document.getElementById('setup-title').textContent = 'Rozmieść swoje statki';
    createGrid('setup-grid', true);
    createShipButtons();
    document.getElementById('rotate-btn').textContent = 'Obróć (poziomo)';
    document.getElementById('confirm-setup').disabled = true;
}

function confirmOnlineSetup() {
    // Send board to server
    gameState.socket.emit('player-ready', {
        board: gameState.myBoard,
        ships: gameState.myShips
    });
    
    showScreen('onlineWaiting');
}

function startOnlineBattle() {
    showScreen('game');
    document.getElementById('end-turn-btn').style.display = 'none';
    updateOnlineGameUI();
}

function updateOnlineGameUI() {
    const titleEl = document.getElementById('game-title');
    if (gameState.isMyTurn) {
        titleEl.textContent = 'Twoja tura - strzelaj!';
        titleEl.className = 'your-turn';
    } else {
        titleEl.textContent = 'Tura przeciwnika...';
        titleEl.className = 'enemy-turn';
    }
    
    document.getElementById('player1-ships').innerHTML = `Ty: <span class="ship-count">${getShipCount() - countSunkShips(gameState.myShips)}</span> statków`;
    document.getElementById('player2-ships').innerHTML = `Przeciwnik: <span class="ship-count">${gameState.enemyShipsRemaining || getShipCount()}</span> statków`;
    
    renderOnlineEnemyGrid();
    renderOnlineOwnGrid();
}

function countSunkShips(ships) {
    if (!ships) return 0;
    return ships.filter(s => s.isSunk).length;
}

function renderOnlineEnemyGrid() {
    const container = document.getElementById('enemy-grid');
    container.innerHTML = '';
    const board = gameState.enemyBoardState;
    const gridSize = getGridSize();

    // Update body class and CSS variable for cell size
    if (gridSize === 15) {
        document.body.classList.add('large-grid');
        document.body.classList.remove('standard-grid');
        document.documentElement.style.setProperty('--cell-size', 'min(6vw, 24px)');
    } else {
        document.body.classList.add('standard-grid');
        document.body.classList.remove('large-grid');
        document.documentElement.style.setProperty('--cell-size', 'min(9vw, 36px)');
    }

    // Set grid size dynamically
    container.style.gridTemplateColumns = `repeat(${gridSize}, var(--cell-size))`;
    container.style.gridTemplateRows = `repeat(${gridSize}, var(--cell-size))`;
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const cellData = board[row][col];
            
            if (cellData.isHit) {
                if (cellData.hasShip) {
                    if (cellData.isSunk) {
                        cell.classList.add('sunk');
                    } else {
                        cell.classList.add('hit');
                    }
                } else {
                    cell.classList.add('miss');
                }
            } else if (gameState.isMyTurn) {
                cell.addEventListener('click', () => handleOnlineAttack(row, col));
            }
            
            container.appendChild(cell);
        }
    }
}

function renderOnlineOwnGrid() {
    const container = document.getElementById('own-grid');
    container.innerHTML = '';
    const board = gameState.myBoard;
    const gridSize = getGridSize();

    // Set grid size dynamically  
    container.style.gridTemplateColumns = `repeat(${gridSize}, var(--cell-size))`;
    container.style.gridTemplateRows = `repeat(${gridSize}, var(--cell-size))`;
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const cellData = board[row][col];
            
            if (cellData.hasShip) {
                const ship = gameState.myShips.find(s => s.id === cellData.shipId);
                if (cellData.isHit) {
                    if (ship && ship.isSunk) {
                        cell.classList.add('sunk');
                    } else {
                        cell.classList.add('hit');
                    }
                } else {
                    cell.classList.add('ship');
                    if (cellData.shipPart) {
                        cell.classList.add(cellData.shipPart);
                    }
                }
            } else if (cellData.isHit) {
                cell.classList.add('miss');
            }
            
            container.appendChild(cell);
        }
    }
    renderFleetSprites('own-grid', gameState.myShips);
}

function handleOnlineAttack(row, col) {
    if (!gameState.isMyTurn) return;
    if (gameState.enemyBoardState[row][col].isHit) return;
    
    gameState.socket.emit('attack', { row, col });
    gameState.isMyTurn = false; // Optimistic update
}

function handleAttackResult(result) {
    const { row, col, isHit, isSunk, sunkShip, gameOver, winner, stats, score } = result;
    
    gameState.myStats.shots++;
    if (isHit) gameState.myStats.hits++;
    
    // Update room score if provided
    if (score) {
        gameState.roomScore = score;
    }
    
    // Play sound based on result
    if (isSunk) {
        playSound('sunk');
    } else if (isHit) {
        playSound('hit');
    } else {
        playSound('miss');
    }
    
    // Update enemy board state
    gameState.enemyBoardState[row][col].isHit = true;
    gameState.enemyBoardState[row][col].hasShip = isHit;
    
    if (isSunk && sunkShip) {
        gameState.enemyShipsRemaining = (gameState.enemyShipsRemaining || getShipCount()) - 1;
        
        // Mark all ship cells as sunk
        sunkShip.cells.forEach(([r, c]) => {
            gameState.enemyBoardState[r][c].isHit = true;
            gameState.enemyBoardState[r][c].hasShip = true;
            gameState.enemyBoardState[r][c].isSunk = true;
        });
        
        // Mark adjacent cells as miss
        sunkShip.cells.forEach(([r, c]) => {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < getGridSize() && nc >= 0 && nc < getGridSize()) {
                        if (!gameState.enemyBoardState[nr][nc].hasShip) {
                            gameState.enemyBoardState[nr][nc].isHit = true;
                        }
                    }
                }
            }
        });
    }
    
    updateOnlineGameUI();
    
    if (gameOver) {
        setTimeout(() => endGame(winner), 500);
    }
}

function handleOpponentAttack(result) {
    const { row, col, isHit, isSunk, sunkShip, score } = result;
    
    // Update room score if provided
    if (score) {
        gameState.roomScore = score;
    }
    
    // Play sound for opponent's attack on us
    if (isSunk) {
        playSound('sunk');
    } else if (isHit) {
        playSound('hit');
    } else {
        playSound('miss');
    }
    
    // Update my board
    gameState.myBoard[row][col].isHit = true;
    
    if (isHit && sunkShip) {
        const ship = gameState.myShips.find(s => s.id === sunkShip.id);
        if (ship) {
            ship.isSunk = true;
        }
    }
    
    updateOnlineGameUI();
    
    if (result.gameOver) {
        setTimeout(() => endGame(result.winner), 500);
    }
}

// ================== EVENT LISTENERS ==================

// Options screen listeners
let pendingGameMode = null;

document.querySelectorAll('.option-btn[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.option-btn[data-size]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameOptions.gridSize = parseInt(btn.dataset.size);
    });
});

document.querySelectorAll('.option-btn[data-shoot-again]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.option-btn[data-shoot-again]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameOptions.shootAgainOnHit = btn.dataset.shootAgain === 'true';
    });
});

document.querySelectorAll('.option-btn[data-timer]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.option-btn[data-timer]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameOptions.turnTimer = parseInt(btn.dataset.timer);
    });
});

document.getElementById('start-game-btn').addEventListener('click', () => {
    if (pendingGameMode === 'local') {
        startLocalGame();
    } else if (pendingGameMode === 'online') {
        showOnlineLobby();
    }
});

document.getElementById('back-from-options').addEventListener('click', () => {
    showScreen('start');
});

document.getElementById('local-btn').addEventListener('click', () => {
    initAudio();
    pendingGameMode = 'local';
    showScreen('options');
});
document.getElementById('online-btn').addEventListener('click', () => {
    initAudio();
    pendingGameMode = 'online';
    showScreen('options');
});
document.getElementById('rotate-btn').addEventListener('click', toggleRotation);
document.getElementById('random-btn').addEventListener('click', randomPlacement);
document.getElementById('confirm-setup').addEventListener('click', confirmSetup);
document.getElementById('reset-setup').addEventListener('click', resetSetup);
document.getElementById('continue-btn').addEventListener('click', continueGame);
document.getElementById('end-turn-btn').addEventListener('click', endTurn);
document.getElementById('play-again-btn').addEventListener('click', playAgain);
document.getElementById('leave-game-btn').addEventListener('click', () => {
    leaveRoom();
    showScreen('start');
});

// Online lobby listeners
document.getElementById('create-room-btn').addEventListener('click', createRoom);
document.getElementById('join-room-btn').addEventListener('click', joinRoom);
document.getElementById('back-to-menu').addEventListener('click', () => showScreen('start'));
document.getElementById('copy-code-btn').addEventListener('click', copyRoomCode);
document.getElementById('share-btn').addEventListener('click', shareRoom);
document.getElementById('cancel-room-btn').addEventListener('click', cancelRoom);

// Allow Enter key to join room
document.getElementById('room-code-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom();
});

// Handle URL join parameter (from QR code or shared link)
function checkUrlForJoin() {
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    
    if (joinCode && joinCode.length === 6) {
        // Clear the URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Initialize socket and join room
        gameState.mode = 'online';
        initializeSocket();
        showScreen('lobby');
        
        // Fill in the code and join after socket connects
        document.getElementById('room-code-input').value = joinCode.toUpperCase();
        
        // Wait a moment for socket to connect, then join
        setTimeout(() => {
            joinRoom();
        }, 500);
    }
}

// Initialize
gameState.enemyShipsRemaining = getShipCount();
showScreen('start');

// Check if user is joining via shared link/QR code
checkUrlForJoin();
