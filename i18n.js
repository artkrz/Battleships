// ================== I18N ==================
// Static text: data-i18n="key" (textContent), data-i18n-html="key" (trusted markup),
// data-i18n-attr="attr:key;attr:key", optional data-i18n-params='{"n":10}'.
// Param values may be {"key": "...", "params": {...}} to nest translated text,
// so that stored text re-renders correctly after a language switch.

const TRANSLATIONS = {
    pl: {
        'meta.title': 'Statki - Gra dla dwóch graczy',
        'brand.aria': 'Statki — menu główne',
        'brand.name': 'STATKI',
        'brand.edition': ' / DOWÓDZTWO FLOTY',
        'masthead.status': 'FLOTA W GOTOWOŚCI',
        'lang.label': 'Język',
        'sound.on': 'Dźwięk: wł.',
        'sound.off': 'Dźwięk: wył.',

        'start.artTag': 'OPERACJA 01 / MORZE PÓŁNOCNE',
        'start.eyebrow': 'TAKTYCZNA BITWA MORSKA',
        'start.headline': 'OCEAN NIE<br>WYBACZA<span>.</span>',
        'start.tagline': 'Twoja flota. Twoja taktyka.<br>Zatop przeciwnika, zanim on znajdzie Ciebie.',
        'start.local': 'Graj na jednym urządzeniu<small>Gracie na zmianę, bez podglądania</small>',
        'start.online': 'Rzuć wyzwanie online<small>Zaproś znajomego kodem pokoju</small>',
        'start.players': '02 GRACZY',
        'start.boards': '10 × 10 LUB 15 × 15',
        'start.motto': 'TWÓJ RUCH. TWOJA TAKTYKA.',

        'options.eyebrow': '01 / PRZYGOTOWANIE OPERACJI',
        'options.title': 'Zasady starcia',
        'options.intro': 'Ustal warunki. Reszta zależy od Twojej taktyki.',
        'options.boardSize': 'Rozmiar planszy:',
        'options.classic': '10x10 (klasyczna)',
        'options.large': '15x15 (duża)',
        'options.shootAgain': 'Dodatkowy strzał po trafieniu:',
        'options.off': 'Wyłączone',
        'options.on': 'Włączone',
        'options.timer': 'Limit czasu na turę:',
        'options.noLimit': 'Brak limitu',
        'options.seconds': '{n} sekund',
        'options.start': 'Rozpocznij grę',
        'common.back': '← Powrót',
        'common.cancel': 'Anuluj',

        'lobby.eyebrow': 'ŁĄCZNOŚĆ MIĘDZY FLOTAMI',
        'lobby.title': 'Rzuć wyzwanie',
        'lobby.intro': 'Dwa telefony. Jeden ocean. Zaproś znajomego do bitwy.',
        'lobby.create': 'Utwórz nowy pokój ↗',
        'lobby.or': 'lub',
        'lobby.haveInvite': 'MASZ JUŻ ZAPROSZENIE?',
        'lobby.join': 'Dołącz do pokoju',
        'lobby.hint': 'Kod pokoju znajdziesz u osoby, która go utworzyła.',
        'lobby.codeIncomplete': 'Wpisz pełny, sześcioznakowy kod pokoju.',
        'error.room-not-found': 'Pokój nie istnieje',
        'error.room-full': 'Pokój jest pełny',
        'error.game-started': 'Gra już się rozpoczęła',
        'error.unknown': 'Nie udało się dołączyć do pokoju',

        'waiting.eyebrow': 'KANAŁ ŁĄCZNOŚCI OTWARTY',
        'waiting.title': 'Zaproś przeciwnika',
        'waiting.intro': 'Wyślij kod znajomemu. Gdy dołączy, rozmieścicie floty.',
        'waiting.codeLabel': 'TWÓJ KOD OPERACJI',
        'waiting.copy': 'Kopiuj kod',
        'waiting.copied': '✓ Skopiowano!',
        'waiting.copyError': '✗ Błąd',
        'waiting.share': 'Udostępnij ↗',
        'waiting.linkCopied': '✓ Link skopiowany!',
        'waiting.linkLabel': 'LINK DO GRY',
        'waiting.copyLink': 'Kopiuj link',
        'waiting.qr': 'Kod QR do zeskanowania',
        'waiting.qrAlt': 'Kod QR z zaproszeniem do tego pokoju',
        'waiting.text': 'Prześlij kod lub link znajomemu...',
        'share.title': 'Statki - Dołącz do gry!',
        'share.text': 'Dołącz do mojej gry w Statki! Kod pokoju: {code}',

        'setup.eyebrow': '02 / MOBILIZACJA FLOTY',
        'setup.titlePlayer': 'Gracz {n} - Rozmieść statki',
        'setup.titleOnline': 'Rozmieść swoje statki',
        'setup.intro': 'Wybierz okręt i dotknij miejsca na mapie.',
        'setup.fleetHeading': 'FLOTA DO ROZMIESZCZENIA',
        'setup.rotate': 'Obróć ({dir})',
        'setup.horizontal': 'poziomo',
        'setup.vertical': 'pionowo',
        'setup.random': 'Losowo',
        'setup.mapHeading': 'OBSZAR ROZMIESZCZENIA',
        'setup.active': '● AKTYWNY',
        'setup.pickFromList': 'Wybierz okręt z listy powyżej',
        'setup.reset': 'Resetuj',
        'setup.confirm': 'Zatwierdź ustawienie',
        'setup.fleetReady': 'Flota gotowa. Zatwierdź ustawienie.',
        'setup.pickNext': 'Wybierz kolejny okręt lub użyj losowego ustawienia.',
        'setup.placeShip': '{ship}: dotknij mapy, aby rozmieścić okręt.',
        'setup.selectFirst': 'Najpierw wybierz okręt z listy.',
        'setup.noFit': 'Tu okręt się nie zmieści. Zostaw też odstęp od innych statków.',
        'ship.carrier': 'Lotniskowiec{n}',
        'ship.battleship': 'Pancernik{n}',
        'ship.cruiser': 'Krążownik{n}',
        'ship.submarine': 'Łódź podwodna{n}',
        'ship.destroyer': 'Niszczyciel{n}',

        'transition.eyebrow': 'PRZEKAZANIE DOWODZENIA',
        'transition.passTo': 'Czas na gracza {n}',
        'transition.noPeek': 'Nie podglądaj planszy przeciwnika!',
        'transition.gameStarts': 'Gra rozpoczyna się! Czas na gracza 1',
        'transition.timeUp': 'Czas minął — tura przepada bez strzału.',
        'transition.ready': 'Gotowy',

        'onlineWaiting.eyebrow': 'TWOJA FLOTA W GOTOWOŚCI',
        'onlineWaiting.title': 'Ostatnie przygotowania',
        'onlineWaiting.intro': 'Przeciwnik rozmieszcza swoje okręty.<br>Bitwa rozpocznie się, gdy będzie gotowy.',
        'onlineWaiting.pill': 'Oczekiwanie na sygnał',

        'game.eyebrow': 'OPERACJA W TOKU / TRYB TAKTYCZNY',
        'game.turnOf': 'Tura gracza {n}',
        'game.yourTurn': 'Twoja tura - strzelaj!',
        'game.enemyTurn': 'Tura przeciwnika...',
        'game.tapToFire': 'Dotknij pola na wodach przeciwnika, aby oddać strzał.',
        'game.pickTarget': 'Wybierz cel na wodach przeciwnika.',
        'game.waitForEnemy': 'Poczekaj na strzał przeciwnika.',
        'game.fleetCount': {
            one: '{label}: <span class="ship-count">{count}</span> statek',
            few: '{label}: <span class="ship-count">{count}</span> statki',
            many: '{label}: <span class="ship-count">{count}</span> statków',
            other: '{label}: <span class="ship-count">{count}</span> statku'
        },
        'game.you': 'Ty',
        'game.opponent': 'Przeciwnik',
        'game.player': 'Gracz {n}',
        'game.enemyWaters': 'Wody przeciwnika',
        'game.selectTarget': '⌖ WYBIERZ CEL',
        'game.hit': 'Trafienie',
        'game.miss': 'Pudło',
        'game.sunk': 'Zatopiony',
        'game.yourFleet': 'Twoja flota',
        'game.toggle': 'Pokaż / zwiń',
        'game.yourShips': 'Twoje okręty',
        'game.endTurn': 'Zakończ turę',
        'battle.shotReport': '{who} · {coord} · {result}',
        'battle.yourShot': 'Twój strzał',
        'battle.opponent': 'Przeciwnik',
        'battle.sunk': 'Okręt zatopiony',
        'alert.disconnected': 'Przeciwnik rozłączył się',

        'gameover.eyebrow': 'RAPORT KOŃCOWY / BITWA ZAKOŃCZONA',
        'gameover.victory': 'Zwycięstwo!',
        'gameover.defeat': 'Flota pokonana',
        'gameover.playerWins': 'Gracz {n} zwycięża',
        'gameover.captionDefault': 'Ostatnia salwa. Ocean zna już zwycięzcę.',
        'gameover.captionLost': 'Flota stracona. Następna operacja może należeć do Ciebie.',
        'gameover.captionWon': 'Misja zakończona. Przewaga na oceanie należy do Ciebie.',
        'gameover.series': 'WYNIK POJEDYNKU',
        'gameover.fleetDefeated': 'POKONANA',
        'gameover.fleetVictorious': 'ZWYCIĘSKA',
        'gameover.winner': 'ZWYCIĘZCA',
        'gameover.loser': 'POKONANY',
        'gameover.shots': 'Strzały',
        'gameover.hits': 'Trafienia',
        'gameover.accuracy': 'Celność',
        'gameover.playAgain': 'Zagraj ponownie',
        'gameover.leave': 'Wyjdź do menu',
        'gameover.waitingRematch': 'Oczekiwanie na przeciwnika...',
        'gameover.rematchReady': '✓ Przeciwnik chce rewanżu - kliknij!'
    },
    en: {
        'meta.title': 'Battleships - Two-player naval battle',
        'brand.aria': 'Battleships — main menu',
        'brand.name': 'BATTLESHIPS',
        'brand.edition': ' / FLEET COMMAND',
        'masthead.status': 'FLEET STANDING BY',
        'lang.label': 'Language',
        'sound.on': 'Sound: on',
        'sound.off': 'Sound: off',

        'start.artTag': 'OPERATION 01 / NORTH SEA',
        'start.eyebrow': 'TACTICAL NAVAL BATTLE',
        'start.headline': 'NO MERCY<br>AT SEA<span>.</span>',
        'start.tagline': 'Your fleet. Your tactics.<br>Sink the enemy before they find you.',
        'start.local': 'Play on the same device<small>Take turns, no peeking</small>',
        'start.online': 'Challenge online<small>Invite a friend with a room code</small>',
        'start.players': '02 PLAYERS',
        'start.boards': '10 × 10 OR 15 × 15',
        'start.motto': 'YOUR MOVE. YOUR TACTICS.',

        'options.eyebrow': '01 / OPERATION BRIEFING',
        'options.title': 'Rules of engagement',
        'options.intro': 'Set the terms. The rest is down to your tactics.',
        'options.boardSize': 'Board size:',
        'options.classic': '10x10 (classic)',
        'options.large': '15x15 (large)',
        'options.shootAgain': 'Extra shot after a hit:',
        'options.off': 'Off',
        'options.on': 'On',
        'options.timer': 'Turn time limit:',
        'options.noLimit': 'No limit',
        'options.seconds': '{n} seconds',
        'options.start': 'Start game',
        'common.back': '← Back',
        'common.cancel': 'Cancel',

        'lobby.eyebrow': 'FLEET-TO-FLEET LINK',
        'lobby.title': 'Issue a challenge',
        'lobby.intro': 'Two phones. One ocean. Invite a friend to battle.',
        'lobby.create': 'Create a new room ↗',
        'lobby.or': 'or',
        'lobby.haveInvite': 'ALREADY HAVE AN INVITE?',
        'lobby.join': 'Join room',
        'lobby.hint': 'Get the room code from the person who created the room.',
        'lobby.codeIncomplete': 'Enter the full six-character room code.',
        'error.room-not-found': 'Room does not exist',
        'error.room-full': 'Room is full',
        'error.game-started': 'The game has already started',
        'error.unknown': 'Could not join the room',

        'waiting.eyebrow': 'COMMS CHANNEL OPEN',
        'waiting.title': 'Invite your opponent',
        'waiting.intro': 'Send the code to a friend. Once they join, you will both deploy your fleets.',
        'waiting.codeLabel': 'YOUR OPERATION CODE',
        'waiting.copy': 'Copy code',
        'waiting.copied': '✓ Copied!',
        'waiting.copyError': '✗ Error',
        'waiting.share': 'Share ↗',
        'waiting.linkCopied': '✓ Link copied!',
        'waiting.linkLabel': 'INVITE LINK',
        'waiting.copyLink': 'Copy link',
        'waiting.qr': 'QR code to scan',
        'waiting.qrAlt': 'QR code with an invite to this room',
        'waiting.text': 'Send the code or link to a friend...',
        'share.title': 'Battleships - Join the game!',
        'share.text': 'Join my Battleships game! Room code: {code}',

        'setup.eyebrow': '02 / FLEET MOBILISATION',
        'setup.titlePlayer': 'Player {n} - Deploy your ships',
        'setup.titleOnline': 'Deploy your ships',
        'setup.intro': 'Pick a ship and tap a spot on the map.',
        'setup.fleetHeading': 'FLEET TO DEPLOY',
        'setup.rotate': 'Rotate ({dir})',
        'setup.horizontal': 'horizontal',
        'setup.vertical': 'vertical',
        'setup.random': 'Random',
        'setup.mapHeading': 'DEPLOYMENT AREA',
        'setup.active': '● ACTIVE',
        'setup.pickFromList': 'Pick a ship from the list above',
        'setup.reset': 'Reset',
        'setup.confirm': 'Confirm deployment',
        'setup.fleetReady': 'Fleet ready. Confirm your deployment.',
        'setup.pickNext': 'Pick the next ship or use random placement.',
        'setup.placeShip': '{ship}: tap the map to place it.',
        'setup.selectFirst': 'Pick a ship from the list first.',
        'setup.noFit': "The ship won't fit here. Keep a gap from other ships, too.",
        'ship.carrier': 'Carrier{n}',
        'ship.battleship': 'Battleship{n}',
        'ship.cruiser': 'Cruiser{n}',
        'ship.submarine': 'Submarine{n}',
        'ship.destroyer': 'Destroyer{n}',

        'transition.eyebrow': 'HANDOVER OF COMMAND',
        'transition.passTo': "Player {n}, you're up",
        'transition.noPeek': "Don't peek at your opponent's board!",
        'transition.gameStarts': "The battle begins! Player 1, you're up",
        'transition.timeUp': 'Time is up — the turn is lost without a shot.',
        'transition.ready': 'Ready',

        'onlineWaiting.eyebrow': 'YOUR FLEET IS READY',
        'onlineWaiting.title': 'Final preparations',
        'onlineWaiting.intro': 'Your opponent is deploying their ships.<br>The battle starts when they are ready.',
        'onlineWaiting.pill': 'Waiting for signal',

        'game.eyebrow': 'OPERATION UNDERWAY / TACTICAL MODE',
        'game.turnOf': "Player {n}'s turn",
        'game.yourTurn': 'Your turn - fire!',
        'game.enemyTurn': "Opponent's turn...",
        'game.tapToFire': 'Tap a square in enemy waters to fire.',
        'game.pickTarget': 'Pick a target in enemy waters.',
        'game.waitForEnemy': "Wait for your opponent's shot.",
        'game.fleetCount': {
            one: '{label}: <span class="ship-count">{count}</span> ship',
            other: '{label}: <span class="ship-count">{count}</span> ships'
        },
        'game.you': 'You',
        'game.opponent': 'Opponent',
        'game.player': 'Player {n}',
        'game.enemyWaters': 'Enemy waters',
        'game.selectTarget': '⌖ SELECT TARGET',
        'game.hit': 'Hit',
        'game.miss': 'Miss',
        'game.sunk': 'Sunk',
        'game.yourFleet': 'Your fleet',
        'game.toggle': 'Show / hide',
        'game.yourShips': 'Your ships',
        'game.endTurn': 'End turn',
        'battle.shotReport': '{who} · {coord} · {result}',
        'battle.yourShot': 'Your shot',
        'battle.opponent': 'Opponent',
        'battle.sunk': 'Ship sunk',
        'alert.disconnected': 'Your opponent disconnected',

        'gameover.eyebrow': 'FINAL REPORT / BATTLE OVER',
        'gameover.victory': 'Victory!',
        'gameover.defeat': 'Fleet defeated',
        'gameover.playerWins': 'Player {n} wins',
        'gameover.captionDefault': 'The final salvo. The ocean knows the victor.',
        'gameover.captionLost': 'Fleet lost. The next operation could be yours.',
        'gameover.captionWon': 'Mission complete. The ocean is yours.',
        'gameover.series': 'MATCH SCORE',
        'gameover.fleetDefeated': 'DEFEATED',
        'gameover.fleetVictorious': 'VICTORIOUS',
        'gameover.winner': 'WINNER',
        'gameover.loser': 'DEFEATED',
        'gameover.shots': 'Shots',
        'gameover.hits': 'Hits',
        'gameover.accuracy': 'Accuracy',
        'gameover.playAgain': 'Play again',
        'gameover.leave': 'Back to menu',
        'gameover.waitingRematch': 'Waiting for opponent...',
        'gameover.rematchReady': '✓ Opponent wants a rematch - tap!'
    }
};

