# 🚢 Statki (Battleships)

A web-based mobile Battleship game for two players with local and online multiplayer support.

## Play Online

[Play Battleships](https://battleships-prrn.onrender.com/)

Production is hosted on Render and deploys automatically when a pull request is merged into `main`.

## Features

- **Local multiplayer** - Hot-seat mode for two players on one device
- **Online multiplayer** - Play with friends over the internet using room codes
- **QR code sharing** - Easily share room links via QR code or native share
- **Sound effects** - Audio feedback for hits, misses, sinks, and game events
- **Responsive design** - Optimized for mobile devices
- **Ship visualization** - Ships display with bow, body, and stern sections
- **Rematch system** - Play again in the same room with score tracking
- **Polish and English** - Language is detected from the browser (Polish for `pl*` locales, English otherwise) and can be switched with the PL / EN picker in the header; the choice is remembered on the device

## How to Play

1. Place your 5 ships on the grid:
   - Carrier (5 cells)
   - Battleship (4 cells)
   - Cruiser (3 cells)
   - Submarine (3 cells)
   - Destroyer (2 cells)

2. Take turns firing at your opponent's grid
3. First player to sink all enemy ships wins!

## Running with Docker

```bash
# Build and start
docker compose up -d

# Stop
docker compose down
```

Then open http://localhost:3000 in your browser.

Run the tests with `npm test`.

## Translations

All UI text lives in `i18n.js` (`pl` and `en` dictionaries). Static markup uses `data-i18n` / `data-i18n-html` / `data-i18n-attr` attributes; dynamic text is set with `setText(element, key, params)` so it re-renders when the language changes. `npm test` checks that both languages define the same keys and placeholders.

## Running Locally (without Docker)

```bash
# Install dependencies
npm install

# Start the server
node server.js
```

Then open http://localhost:3000 in your browser.

## Online Play

1. Click "Challenge online" ("Rzuć wyzwanie online")
2. Create a room and share the 6-character code with a friend
3. Or scan the QR code / use the share button
4. Both players place their ships
5. Battle!

## Tech Stack

- Node.js + Express
- Socket.io for real-time communication
- Vanilla JavaScript
- CSS3 with animations
- Docker for containerization

## License

MIT
