const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const source = fs.readFileSync('i18n.js', 'utf8');
function load(globals = {}) {
    const context = vm.createContext({ ...globals });
    vm.runInContext(source, context);
    return expression => vm.runInContext(expression, context);
}

// Both dictionaries define the same keys, plural forms and placeholders.
const get = load();
const dict = get('TRANSLATIONS');
const placeholders = value => JSON.stringify(value).match(/\{\w+\}/g)?.sort() ?? [];
for (const [a, b] of [['pl', 'en'], ['en', 'pl']]) {
    for (const key of Object.keys(dict[a])) {
        assert.ok(key in dict[b], `${b} is missing "${key}"`);
        assert.equal(typeof dict[a][key], typeof dict[b][key], `type mismatch for "${key}"`);
    }
}
for (const key of Object.keys(dict.pl)) {
    const pl = Object.values(Object(dict.pl[key])).length ? Object.values(dict.pl[key]) : [dict.pl[key]];
    const en = Object.values(Object(dict.en[key])).length ? Object.values(dict.en[key]) : [dict.en[key]];
    assert.deepEqual([...new Set(pl.flatMap(placeholders))], [...new Set(en.flatMap(placeholders))], `placeholders differ for "${key}"`);
}

// Every key used in index.html and game.js exists.
const used = new Set();
const html = fs.readFileSync('index.html', 'utf8');
for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) used.add(m[1]);
for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) m[1].split(';').forEach(p => used.add(p.split(':')[1]));
for (const m of html.matchAll(/"key":"([^"]+)"/g)) used.add(m[1]);
const game = fs.readFileSync('game.js', 'utf8');
for (const m of game.matchAll(/'((?:[a-zA-Z]+)\.[a-zA-Z-]+)'/g)) if (m[1].split('.')[0] in { meta:1, brand:1, sound:1, start:1, options:1, common:1, lobby:1, error:1, waiting:1, share:1, setup:1, ship:1, transition:1, onlineWaiting:1, game:1, battle:1, alert:1, gameover:1 }) used.add(m[1]);
for (const key of used) assert.ok(key in dict.en && key in dict.pl, `unknown key "${key}"`);
for (const code of ['room-not-found', 'room-full', 'game-started']) assert.ok(`error.${code}` in dict.en);

// Detection: saved choice wins, then browser languages in order, then English.
assert.equal(load({ navigator: { languages: ['pl-PL', 'en'] } })('currentLanguage'), 'pl');
assert.equal(load({ navigator: { languages: ['de-DE', 'pl'] } })('currentLanguage'), 'pl');
assert.equal(load({ navigator: { languages: ['de-DE', 'fr'] } })('currentLanguage'), 'en');
assert.equal(load({ navigator: { languages: [], language: 'pl' } })('currentLanguage'), 'pl');
assert.equal(load({})('currentLanguage'), 'en');
const storage = { getItem: () => 'en', setItem() {} };
assert.equal(load({ navigator: { languages: ['pl'] }, localStorage: storage })('currentLanguage'), 'en');
const broken = { getItem() { throw new Error('denied'); } };
assert.equal(load({ navigator: { languages: ['pl'] }, localStorage: broken })('currentLanguage'), 'pl');

// Interpolation, nested keys and plurals.
const pl = load({ navigator: { languages: ['pl'] } });
assert.equal(pl("t('setup.rotate', { dir: { key: 'setup.vertical' } })"), 'Obróć (pionowo)');
assert.equal(pl("t('ship.cruiser', { n: ' 2' })"), 'Krążownik 2');
const count = n => pl(`t('game.fleetCount', { label: { key: 'game.you' }, count: ${n} })`).replace(/<[^>]+>/g, '');
assert.equal(count(1), 'Ty: 1 statek');
assert.equal(count(3), 'Ty: 3 statki');
assert.equal(count(5), 'Ty: 5 statków');
assert.equal(count(0), 'Ty: 0 statków');
const en = load({});
assert.equal(en("t('game.fleetCount', { label: { key: 'game.opponent' }, count: 1 })").replace(/<[^>]+>/g, ''), 'Opponent: 1 ship');
assert.equal(en("t('game.fleetCount', { label: { key: 'game.opponent' }, count: 4 })").replace(/<[^>]+>/g, ''), 'Opponent: 4 ships');
assert.equal(en("t('missing.key')"), 'missing.key');

console.log(`PASS: ${Object.keys(dict.en).length} keys in pl/en, ${used.size} used keys resolve, detection, plurals.`);