const SUPPORTED_LANGUAGES = Object.keys(TRANSLATIONS);
const DEFAULT_LANGUAGE = 'en';
const LANGUAGE_STORAGE_KEY = 'battleships-language';

function readStoredLanguage() {
    try {
        return globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY) || null;
    } catch {
        return null;
    }
}

// Pick a language from an ordered list of browser locales, e.g. ['pl-PL', 'en'].
function matchLanguage(locales) {
    for (const locale of locales || []) {
        const base = String(locale).toLowerCase().split('-')[0];
        if (SUPPORTED_LANGUAGES.includes(base)) return base;
    }
    return DEFAULT_LANGUAGE;
}

function detectLanguage() {
    const stored = readStoredLanguage();
    if (SUPPORTED_LANGUAGES.includes(stored)) return stored;
    const nav = globalThis.navigator;
    return matchLanguage(nav ? (nav.languages?.length ? nav.languages : [nav.language]) : []);
}

let currentLanguage = detectLanguage();

function resolveParam(value) {
    if (value && typeof value === 'object' && value.key) return t(value.key, value.params);
    return value;
}

function t(key, params = {}) {
    let entry = TRANSLATIONS[currentLanguage][key] ?? TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;
    if (typeof entry === 'object') {
        const rule = typeof Intl !== 'undefined' ? new Intl.PluralRules(currentLanguage).select(params.count) : 'other';
        entry = entry[rule] ?? entry.other;
    }
    return entry.replace(/\{(\w+)\}/g, (match, name) => (name in params ? resolveParam(params[name]) : match));
}

