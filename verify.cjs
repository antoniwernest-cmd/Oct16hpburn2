const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const here = __dirname;
const dataSource = fs.readFileSync(path.join(here, 'stories.js'), 'utf8');
const appSource = fs.readFileSync(path.join(here, 'app.js'), 'utf8');
new vm.Script(dataSource);
new vm.Script(appSource);
const dataContext = {window:{}};
vm.runInNewContext(dataSource, dataContext);
const story = dataContext.window.RIVER_STORY;
assert.equal(story.title, 'The Mystery of the Black Forest');
assert.equal(story.levels.length, 7);
assert.deepEqual(Array.from(story.levels, level => level.label), ['CVC','Pathway','Excite','Excite/Inspire','Inspire','Explorer A','Explorer B']);
const counts = [];
const vagueFeatures = [];
for (const level of story.levels) {
  const paragraphs = story.passages[level.id];
  assert.ok(Array.isArray(paragraphs) && paragraphs.length >= 3);
  const text = paragraphs.join(' ').toLowerCase();
  assert.match(paragraphs[0], /Peter and Luna/);
  assert.match(paragraphs[0], /new frisbee/);
  assert.match(paragraphs[0], /annual burn/);
  for (const detail of ['peter','luna','high park','worker','roots','seeds','shoot','butterflies']) assert.ok(text.includes(detail), 'Level ' + level.id + ' keeps ' + detail);
  const count = paragraphs.reduce((total, paragraph) => total + paragraph.split(/\s+/).filter(Boolean).length, 0);
  counts[level.id] = count;
  if (level.id > 0) assert.ok(count > counts[level.id - 1], 'levels get longer');
  const page = fs.readFileSync(path.join(here, (level.id === 0 ? 'CVC' : 'Level' + level.id) + '.html'), 'utf8');
  assert.match(page, new RegExp('data-level="' + level.id + '"'));
  assert.ok(page.includes(story.title));
  assert.match(page, /stories\.js/);
  assert.match(page, /app\.js/);
}
for (let id = 1; id <= 5; id++) {
  assert.equal(fs.existsSync(path.join(here, 'Story' + id + '.html')), false, 'obsolete different-story page removed');
}
const landing = fs.readFileSync(path.join(here, 'index.html'), 'utf8');
assert.match(landing, /data-page="home"/);
assert.match(landing, /styles\.css/);

function fakeElement() {
  const classes = new Set();
  return {
    innerHTML: '', textContent: '', value: '', hidden: false, style: {}, scrollTop: 0,
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, force) { if (force) classes.add(name); else classes.delete(name); }
    },
    listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    setAttribute() {},
    querySelectorAll() { return []; }
  };
}
function runApp(page, level, options = {}) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, fakeElement());
    return elements.get(id);
  };
  const storage = options.storage || new Map();
  let clock = Date.now();
  class TestDate extends Date {
    static now() { return clock; }
  }
  const windowObject = {
    RIVER_STORY: story,
    innerWidth: 1440,
    listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    confirm() { return true; },
    printCalls: 0,
    print() { this.printCalls++; }
  };
  const context = {
    window: windowObject,
    document: {
      body: {dataset: {page, level: String(level ?? '')}},
      getElementById: get,
      querySelector(selector) { return selector === '.teacher-column' ? get('teacher-column') : null; },
      querySelectorAll(selector) {
        if (selector === '[data-code]') return ['NM','M','REV','I'].map(code=>{const input=get('code-'+code);input.dataset={code};return input;});
        return [];
      }
    },
    location: {search:options.search || '?student=TestReader'},
    localStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key,value) { storage.set(key,value); }
    },
    URLSearchParams, Date:TestDate, Number, Object, String, Math, console,
    setInterval() {},
    requestAnimationFrame(fn) { fn(); }
  };
  vm.runInNewContext(appSource, context);
  return {elements, storage, windowObject, get, advance(ms) { clock += ms; }};
}

