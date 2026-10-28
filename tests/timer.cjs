const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function clock() {
    let id = 0;
    const jobs = new Map();
    return {
        setTimeout(fn) { jobs.set(++id, fn); return id; },
        clearTimeout(id) { jobs.delete(id); },
        setInterval(fn) { jobs.set(++id, fn); return id; },
        clearInterval(id) { jobs.delete(id); },
        run() { const ready = [...jobs.values()]; jobs.clear(); ready.forEach(fn => fn()); },
        jobs
    };
}
const nodes = new Map();
const node = id => {
    if (!nodes.has(id)) nodes.set(id, {style: {}, classList: {add(){}, remove(){}, toggle(){}}, addEventListener(){}, setAttribute(){}});
    return nodes.get(id);
};
const timers = clock();
const client = vm.createContext({ ...timers, console, URLSearchParams,
    document: {getElementById: node, querySelectorAll: () => [], addEventListener(){}},
    window: {location: {search: ''}}
});
vm.runInContext(fs.readFileSync('game.js', 'utf8'), client);
vm.runInContext(`
    playSound = () => {};
    updateGameUI = () => {};
    updateOnlineGameUI = () => {};
    gameState.phase = 'game';
    gameState.players[2].board = initializeBoard();
    gameState.players[2].board[0][0].hasShip = true;
    gameState.players[2].board[0][0].shipId = 'test';
    gameState.players[2].ships = [{id:'test', size:2, hits:0, cells:[[0,0],[0,1]]}];
    gameState.players[2].shipsRemaining = 1;
`, client);
const get = expression => vm.runInContext(expression, client);
get('handleTimerExpired()');
assert.equal(get('gameState.currentPlayer'), 2);
assert.equal(get('gameState.phase'), 'battle-transition');
assert.equal(get('gameState.players[1].shots'), 0);
assert.equal(get('gameState.players[2].board[0][0].isHit'), false);
get('handleTimerExpired(); endTurn(); handleAttack(0,0)');
assert.equal(get('gameState.currentPlayer'), 2, 'handoff must not switch again');
assert.equal(get('gameState.players[2].board[0][0].isHit'), false);
// A manual end before the delayed transition must cancel the old callback.
get("gameState.currentPlayer=1; gameState.phase='game'; gameState.hasAttacked=false; handleAttack(9,9)");
assert.equal(timers.jobs.size, 1);
get('endTurn()');
get("gameState.phase='game'; gameState.hasAttacked=false");
timers.run();
assert.equal(get('gameState.currentPlayer'), 2);
// Expiry after a bonus shot also skips without an additional attack.
get("gameState.currentPlayer=1; gameState.phase='game'; gameOptions.turnTimer=10; handleAttack(0,0)");
assert.equal(get('gameState.players[1].hits'), 1);
get('stopTimer(); handleTimerExpired()');
assert.equal(get('gameState.players[1].hits'), 1);
assert.equal(get('gameState.players[1].shots'), 2);
assert.equal(get('gameState.currentPlayer'), 2);
// Online expiry waits for the server and emits no attack.
get("gameState.phase='game'; gameState.mode='online'; gameState.isMyTurn=true; gameState.socket={emit(){throw Error('Unexpected attack')}}; handleTimerExpired()");
assert.equal(get('gameState.isMyTurn'), false);

const serverClock = clock();
const events = [];
const app = {use(){}, get(){}};
const express = () => app;
express.static = () => {};
class Server { on(){} to(id){ return {emit(event, data){ events.push({id,event,data}); }}; } }
const server = vm.createContext({...serverClock, console: {log(){}}, process: {env:{}}, __dirname: '.', require(name){
    if(name==='express') return express;
    if(name==='http') return {createServer:()=>({listen(){}})};
    if(name==='socket.io') return {Server};
    return require(name);
}});
vm.runInContext(fs.readFileSync('server.js','utf8'),server);
vm.runInContext(`
    const testRoom=createRoom({id:'host-socket'},{turnTimer:10});
    testRoom.players.guest={id:'guest-socket', shots:0, hits:0};
    testRoom.gameStarted=true;
    scheduleRoomTurnTimer(testRoom);
`, server);
serverClock.run();
assert.equal(vm.runInContext('testRoom.currentTurn',server),'guest');
assert.equal(vm.runInContext('testRoom.players.host.shots',server),0);
assert.equal(events.length,2);
assert.deepEqual(events.map(e=>e.data.isYourTurn),[false,true]);
serverClock.run();
assert.equal(vm.runInContext('testRoom.currentTurn',server),'host');
vm.runInContext('testRoom.gameOver=true; scheduleRoomTurnTimer(testRoom)',server);
assert.equal(serverClock.jobs.size,0);
console.log('PASS: timeout skips without shots, single handoff, delayed callback cancellation, bonus shot expiry, server online expiry.');