function storeI18n(el, attr, key, params) {
    el.dataset[attr] = key;
    if (params) el.dataset.i18nParams = JSON.stringify(params);
    else delete el.dataset.i18nParams;
}

// Set an element's text and remember the key so a language switch re-renders it.
function setText(el, key, params) {
    if (typeof el === 'string') el = document.getElementById(el);
    storeI18n(el, 'i18n', key, params);
    el.textContent = t(key, params);
}

// Same as setText, for translations that contain trusted markup (params must be safe).
function setHTML(el, key, params) {
    if (typeof el === 'string') el = document.getElementById(el);
    storeI18n(el, 'i18nHtml', key, params);
    el.innerHTML = t(key, params);
}

function escapeAttr(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Markup for a translated span inside HTML built with template strings.
function i18nSpan(key, params, className = '') {
    const cls = className ? ` class="${className}"` : '';
    const data = params ? ` data-i18n-params="${escapeAttr(JSON.stringify(params))}"` : '';
    return `<span${cls} data-i18n="${key}"${data}>${escapeAttr(t(key, params))}</span>`;
}

function readParams(el) {
    try {
        return el.dataset.i18nParams ? JSON.parse(el.dataset.i18nParams) : undefined;
    } catch {
        return undefined;
    }
}

function applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n, readParams(el));
    });
    root.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.dataset.i18nHtml, readParams(el));
    });
    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
        el.dataset.i18nAttr.split(';').forEach(pair => {
            const [attr, key] = pair.split(':');
            if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
        });
    });
    if (root === document) {
        document.documentElement.lang = currentLanguage;
        document.querySelectorAll('[data-lang]').forEach(btn => {
            btn.setAttribute('aria-pressed', String(btn.dataset.lang === currentLanguage));
        });
    }
}

function setLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    currentLanguage = lang;
    try {
        globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
        // Storage can be unavailable (private mode); the choice then lasts for this visit.
    }
    applyTranslations();
}

if (typeof document !== 'undefined' && document.documentElement) {
    document.querySelectorAll('[data-lang]').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
    applyTranslations();
}