const home = runApp('home');
assert.match(home.get('app').innerHTML, /One story/);
assert.equal((home.get('story-grid').innerHTML.match(/class="card story-card"/g) || []).length, 7);
assert.match(home.get('story-grid').innerHTML, /CVC\.html\?student=TestReader/);
assert.doesNotMatch(home.get('app').innerHTML + home.get('story-grid').innerHTML, /\bJK\b/i);
assert.match(home.get('story-grid').innerHTML, /fresh=/);
assert.match(home.get('story-grid').innerHTML, /Level6\.html\?student=TestReader/);
assert.equal(home.get('story-grid').hidden, true);
assert.equal((home.get('app').innerHTML.match(/class="student-tile"/g)||[]).length, 20);
for (const id of ["pencil","crayon","eraser","ruler","glue","scissors","notebook","book","backpack","marker","paintbrush","palette","calculator","sharpener","paper-clip","stapler","tape","folder","compass","highlighter"]) assert.ok(fs.existsSync(path.join(here,'assets','supplies',id+'.svg')));
home.get('studentChooser').listeners.click({target:{closest(){return {dataset:{student:'pencil'}};}}});
assert.equal(home.get('story-grid').hidden, false);
assert.equal(home.get('studentChooser').hidden, true);
assert.match(home.get('studentSelected').innerHTML, /Pencil · Student ID/);
assert.equal(JSON.parse(home.storage.get('riverreader2:prefs')).student, 'pencil');
assert.match(home.get('story-grid').innerHTML, /Level6\.html\?student=pencil/);
const entryLink = {dataset:{freshLevel:'0'}, href:''};
home.get('app').listeners.click({target:{closest() { return entryLink; }}});
assert.match(entryLink.href, /CVC\.html\?student=pencil&fresh=/);
const firstEntryHref = entryLink.href;
home.get('app').listeners.click({target:{closest() { return entryLink; }}});
assert.notEqual(entryLink.href, firstEntryHref, 'each story selection gets a new assessment entry');

home.get('changeStudent').listeners.click();
assert.equal(home.get('studentChooser').hidden, false);
assert.equal(home.get('story-grid').hidden, true);
home.get('studentChooser').listeners.click({target:{closest(){return {dataset:{student:'crayon'}};}}});
assert.match(home.get('story-grid').innerHTML, /student=crayon/);
const pencilStore = new Map([['riverreader2:v2:pencil:level1', JSON.stringify({notes:'Pencil record'})]]);
const pencilReader = runApp('reader',1,{search:'?student=pencil',storage:pencilStore});
const crayonReader = runApp('reader',1,{search:'?student=crayon',storage:pencilStore});
assert.match(pencilReader.get('app').innerHTML, /Pencil record/);
assert.doesNotMatch(crayonReader.get('app').innerHTML, /Pencil record/);
pencilReader.get('print-button').listeners.click();
assert.match(pencilReader.get('print-report').innerHTML, new RegExp('Student:</strong> Pencil'));

for (const level of story.levels) {
  const app = runApp('reader', level.id);
  const html = app.get('app').innerHTML;
  assert.ok(html.includes(story.title));
  assert.ok(html.includes(level.label));
  const buttons = (html.match(/class="word-token"/g) || []).length;
  assert.equal(buttons, counts[level.id], 'every word in level ' + level.id + ' is tappable');
  if (level.id === 0) {
    assert.match(html, /CVC words to sound out/);
    assert.match(html, /Teacher: preview story words/);
    assert.doesNotMatch(html, /\bJK\b/i);
    assert.match(app.get('next-story').innerHTML, /Level1\.html/);
  }
  if (level.id === 1) assert.match(app.get('previous-story').innerHTML, /CVC\.html/);
  if (level.id === 5) assert.match(app.get('next-story').innerHTML, /Level6\.html/);
  if (level.id === 6) assert.equal(app.get('next-story').innerHTML, '');
  assert.match(html, /Print \/ Save PDF/);
  assert.doesNotMatch(html, /Highlight safe route/);
  assert.doesNotMatch(html, /map-frame/);
  assert.equal((html.match(/<polygon points=/g) || []).length, 0);
  assert.match(html, /Reading behaviours/);
  assert.match(html, /Reading strategies/);
  assert.match(html, /Read-aloud timer/);
  assert.match(html, /Omit word/);
  assert.match(html, /first-sound-yes/);
  assert.match(html, /<div id="selection-slot"[^>]*><section id="selection-box"/);
  assert.ok(html.indexOf('id="selection-slot"') < html.indexOf('Live record'), 'word checks appear above metrics in the side panel');
  assert.match(app.get('questions').innerHTML, /Why was the fire planned/);
  assert.match(app.get('questions').innerHTML, /How did Peter and Luna feel/);
  assert.match(app.get('questions').innerHTML, /Nature Detectives observe/);
  assert.equal(app.get('metric-total').textContent, buttons);
  assert.equal(app.get('metric-correct').textContent, buttons);
  assert.equal(app.get('metric-omissions').textContent, 0);
  app.get('print-button').listeners.click();
  const report = app.get('print-report').innerHTML;
  assert.equal((report.match(/class="word-result"/g) || []).length, buttons, 'PDF lists every word at level ' + level.id);
  assert.match(report, /<th>Feature<\/th><th>Significance<\/th>/);
  if (level.id === 0) {
    assert.match(report, /Reading level:<\/strong> CVC/);
    assert.doesNotMatch(report, /\bJK\b/i);
    assert.match(report, /<strong>jog<\/strong>/);
    assert.match(report, /Short vowel; CVC pattern/);
  }
  const levelWords = story.passages[level.id].join(' ').split(/\s+/).filter(Boolean);
  assert.equal(levelWords.length, buttons);
  levelWords.forEach((word, index) => {
    const info = app.windowObject.RIVER_READER_UTILS.wordInfo(word, index, levelWords);
    assert.ok(info.feature && info.significance, 'word ' + (index + 1) + ' has a feature and significance');
    assert.doesNotMatch(info.feature, /Story vocabulary/, 'word features are not indiscriminately called vocabulary');
    if (/Check the taught letter/.test(info.feature)) vagueFeatures.push('level ' + level.id + ', word ' + (index + 1) + ' (' + word + ')');
  });
}
assert.deepEqual(vagueFeatures, [], 'each passage word has a specific reading feature');
const featureApp = runApp('reader', 0);
const featureOf = word => featureApp.windowObject.RIVER_READER_UTILS.wordInfo(word, 0, [word]).feature;
assert.match(featureOf('felt'), /Short e; CVCC pattern; final consonant cluster \/lt\//);
assert.match(featureOf('map'), /CVC pattern/);
assert.match(featureOf('green'), /Initial consonant cluster \/gr\/; vowel team ee/);
assert.match(featureOf('path'), /Final consonant digraph th/);
assert.match(featureOf('said'), /Irregular high-frequency word/);
assert.match(featureOf('Peter'), /Proper name/);
assert.match(featureOf('saw'), /vowel team aw/i);
assert.match(featureOf('read'), /past-tense read/i);
assert.match(featureOf('around'), /a-round/);
assert.match(featureOf('use'), /u_e/);
const sharedStorage = new Map();
const savedKey = 'riverreader2:v2:TestReader:level1';
sharedStorage.set(savedKey, JSON.stringify({marks:{0:{status:'error'}},responses:{},observations:{},notes:'Keep this earlier attempt.',elapsed:12}));
const freshOne = runApp('reader', 1, {storage:sharedStorage,search:'?student=TestReader&fresh=entry-one'});
assert.equal(freshOne.get('metric-errors').textContent, 0, 'story entry starts a blank assessment');
assert.equal(freshOne.get('restore-button').hidden, false, 'earlier saved attempt is recoverable');
assert.match(JSON.parse(sharedStorage.get(savedKey + ':previous')).notes, /earlier attempt/);
freshOne.get('passage').listeners.click({target:{closest() { return {dataset:{word:'0'}}; }}});
freshOne.get('teacher-notes').listeners.input({target:{value:'Second attempt.'}});
const sameEntryReload = runApp('reader', 1, {storage:sharedStorage,search:'?student=TestReader&fresh=entry-one'});
assert.equal(sameEntryReload.get('metric-errors').textContent, 1, 'refreshing the same entry keeps current marks');
const freshTwo = runApp('reader', 1, {storage:sharedStorage,search:'?student=TestReader&fresh=entry-two'});
assert.equal(freshTwo.get('metric-errors').textContent, 0, 'opening the story again starts a new assessment');
freshTwo.get('restore-button').listeners.click();
assert.equal(freshTwo.get('metric-errors').textContent, 1, 'previous assessment can be restored');
assert.match(freshTwo.get('teacher-notes').value, /Second attempt/);
const styles = fs.readFileSync(path.join(here, 'styles.css'), 'utf8');
assert.match(styles, /\.teacher-column\{[^}]*position:sticky;top:12px/);
assert.doesNotMatch(styles, /\.selection-box\.is-floating/);
assert.match(styles, /@media\(max-width:980px\)\{\.reader-layout\{grid-template-columns:minmax\(0,1fr\) minmax\(280px,38%\)/);
const dock = runApp('reader', 3);
dock.get('teacher-column').scrollTop = 200;
dock.get('passage').listeners.click({target:{closest() { return {dataset:{word:'53'}}; }}});
assert.equal(dock.get('teacher-column').scrollTop, 0, 'new selection moves the side panel to its controls');

const test = runApp('reader', 3);
function tapWord(index) {
  test.get('passage').listeners.click({target:{closest() { return {dataset:{word:String(index)}}; }}});
}
test.get('print-button').listeners.click();
let report = test.get('print-report').innerHTML;
assert.equal((report.match(/data-status="correct"/g) || []).length, counts[3]);
assert.match(report, new RegExp('Correct without a correction:</strong> ' + counts[3]));
assert.match(report, /Read-aloud time:<\/strong> Not timed/);
tapWord(0);
let saved = JSON.parse([...test.storage.values()].find(value => value.includes('"marks"')));
assert.equal(saved.marks[0].status, 'error');
assert.equal(test.get('metric-errors').textContent, 1);
assert.equal(test.get('metric-correct').textContent, counts[3] - 1);
test.get('first-sound-yes').listeners.click();
saved = JSON.parse([...test.storage.values()].find(value => value.includes('"marks"')));
assert.equal(saved.marks[0].firstSound, 'yes');
assert.equal(test.get('metric-errors').textContent, 1, 'first sound remains an error');
test.get('print-button').listeners.click();
report = test.get('print-report').innerHTML;
assert.equal((report.match(/data-status="correct"/g) || []).length, counts[3] - 1);
assert.equal((report.match(/data-status="incorrect"/g) || []).length, 1);
assert.match(report, /First-letter sound on errors:<\/strong> Yes 1 · No 0/);
assert.match(report, /Names one of the High Park Nature Detectives/);
tapWord(1);
test.get('omit-word').listeners.click();
assert.equal(test.get('metric-omissions').textContent, 1);
assert.equal(test.get('metric-errors').textContent, 2);
assert.match(test.get('selection-word').textContent, /Omission #1/);
tapWord(2);
test.get('omit-word').listeners.click();
assert.equal(test.get('metric-omissions').textContent, 2);
assert.equal(test.get('metric-errors').textContent, 3);
assert.match(test.get('selection-word').textContent, /Omission #2/);
test.get('print-button').listeners.click();
report = test.get('print-report').innerHTML;
assert.equal((report.match(/data-status="omission"/g) || []).length, 2);
assert.match(report, /Omissions:<\/strong> 2/);
assert.match(report, /Omission #1/);
assert.match(report, /Omission #2/);
assert.match(report, /Errors \(including omissions\):<\/strong> 3/);
tapWord(1);
test.get('clear-mark').listeners.click();
tapWord(2);
assert.match(test.get('selection-word').textContent, /Omission #1/, 'remaining omission is renumbered');
test.get('clear-mark').listeners.click();
tapWord(0);
test.get('first-sound-no').listeners.click();
assert.equal(test.get('metric-errors').textContent, 1);
test.get('print-button').listeners.click();
assert.match(test.get('print-report').innerHTML, /First-letter sound on errors:<\/strong> Yes 0 · No 1/);
test.get('self-correct').listeners.click();
saved = JSON.parse([...test.storage.values()].find(value => value.includes('"marks"')));
assert.equal(saved.marks[0].status, 'self');
assert.equal(test.get('metric-errors').textContent, 0);
assert.equal(test.get('metric-self').textContent, 1);
test.get('reading-behaviours').listeners.click({target:{closest() {
  return {dataset:{observationValue:'observed'},closest() { return {dataset:{observation:'tracksPrint'}}; }};
}}});
test.get('reading-strategies').listeners.click({target:{closest() {
  return {dataset:{observationValue:'next'},closest() { return {dataset:{observation:'rereads'}}; }};
}}});
saved = JSON.parse([...test.storage.values()].find(value => value.includes('"marks"')));
assert.equal(saved.observations.tracksPrint, 'observed');
assert.equal(saved.observations.rereads, 'next');
test.get('questions').listeners.click({target:{closest() {
  return {dataset:{rating:'yes'},closest() { return {dataset:{question:'problem'}}; }};
}}});
test.get('teacher-notes').listeners.input({target:{value:'Used the map clues.'}});
test.get('timer-button').listeners.click();
test.advance(65000);
test.get('timer-button').listeners.click();
assert.equal(test.get('time-display').textContent, '1:05');
test.get('print-button').listeners.click();
assert.equal(test.windowObject.printCalls, 5);
assert.match(test.get('print-report').innerHTML, /Correct — student corrected/);
assert.match(test.get('print-report').innerHTML, /Used the map clues/);
assert.match(test.get('print-report').innerHTML, /Excite\/Inspire/);
assert.match(test.get('print-report').innerHTML, /Read-aloud time:<\/strong> 1:05/);
assert.match(test.get('print-report').innerHTML, /Tracks print in order/);
assert.match(test.get('print-report').innerHTML, /Rereads to check accuracy and meaning/);
assert.match(test.get('print-report').innerHTML, /Practise next/);
test.get('clear-mark').listeners.click();
test.get('print-button').listeners.click();
assert.equal(test.windowObject.printCalls, 6);
assert.match(test.get('print-report').innerHTML, /No words marked incorrect/);
assert.equal((test.get('print-report').innerHTML.match(/data-status="correct"/g) || []).length, counts[3]);
test.get('reset-button').listeners.click();
saved = JSON.parse([...test.storage.values()].find(value => value.includes('"marks"')));
assert.equal(saved.notes, '');
assert.equal(Object.keys(saved.responses).length, 0);
assert.equal(Object.keys(saved.observations).length, 0);

console.log('RiverReader2 verified: one story in CVC plus six increasing levels through Explorer B; same characters, burn mystery, and recovery throughout.');
console.log('Word counts by level: ' + counts.join(', '));
console.log('Side-panel word controls, phonics features, blank story entry with recoverable previous record, in-entry refresh, and fresh PDF reports verified.');

// CVC-only preview tracking and scores use the same passage marks.
const previewApp = runApp('reader', 0, {search:'?student=pencil'});
const cvcWords = story.passages[0].join(' ').split(/\s+/);
const taughtWords = new Set('Peter Luna High Park frisbee annual burn fire flowers worker roots seeds shoot Nature Detectives butterflies'.toLowerCase().split(' '));
const cleanPreview = word => word.toLowerCase().replace(/[^a-z]/g,'');
const independentTotal = cvcWords.filter(word=>!taughtWords.has(cleanPreview(word))).length;
assert.match(previewApp.get('app').innerHTML, /Teacher preview words/);
assert.ok(previewApp.get('cvc-preview-results').innerHTML.includes('Overall score:</strong> 123 / 123 (100%)'));
assert.ok(previewApp.get('cvc-preview-results').innerHTML.includes('Score without preview words:</strong> '+independentTotal+' / '+independentTotal+' (100%)'));
function markPreview(index) {
  previewApp.get('passage').listeners.click({target:{closest(){return {dataset:{word:String(index)}};}}});
}
markPreview(0); // Peter is a preview word: only the overall score decreases.
assert.ok(previewApp.get('cvc-preview-results').innerHTML.includes('Overall score:</strong> 122 / 123'));
assert.ok(previewApp.get('cvc-preview-results').innerHTML.includes('Score without preview words:</strong> '+independentTotal+' / '+independentTotal+' (100%)'));
markPreview(1); // and is not previewed: both scores decrease.
assert.ok(previewApp.get('cvc-preview-results').innerHTML.includes('Score without preview words:</strong> '+(independentTotal-1)+' / '+independentTotal));
previewApp.get('self-correct').listeners.click();
assert.ok(previewApp.get('cvc-preview-results').innerHTML.includes('Score without preview words:</strong> '+independentTotal+' / '+independentTotal+' (100%)'));
previewApp.get('cvc-preview-results').listeners.change({target:{closest(){return {dataset:{previewTerm:'0'},checked:true};}}});
assert.equal(JSON.parse(previewApp.storage.get('riverreader2:v2:pencil:level0')).previewTaught[0], true);
previewApp.get('print-button').listeners.click();
assert.match(previewApp.get('print-report').innerHTML, /Preview-word retention after teaching/);
assert.match(previewApp.get('print-report').innerHTML, /Peter<\/td><td>Yes/);
const noPreviewApp = runApp('reader',1);
assert.doesNotMatch(noPreviewApp.get('app').innerHTML, /cvc-preview-results/);
noPreviewApp.get('print-button').listeners.click();
assert.doesNotMatch(noPreviewApp.get('print-report').innerHTML, /Score without preview words/);


const customApp = runApp('reader',0,{search:'?student=crayon'});
customApp.get('extra-preview-words').value = 'grass, green, Peter, grass';
customApp.get('add-preview-words').listeners.click();
const customRecord = JSON.parse(customApp.storage.get('riverreader2:v2:crayon:level0'));
assert.deepEqual(customRecord.customPreviewTerms, ['grass','green']);
const customExcluded = new Set([...taughtWords,'grass','green']);
const customTotal = cvcWords.filter(word=>!customExcluded.has(cleanPreview(word))).length;
assert.ok(customApp.get('cvc-preview-results').innerHTML.includes('Score without preview words:</strong> '+customTotal+' / '+customTotal+' (100%)'));
const grassIndex = cvcWords.findIndex(word=>cleanPreview(word)==='grass');
customApp.get('passage').listeners.click({target:{closest(){return {dataset:{word:String(grassIndex)}};}}});
assert.ok(customApp.get('cvc-preview-results').innerHTML.includes('Score without preview words:</strong> '+customTotal+' / '+customTotal+' (100%)'));
const grassCount = cvcWords.filter(word=>cleanPreview(word)==='grass').length;
assert.ok(customApp.get('cvc-preview-results').innerHTML.includes('<td>'+grassCount+'</td><td>'+(grassCount-1)+'</td><td>0</td><td>1</td>'));
customApp.get('cvc-preview-results').listeners.change({target:{closest(){return {dataset:{previewTerm:'13'},checked:true};}}});
customApp.get('print-button').listeners.click();
assert.match(customApp.get('print-report').innerHTML, /Teacher additions/);
assert.match(customApp.get('print-report').innerHTML, /grass<\/td><td>Yes/);
const customReload = runApp('reader',0,{search:'?student=crayon',storage:customApp.storage});
assert.match(customReload.get('cvc-preview-results').innerHTML, /grass/);
customReload.get('print-button').listeners.click();
assert.match(customReload.get('print-report').innerHTML, /grass<\/td><td>Yes/);
console.log('CVC preview words, teacher additions, independent scores, persistence, and report results verified.');

const cvcResultApp = runApp('reader',0);
assert.match(cvcResultApp.get('cvc-word-results').innerHTML, /Correct CVC words/);
assert.match(cvcResultApp.get('cvc-word-results').innerHTML, /Incorrect CVC words \(0\)/);
assert.doesNotMatch(cvcResultApp.get('cvc-word-results').innerHTML, /<li>new /i);
cvcResultApp.get('passage').listeners.click({target:{closest(){return {dataset:{word:'3'}};}}});
assert.match(cvcResultApp.get('cvc-word-results').innerHTML, /Incorrect CVC words \(1\)/);
assert.match(cvcResultApp.get('cvc-word-results').innerHTML, /<li>jog /);
cvcResultApp.get('self-correct').listeners.click();
assert.match(cvcResultApp.get('cvc-word-results').innerHTML, /Incorrect CVC words \(0\)/);
assert.match(cvcResultApp.get('cvc-word-results').innerHTML, /self-corrected/);
cvcResultApp.get('print-button').listeners.click();
assert.match(cvcResultApp.get('print-report').innerHTML, /Correct and incorrect CVC words/);
assert.doesNotMatch(runApp('reader',1).get('app').innerHTML, /Correct and incorrect CVC words/);
console.log('CVC correct and incorrect lists, self-corrections, and print section verified.');
const decodeApp = runApp('reader',0);
for (const area of ['Initial consonants','Vowel neighbours','Silent letters','Compound words','R-controlled','Multisyllable']) assert.ok(decodeApp.get('decoding-results').innerHTML.includes(area));
const getCvcArea = () => decodeApp.get('decoding-results').innerHTML.split('Short vowels · CVC words')[1].split('</details>')[0];
assert.match(getCvcArea(), /Incorrect \(0\)/);
decodeApp.get('passage').listeners.click({target:{closest(){return {dataset:{word:'3'}};}}});
assert.match(getCvcArea(), /Incorrect \(1\)/);
decodeApp.get('self-correct').listeners.click();
assert.match(getCvcArea(), /Incorrect \(0\)/);
decodeApp.get('print-button').listeners.click();
assert.match(decodeApp.get('print-report').innerHTML, /Vowel neighbours/);
for(const level of story.levels) assert.match(runApp('reader',level.id).get('decoding-results').innerHTML, /Correct \(/);
console.log('Decoding subarea correct and incorrect groups verified at all seven levels.');

const tickApp = runApp('reader',0);
tickApp.get('passage').listeners.click({target:{closest(){return {dataset:{word:'3'}};}}});
function tickCode(code,checked=true){const input=tickApp.get('code-'+code);input.checked=checked;input.listeners.click();}
tickCode('NM');tickCode('REV');tickCode('I');
assert.equal(tickApp.get('code-NM').checked,true);
assert.equal(tickApp.get('code-REV').checked,false);
assert.equal(tickApp.get('code-I').checked,true);
tickCode('M');
assert.equal(tickApp.get('code-NM').checked,false);
assert.equal(tickApp.get('code-M').checked,true);
assert.equal(tickApp.get('code-REV').checked,false);
assert.equal(tickApp.get('code-I').checked,true);
tickApp.get('print-button').listeners.click();
assert.match(tickApp.get('print-report').innerHTML,/Meaningful error/);
assert.doesNotMatch(tickApp.get('print-report').innerHTML,/Meaningful error · Reversal/);
assert.match(tickApp.get('print-report').innerHTML,/Initial sound detected — error/);
tickApp.get('self-correct').listeners.click();
for(const code of ['NM','M','REV','I'])assert.equal(tickApp.get('code-'+code).checked,false);
const savedTick=JSON.parse(tickApp.storage.get('riverreader2:v2:TestReader:level0')).marks[3];
assert.equal(savedTick.status,'self');assert.equal(savedTick.code,'');assert.equal(savedTick.firstSound,undefined);
tickCode('NM');assert.equal(tickApp.get('self-correct').checked,false);
assert.match(tickApp.get('reading-behaviours').innerHTML,/Attempts to sound out words/);
console.log('Combined error codes, mutually exclusive M/NM, initial sound, and self-correct clearing verified.');

tickApp.get('print-button').listeners.click();
assert.match(tickApp.get('print-report').innerHTML,/Non-meaningful error/);
tickApp.get('self-correct').listeners.click();
tickApp.get('print-button').listeners.click();
assert.match(tickApp.get('print-report').innerHTML,/class="word-status">Correct — student corrected<\/td>/);
console.log('Full error descriptions and correct/student-corrected report wording verified.');
tickCode('I');
tickCode('REV');
assert.equal(tickApp.get('code-I').checked,false);
assert.equal(tickApp.get('code-REV').checked,true);
tickCode('I');
assert.equal(tickApp.get('code-I').checked,true);
assert.equal(tickApp.get('code-REV').checked,false);
tickCode('REV');
tickApp.get('first-sound-yes').listeners.click();
assert.equal(tickApp.get('code-I').checked,true);
assert.equal(tickApp.get('code-REV').checked,false);
console.log('I and Rev mutually exclusive in both directions, including first-sound controls.');const dgApp=runApp('reader',0);
const dgIndex=cvcWords.findIndex(w=>cleanPreview(w)==='they');
dgApp.get('passage').listeners.click({target:{closest(){return {dataset:{word:String(dgIndex)}};}}});
assert.match(dgApp.get('digraph-ticks').innerHTML,/data-digraph="th"/);
dgApp.get('digraph-ticks').listeners.change({target:{closest(){return {dataset:{digraph:'th'},checked:true};}}});
assert.match(dgApp.get('digraph-assessment').innerHTML,/Correct initial sound, incorrect word reading \(1\)/);
assert.equal(dgApp.get('metric-errors').textContent,1);
assert.equal(dgApp.get('code-I').checked,true);
dgApp.get('print-button').listeners.click();
assert.match(dgApp.get('print-report').innerHTML,/Correct initial sound: th \(digraph\) — incorrect word reading/);
dgApp.get('self-correct').listeners.click();
assert.equal(dgApp.get('metric-errors').textContent,0);
assert.match(dgApp.get('digraph-assessment').innerHTML,/Correct initial sound, incorrect word reading \(0\)/);
assert.match(dgApp.get('digraph-assessment').innerHTML,/correct — student corrected/);
console.log('Initial digraph detection stays an error; correct digraph words and report sections verified.');

const blendApp=runApp('reader',0);
const blendIndex=cvcWords.findIndex(w=>cleanPreview(w)==='black');
blendApp.get('passage').listeners.click({target:{closest(){return {dataset:{word:String(blendIndex)}};}}});
assert.match(blendApp.get('digraph-ticks').innerHTML,/data-digraph="bl"/);
blendApp.get('digraph-ticks').listeners.change({target:{closest(){return {dataset:{digraph:'bl'},checked:true};}}});
assert.equal(blendApp.get('metric-errors').textContent,1);
assert.match(blendApp.get('digraph-assessment').innerHTML,/Correct initial sound, incorrect word reading \(1\)/);
blendApp.get('print-button').listeners.click();
assert.match(blendApp.get('print-report').innerHTML,/Correct initial sound: bl \(consonant blend\) — incorrect word reading/);
console.log('Actual initial blends appear above words and partial decoding remains an error.');

for(const id of [0,3]){
 const letterApp=runApp('reader',id);letterApp.get('print-button').listeners.click();
 const headings=[...letterApp.get('print-report').innerHTML.matchAll(/<h2>(.*?)<\/h2>/g)].map(m=>m[1]);
 headings.forEach((title,index)=>assert.ok(title.startsWith(String.fromCharCode(65+index)+'. ')));
}
console.log('PDF sections have consecutive letters for CVC and other levels.');
const endingApp=runApp('reader',0);
for(const target of ['black','forest']){
const index=cvcWords.findIndex(w=>cleanPreview(w)===target);
endingApp.get('passage').listeners.click({target:{closest(){return {dataset:{word:String(index)}};}}});
}
assert.match(endingApp.get('digraph-assessment').innerHTML,/Words incorrect · ending digraph or consonant blend \(2\)/);
assert.match(endingApp.get('digraph-assessment').innerHTML,/ck<\/strong> \(final digraph\)/);
assert.match(endingApp.get('digraph-assessment').innerHTML,/st<\/strong> \(final consonant blend\)/);
endingApp.get('self-correct').listeners.click();
assert.match(endingApp.get('digraph-assessment').innerHTML,/Words incorrect · ending digraph or consonant blend \(1\)/);
endingApp.get('print-button').listeners.click();
assert.match(endingApp.get('print-report').innerHTML,/Words incorrect · ending digraph or consonant blend/);
console.log('Incorrect final digraph and blend group verified in screen assessment and report.');
const pairedApp=runApp('reader',0);
let pairedHtml=pairedApp.get('digraph-assessment').innerHTML;
for(const title of ['Vowel neighbours','Consonant blends at the end','Digraphs at the end','Silent letters at the end'])assert.equal(pairedHtml.split(title).length-1,2);
const seedIndex=cvcWords.findIndex(w=>cleanPreview(w)==='seeds');
pairedApp.get('passage').listeners.click({target:{closest(){return {dataset:{word:String(seedIndex)}};}}});
pairedHtml=pairedApp.get('digraph-assessment').innerHTML;
const incorrectPair=pairedHtml.split('<h3>Incorrect · word-pattern groups</h3>')[1];
assert.match(incorrectPair,/seeds — <strong>ee/);
assert.match(incorrectPair,/seeds — <strong>ds/);
pairedApp.get('self-correct').listeners.click();
pairedHtml=pairedApp.get('digraph-assessment').innerHTML;
assert.doesNotMatch(pairedHtml.split('<h3>Incorrect · word-pattern groups</h3>')[1],/<li>seeds/);
pairedApp.get('print-button').listeners.click();
assert.match(pairedApp.get('print-report').innerHTML,/Correct · word-pattern groups/);
assert.match(pairedApp.get('print-report').innerHTML,/Incorrect · word-pattern groups/);
console.log('Matching correct/incorrect groups and overlapping patterns verified.');
