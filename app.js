(function () {
  'use strict';

  var story = window.RIVER_STORY;
  var root = document.getElementById('app');
  if (!root || !story) return;
  var readingBehaviours = [
    {id:'tracksPrint', label:'Tracks print in order'},
    {id:'attemptsSoundingOut', label:'Attempts to sound out words'},
    {id:'phrases', label:'Reads in meaningful phrases and notices punctuation'},
    {id:'noticesMeaning', label:'Notices when the reading does not make sense'},
    {id:'selfCorrects', label:'Self-corrects independently'},
    {id:'retells', label:'Retells the main events in order'},
    {id:'explainsMap', label:'Uses observations to explain how the patch changed'}
  ];
  var readingStrategies = [
    {id:'soundClues', label:'Uses letter–sound clues to solve a word'},
    {id:'wordParts', label:'Breaks a longer word into parts'},
    {id:'rereads', label:'Rereads to check accuracy and meaning'},
    {id:'meaningCheck', label:'Checks a decoded word against the sentence meaning'},
    {id:'grammarCheck', label:'Checks whether the sentence sounds right'},
    {id:'mapKey', label:'Uses map labels and the key to support understanding'}
  ];

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }
  function readStore(key, fallback) {
    try {
      var data = JSON.parse(localStorage.getItem(key));
      return data && typeof data === 'object' ? data : fallback;
    } catch (_error) { return fallback; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_error) { return false; }
  }
  function levelFrom(value) {
    if (value == null || value === '') return 1;
    var level = Number(value);
    return level >= 0 && level < story.levels.length && Number.isInteger(level) ? level : 1;
  }
  function cleanStudent(value) {
    return String(value || '').trim().slice(0, 32) || 'Practice';
  }
  function storyHref(level, student) {
    var freshEntry = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    return (level === 0 ? 'CVC.html' : 'Level' + level + '.html') + '?student=' + encodeURIComponent(student) + '&fresh=' + freshEntry;
  }
  function homeHref(student) {
    return 'index.html?student=' + encodeURIComponent(student);
  }
  function wordParts(text) {
    return String(text).match(/\s+|\S+/g) || [];
  }
  function isWord(part) {
    return /[\p{L}\p{N}]/u.test(part);
  }
  function wordCount(paragraphs) {
    return paragraphs.reduce(function (count, text) {
      return count + wordParts(text).filter(isWord).length;
    }, 0);
  }
  function plainWord(value) {
    return String(value).toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  }
  function readingFeature(word, rawWord) {
    var names = {
      mina:'Proper name; two syllables (Mi-na)',
      jay:'Proper name; vowel team ay',
      lee:'Proper name; vowel team ee',
      ranger:'Proper name; divide into syllables (ran-ger)',
      willow:'Proper name; divide into syllables (Wil-low)',
      bend:'Proper name; short e, CVCC pattern',
      pine:'Proper name; long i CVCe pattern',
      loop:'Proper name; vowel team oo'
    };
    if (names[word] && /^[A-Z]/.test(rawWord)) return names[word];
    if (word === 'closed' && rawWord === rawWord.toUpperCase()) return 'Warning sign; consonant cluster /cl/ and -ed ending';
    var special = {
      felt:'Short e; CVCC pattern; final consonant cluster /lt/',
      jump:'Short u; CVCC pattern; final consonant cluster /mp/',
      went:'Short e; CVCC pattern; final consonant cluster /nt/',
      next:'Short e; x spells /ks/ before final t',
      edge:'Short e; dge spells /j/ after a short vowel',
      and:'Short a; VCC pattern; final consonant cluster /nd/',
      saw:'Vowel team aw (/aw/)',
      on:'Short o; VC pattern',
      in:'Short i; VC pattern',
      it:'Short i; VC pattern',
      at:'Short a; VC pattern',
      an:'Short a; VC pattern',
      if:'Short i; VC pattern',
      as:'Short a; VC pattern; s spells /z/',
      is:'Short i; VC pattern; s spells /z/',
      go:'Open syllable; long o',
      no:'Open syllable; long o',
      so:'Open syllable; long o',
      we:'Open syllable; long e',
      by:'Final y spells long i',
      off:'Short o; final double consonant ff',
      open:'Two syllables (o-pen); first syllable open',
      across:'Two syllables (a-cross); final double consonant ss',
      quiet:'Two syllables (qui-et); qu spells /kw/',
      use:'Long u; u_e spelling; s spells /z/',
      risks:'Short i; final consonant cluster /sk/; plural -s',
      stop:'Initial consonant cluster /st/; short o',
      used:'Long u CVCe base use; -ed ending /d/',
      beside:'Two syllables (be-side); long i CVCe in side',
      examine:'Three syllables (ex-am-ine)',
      idea:'Three syllables (i-de-a)',
      ideas:'Three syllables (i-de-as); plural -s',
      either:'Two syllables; vowel spelling ei',
      neither:'Two syllables; vowel spelling ei',
      near:'Vowel spelling ear (/eer/)',
      around:'Two syllables (a-round); ou spells /ow/',
      where:'Initial consonant digraph wh; ere spells /air/',
      compared:'Vowel spelling are (/air/); -ed ending',
      worried:'Two syllables; worry changes y to i before -ed',
      closer:'Long o CVCe base close; -er ending',
      visitors:'Suffix -or; plural -s',
      worked:'or spells /er/ in work; -ed ending /t/',
      toward:'Two syllables; or/war spelling may vary by accent',
      course:'Vowel spelling our (/or/)',
      together:'Three syllables (to-geth-er); digraph th',
      alternative:'Multisyllabic word; divide into spoken syllables',
      washout:'Compound word: wash + out',
      overnight:'Compound word: over + night',
      nearby:'Compound word: near + by',
      without:'Compound word: with + out',
      something:'Compound word: some + thing',
      read:'Past-tense read: ea spells /ĕ/ here',
      route:'Vowel spelling ou; pronunciation may vary',
      sign:'Silent letter g in sign',
      blue:'Initial consonant cluster /bl/; vowel team ue',
      green:'Initial consonant cluster /gr/; vowel team ee',
      blind:'Initial consonant cluster /bl/; final cluster /nd/',
      path:'Final consonant digraph th',
      rain:'Vowel team ai',
      map:'Short a; CVC pattern',
      gap:'Short a; CVC pattern',
      pine:'Long i; CVCe pattern',
      loop:'Vowel team oo',
      jay:'Vowel team ay',
      key:'Vowel spelling ey',
      ducks:'Final consonant digraph ck; plural -s',
      birds:'R-controlled vowel ir; plural -s',
      washed:'Consonant digraph sh; -ed ending /t/',
      walked:'Vowel spelling al in walk; -ed ending /t/',
      walk:'Vowel spelling al in walk',
      find:'-ind word family; long i',
      found:'Vowel spelling ou (/ow/)',
      could:'Irregular high-frequency word; teach the heart part',
      would:'Irregular high-frequency word; teach the heart part',
      through:'Initial digraph th; irregular ough spelling',
      said:'Irregular high-frequency word; teach the heart part',
      was:'Irregular high-frequency word; teach the heart part',
      were:'Irregular high-frequency word; teach the heart part',
      the:'Irregular high-frequency word; teach the heart part',
      a:'High-frequency word; pronounced /ə/ in this story',
      of:'Irregular high-frequency word; teach the heart part',
      to:'Irregular high-frequency word; teach the heart part',
      do:'Irregular high-frequency word; teach the heart part',
      two:'Irregular high-frequency word; teach the heart part',
      they:'Irregular high-frequency word; teach the heart part',
      their:'Irregular high-frequency word; teach the heart part',
      what:'Irregular high-frequency word; teach the heart part',
      who:'Irregular high-frequency word; teach the heart part',
      some:'Irregular high-frequency word; teach the heart part',
      have:'Irregular high-frequency word; teach the heart part',
      are:'Irregular high-frequency word; teach the heart part',
      you:'Irregular high-frequency word; teach the heart part',
      one:'Irregular high-frequency word; teach the heart part'
    };
    if (word === 'stop' && rawWord === rawWord.toUpperCase()) return 'All-capital safety word; initial consonant cluster /st/';
    var highParkFeatures = {peter:'Proper name; two syllables (Pe-ter)', luna:'Proper name; two syllables (Lu-na)', high:'Vowel spelling igh; long i', frisbee:'Two syllables (fris-bee); vowel team ee', fire:'Vowel spelling ire; pronunciation varies by accent', ash:'Short a; final consonant digraph sh', ashes:'Base ash; -es ending adds a syllable', soil:'Vowel team oi', new:'Vowel spelling ew', ruin:'Two syllables (ru-in)', ruined:'Base ruin; -ed ending', life:'Long i; CVCe pattern', live:'Short i in this verb; final e', tiny:'Two syllables (ti-ny); final y spells long e', again:'Two syllables (a-gain); irregular ai spelling', each:'Vowel team ea; final digraph ch', area:'Three syllables (ar-e-a)', areas:'Base area; plural -s', only:'Two syllables (on-ly); final y spells long e', every:'Spoken syllables vary; final y spells long e', also:'Two syllables (al-so); final open syllable', into:'Two syllables (in-to)', upon:'Two syllables (up-on)', until:'Two syllables (un-til)', animal:'Three syllables (an-i-mal)', animals:'Base animal; plural -s', native:'Two syllables (na-tive); long a in first syllable'};
    Object.assign(highParkFeatures, {"annual":"Three syllables (an-nu-al); double n","helps":"Base help; final cluster lp; -s ending","he":"Open syllable; long e","became":"Two syllables (be-came); long a CVCe in came","become":"Two syllables (be-come); irregular o in come","taken":"Two syllables (ta-ken); long a in first syllable","oh":"Interjection; long o","began":"Two syllables (be-gan); short a in second syllable","games":"Long a CVCe base game; plural -s","beyond":"Two syllables (be-yond); y acts as a consonant","extra":"Two syllables (ex-tra); x spells /ks/","visit":"Two syllables (vis-it); s spells /z/","visits":"Base visit; -s ending","simple":"Two syllables (sim-ple); final consonant-le syllable","signs":"Long i; silent g; plural -s","paths":"Base path; final digraph th; plural -s","its":"Short i; final consonant cluster ts","be":"Open syllable; long e","gates":"Long a CVCe base gate; plural -s","solve":"Short o; final consonant cluster lv; final e","takes":"Long a CVCe base take; -s ending","damage":"Two syllables (dam-age); soft g spells /j/","up":"Short u; VC pattern","almost":"Two syllables (al-most); final consonant cluster st","remove":"Two syllables (re-move); o spells /oo/","alone":"Two syllables (a-lone); long o CVCe in lone","once":"Irregular high-frequency word; c spells /s/","all":"Vowel spelling al; final double l","taught":"Vowel spelling augh; gh is silent","ask":"Short a; final consonant cluster sk"});
    if (highParkFeatures[word]) return highParkFeatures[word];
    if (special[word]) return special[word];
    var cues = [];
    if (/^un(?:safe|stable|marked|expected)$/.test(word)) cues.push('Prefix un-');
    if (/ing$/.test(word) && word.length > 5 && word !== 'something') cues.push('Suffix -ing');
    else if (/ed$/.test(word) && word.length > 3) cues.push('Suffix -ed');
    else if (/ly$/.test(word) && word.length > 4) cues.push('Suffix -ly');
    if (/(tion|sion)$/.test(word)) cues.push('Final stable syllable -tion/-sion');
    var initialDigraph = word.match(/^(sh|ch|th|wh|ph)/);
    var finalDigraph = word.match(/(sh|ch|th|ck|ng|nk)$/);
    if (initialDigraph) cues.push('Initial consonant digraph ' + initialDigraph[0]);
    if (/tch/.test(word)) cues.push('Consonant trigraph tch');
    else if (finalDigraph) cues.push('Final consonant digraph ' + finalDigraph[0]);
    var initialCluster = word.match(/^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw)/);
    if (initialCluster) cues.push('Initial consonant cluster /' + initialCluster[0] + '/');
    var rControlled = word.match(/(ar|or|er|ir|ur)/);
    if (rControlled && !/^(?:are)$/.test(word)) cues.push('R-controlled vowel ' + rControlled[0]);
    else {
      var vowelTeam = word.match(/(ai|ay|ee|ea|oa|oo|ow|ou|ew|ue|oi|oy|igh)/);
      if (vowelTeam) cues.push('Vowel team or vowel spelling ' + vowelTeam[0]);
      else if (/^[bcdfghjklmnpqrstvwxyz]{1,2}[aeiou][bcdfghjklmnpqrstvwxyz]e$/.test(word)) cues.push('Long-vowel CVCe pattern');
    }
    if (cues.length) return cues.slice(0, 3).join('; ');
    if (/^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/.test(word)) return 'Short vowel; CVC pattern';
    if (/^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]{2}$/.test(word)) return 'Short vowel; CVCC pattern; hear both final consonants';
    if (word.length >= 7) return 'Longer word; divide into spoken syllables';
    return 'Check the taught letter–sound pattern';
  }
  function wordInfo(rawWord, index, allWords) {
    var word = plainWord(rawWord);
    var before = index > 0 ? plainWord(allWords[index - 1]) : '';
    var feature = readingFeature(word, String(rawWord));
    var significance = 'Adds detail to the sentence';
    var storyRoles = {
      "peter": "Names one of the High Park Nature Detectives",
      "luna": "Names the detective who first spots new growth",
      "high": "Part of the place name High Park",
      "park": "Names the setting of the mystery",
      "frisbee": "Explains why the friends originally came to the park",
      "annual": "Shows the burn is part of a recurring program",
      "burn": "Names the planned fire at the centre of the mystery",
      "fire": "Names the event that blackened the patch",
      "black": "Describes how the patch looked after the fire",
      "ash": "Shows the visible effect of the burn",
      "ashes": "Show the visible effect of the burn",
      "wildflowers": "Name the missing plants Luna worries about",
      "flowers": "Name the plants the friends hope will return",
      "squirrel": "Prompts Peter’s question about animal food",
      "worker": "Identifies the person who explains the burn",
      "planned": "Shows that the fire was intentional",
      "controlled": "Shows that a trained team managed the fire",
      "dead": "Describes the grass and leaves removed by the burn",
      "sunlight": "Explains a condition that helps new growth",
      "sun": "Provides light for plants",
      "roots": "Name underground plant parts that may survive",
      "seeds": "Can give rise to new plants",
      "native": "Describes plants that belong in this habitat",
      "oak": "Names a tree helped by light and space",
      "shoot": "Provides the first evidence of new life",
      "butterflies": "Show another change observed as plants return",
      "detectives": "Names the role Peter and Luna choose",
      "week": "Shows that the friends return over time",
      "weeks": "Show that recovery takes time",
      "evidence": "Supports the explanation with observations",
      "fresh": "Describes the habitat’s new start",
      "sad": "Shows Luna’s response to the missing flowers",
      "worried": "Shows Peter’s concern about food for animals",
      "glad": "Shows how the friends feel when new growth appears"
};
    if (Object.prototype.hasOwnProperty.call(storyRoles, word)) significance = storyRoles[word];


    var pronouns = ['i','we','you','he','she','it','they','them','their','his','her','our','us','both','everyone','each','who','that','this','those','these'];
    var connectors = ['and','but','or','so','because','while','when','although','rather','instead','then','as','if','than'];
    var locationWords = ['at','by','beside','near','through','around','along','across','past','toward','towards','from','to','into','onto','beyond','before','after','back','under','above','between','on','in'];
    var determiners = ['a','an','the','some','any','their','each','every'];
    var helpers = ['is','are','was','were','had','has','have','could','would','can','might','must','did','do','not','no'];
    if (pronouns.includes(word) && !storyRoles[word]) significance = 'Keeps track of people or things in the story';
    else if (connectors.includes(word) && !storyRoles[word]) significance = 'Links events, reasons, or choices';
    else if (locationWords.includes(word) && !storyRoles[word]) significance = 'Shows where someone goes or where something is';
    else if (determiners.includes(word) && !storyRoles[word]) significance = 'Points to a person, place, or thing';
    else if (helpers.includes(word) && !storyRoles[word]) significance = 'Shows time, possibility, or a choice';
    return {feature:feature, significance:significance};
  }
  function numberOrZero(value) {
    var number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }
  function formatTime(seconds) {
    var whole = Math.floor(numberOrZero(seconds));
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
  }
  var studentIds = ["pencil","crayon","eraser","ruler","glue","scissors","notebook","book","backpack","marker","paintbrush","palette","calculator","sharpener","paper-clip","stapler","tape","folder","compass","highlighter"];
  function studentLabel(id) {
    return studentIds.indexOf(id) >= 0 ? id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ') : id;
  }
  function studentTiles() {
    return studentIds.map(function (id) {
      return '<button type="button" class="student-tile" data-student="' + id + '" aria-label="Student ID: ' + studentLabel(id) + '"><img src="assets/supplies/' + id + '.svg" alt="" draggable="false"><span>' + studentLabel(id) + '</span></button>';
    }).join('');
  }
  var query = new URLSearchParams(location.search);
  var savedPrefs = readStore('riverreader2:prefs', {});
  var student = cleanStudent(query.get('student') || savedPrefs.student);

  root.addEventListener('click', function (event) {
    var link = event.target.closest('a[data-fresh-level]');
    if (link) link.href = storyHref(Number(link.dataset.freshLevel), student);
  });

  function savePrefs() {
    writeStore('riverreader2:prefs', {student:student});
  }

  if (document.body.dataset.page === 'home') {
    renderHome();
  } else {
    renderReader();
  }

  function renderHome() {
    root.innerHTML =
      '<div class="landing">' +
        '<section class="welcome"><div class="brand"><span class="brand-mark" aria-hidden="true">📖</span>RiverReader2</div>' +
          '<p class="eyebrow">One story · Seven reading versions</p><h1>Read.<br><span>Discover.</span><b class="star" aria-hidden="true">✦</b></h1>' +
          '<p class="intro">The Mystery of the Black Forest<br>Choose your student ID and let’s begin.</p>' +
          '<img class="welcome-picture" src="high-park-planned-burn.png" alt="Illustration of a trained crew managing a planned burn in High Park.">' +
          '<ol class="features"><li><b>01</b>Click your school-supply ID.</li><li><b>02</b>Choose your reading version.</li><li><b>03</b>Read aloud and discover new life.</li></ol>' +
          '<p class="local-note">One story about Peter and Luna, a new frisbee, and a surprising visit to High Park. Each student ID keeps its own reading records in this browser.</p>' +
        '</section>' +
        '<section class="picker" aria-labelledby="picker-title"><p class="eyebrow">YOUR READING ADVENTURE</p><h2 id="picker-title">Choose your student ID</h2>' +
          '<p class="picker-note">Click your school supply to enter. Use the same supply each time.</p>' +
          '<div id="studentChooser" class="student-grid">' + studentTiles() + '</div>' +
          '<div id="studentSelected" class="student-selected"></div><button type="button" id="changeStudent">Change student ID</button>' +
          '<p id="reader-note" class="selected-grade-note"></p>' +
          '<section id="story-grid" class="story-grid" aria-label="Reading versions"></section>' +
          '<div class="picker-foot"><span>CVC · Pathway · Excite · Excite/Inspire · Inspire · Explorer A · Explorer B</span></div>' +
        '</section>' +
        '<footer class="grownups"><span>Teacher: tap words read incorrectly. Untapped words count as correct. Use Print / Save PDF for the assessment.</span></footer>' +
      '</div>';

    document.getElementById('studentChooser').addEventListener('click', function (event) {
      var tile = event.target.closest('button[data-student]');
      if (!tile || studentIds.indexOf(tile.dataset.student) < 0) return;
      student = tile.dataset.student;
      savePrefs();
      updateHome();
    });
    document.getElementById('changeStudent').addEventListener('click', function () {
      document.body.dataset.homeView = 'students';
      document.getElementById('picker-title').textContent = 'Choose your student ID';
      document.getElementById('studentChooser').hidden = false;
      document.getElementById('studentSelected').hidden = true;
      document.getElementById('changeStudent').hidden = true;
      document.getElementById('story-grid').hidden = true;
      document.getElementById('reader-note').textContent = 'Choose your student ID to see the reading versions.';
    });
    updateHome();
  }

  function updateHome() {
    var selected = studentIds.indexOf(student) >= 0;
    document.body.dataset.homeView = selected ? 'levels' : 'students';
    document.getElementById('picker-title').textContent = selected ? 'Choose your reading version' : 'Choose your student ID';
    document.getElementById('studentChooser').hidden = selected;
    document.getElementById('studentSelected').hidden = !selected;
    document.getElementById('changeStudent').hidden = !selected;
    document.getElementById('story-grid').hidden = !selected;
    document.getElementById('studentSelected').innerHTML = selected ? '<img src="assets/supplies/' + student + '.svg" alt=""><span>' + studentLabel(student) + ' · Student ID</span>' : '';
    document.getElementById('reader-note').textContent = selected ? 'Choose a reading version below.' : 'Choose your student ID to see the reading versions.';
    document.getElementById('story-grid').innerHTML = story.levels.map(function (level) {
      return '<article class="card story-card">' +
        '<h3>' + escapeHTML(level.label) + '</h3>' +
        '<p title="' + escapeHTML(level.note) + '">' + wordCount(story.passages[level.id]) + ' words</p>' +
        '<a class="action-button" data-fresh-level="' + level.id + '" href="' + storyHref(level.id, student) + '">Read this version →</a>' +
      '</article>';
    }).join('');
  }

  function renderReader() {
    var level = levelFrom(document.body.dataset.level);
    var levelInfo = story.levels.find(function (item) { return item.id === level; });
    if (!levelInfo) {
      root.innerHTML = '<p>Reading level not found. <a href="index.html">Return to RiverReader2.</a></p>';
      return;
    }
    savePrefs();
    var paragraphs = story.passages[level];
    var defaultPreviewTerms = ['Peter','Luna','High Park','frisbee','annual burn','fire','flowers','worker','roots','seeds','shoot','Nature Detectives','butterflies'];


    var words = [];
    var key = 'riverreader2:v2:' + encodeURIComponent(student) + ':level' + level;
    var previousKey = key + ':previous';
    var entryKey = key + ':last-entry';
    var state = readStore(key, {});
    var entryNote = '';
    function hasRecordWork(record) {
      return !!record && (Object.keys(record.marks || {}).length > 0 || Object.keys(record.responses || {}).length > 0 ||
        Object.keys(record.observations || {}).length > 0 || Object.values(record.previewTaught || {}).some(Boolean) || (record.customPreviewTerms || []).length > 0 || !!String(record.notes || '').trim() || numberOrZero(record.elapsed) > 0);
    }
    var entryToken = query.get('fresh');
    if (entryToken && readStore(entryKey, {}).token !== entryToken) {
      if (!hasRecordWork(state) || writeStore(previousKey, state)) {
        state = {marks:{}, responses:{}, observations:{}, notes:'', elapsed:0, updatedAt:null};
        writeStore(key, state);
        writeStore(entryKey, {token:entryToken});
        entryNote = hasRecordWork(readStore(previousKey, {})) ? 'Fresh reading record ready. The previous record can be restored below.' : 'Fresh reading record ready.';
      } else {
        entryNote = 'Could not preserve the previous record, so it remains open. Print it before starting fresh.';
      }
    }
    if (!state.marks || typeof state.marks !== 'object') state.marks = {};
    if (!state.responses || typeof state.responses !== 'object') state.responses = {};
    if (!state.observations || typeof state.observations !== 'object') state.observations = {};
    if (typeof state.notes !== 'string') state.notes = '';
    state.elapsed = numberOrZero(state.elapsed);
    var selectedWord = null;

    var timerStart = 0;
    var passageMarkup = paragraphs.map(function (paragraph, paragraphIndex) {
      return '<p>' + wordParts(paragraph).map(function (part) {
        if (!isWord(part)) return escapeHTML(part);
        var index = words.length;
        words.push(part);
        return '<button type="button" class="word-token" data-word="' + index + '" aria-label="Word ' + (index + 1) + ': ' + escapeHTML(part) + '" aria-pressed="false">' + escapeHTML(part) + '</button>';
      }).join('') + '</p>' + (paragraphIndex === (level === 6 ? 3 : 2) ? '<figure class="story-illustration" style="margin:16px 0"><img src="high-park-planned-burn.png" alt="Illustration of a trained fire crew managing a prescribed burn behind barriers in High Park." style="display:block;width:100%;height:auto;border-radius:12px"></figure>' : '');
    }).join('');

    root.innerHTML =
      '<div class="site-screen">' +
        '<header class="masthead"><div class="brand-line"><span class="brand-mark" aria-hidden="true">🏞️</span><div>' +
          '<p class="eyebrow">Teacher running record · High Park story</p><h1>RiverReader2</h1>' +
          '<p class="subtitle">Tap a word when it is read incorrectly.</p>' +
        '</div></div><span class="pill">📚 ' + escapeHTML(levelInfo.label) + '</span></header>' +
            '<section class="card top-timer-card"><p class="eyebrow">Timing</p><h3>⏱️ Read-aloud timer</h3>' +
              '<div class="time-row"><span id="time-display" class="time-display">0:00</span><button type="button" id="timer-button" class="action-button primary">▶ Start</button></div>' +
              '<p class="small-note">Press Start at the first word and Pause after the last word. The time is saved and printed in the PDF assessment.</p>' +
              '<p><strong id="wpm-display">Words per minute: —</strong></p>' +
        '</section>' +
        '<div class="reader-top"><a class="back-link" href="' + homeHref(student) + '">← All levels</a>' +
          '<div class="reader-meta"><span class="pill">' + escapeHTML(levelInfo.label) + '</span><span class="pill">Reader: ' + escapeHTML(studentLabel(student)) + '</span><span class="pill">Saved on this device</span></div></div>' +
        '<div class="reader-layout">' +
          '<section class="card passage-card" aria-labelledby="story-title">' +
            '<div class="reader-title-row"><span class="reader-title-icon" aria-hidden="true">' + story.icon + '</span><div><p class="eyebrow">Read aloud</p><h2 id="story-title">' + escapeHTML(story.title) + '</h2></div></div>' +
            '<div class="reading-prompt">🎙️ Student: read the story. Teacher: tap a word read incorrectly or skipped. Choose <strong>Omit word</strong> for a skipped word; the omission count updates right away.</div>' +
            (level === 0 ? '<div class="cvc-sound-box"><strong>🔤 CVC words to sound out:</strong> jog · did · not · red · get · can · sun · sad. <strong>Teacher: preview story words</strong> Peter, Luna, High Park, frisbee, annual burn, fire, flowers, worker, roots, seeds, shoot, Nature Detectives, butterflies. These names and story words are not all CVC.</div>' : '') +
            (level === 0 ? '<div class="cvc-add-preview"><label class="field-label" for="extra-preview-words">Teacher additions · Add preview words before reading</label><input id="extra-preview-words" class="student-input" placeholder="For example: grass, green, come back" maxlength="500"><button type="button" id="add-preview-words" class="plain-button">Add preview words</button><p class="small-note">Separate words or phrases with commas. Teach them first, then record reading results in the passage.</p><p id="preview-add-status" role="status"></p></div><section class="teacher-added-box" aria-labelledby="teacher-added-title"><h3 id="teacher-added-title">Teacher-added words</h3><div id="teacher-added-list" aria-live="polite"></div><button type="button" id="export-preview-slides" class="plain-button">Download pretaught words · PPTM</button><p class="small-note">Tick Previewed for the words to include. One word per slide, Andika, 24 pt. Phrases split into separate word slides. PowerPoint needs Andika installed to display that font.</p><p id="preview-export-status" role="status"></p></section>' : '') +
            '<div id="word-ticks" class="word-ticks" role="group" aria-label="Selected word tick boxes" hidden><label><input type="checkbox" id="self-correct">Self-correct</label><label title="Meaning unchanged"><input type="checkbox" data-code="NM">NM</label><label title="Meaning changed"><input type="checkbox" data-code="M">M</label><label title="Reversal"><input type="checkbox" data-code="REV">Rev</label><label title="Initial sound detected"><input type="checkbox" data-code="I">I</label><div id="digraph-ticks" class="digraph-ticks"></div></div>' +
            '<div id="passage" class="passage level-' + level + '">' + passageMarkup + '</div>' +
            '<div class="legend"><span><i class="legend-swatch error"></i> Incorrect</span><span><i class="legend-swatch omission"></i> Omitted</span><span><i class="legend-swatch self"></i> Self-corrected</span><span>Unmarked = correct</span></div>' +
          '</section>' +
          '<aside class="teacher-column" aria-label="Teacher controls">' +
            '<div id="selection-slot" class="selection-slot" hidden><section id="selection-box" class="selection-box" aria-label="Selected word controls" hidden><div id="selection-word" class="selection-word"></div>' +
                '<div class="teacher-actions"><button type="button" id="omit-word" class="action-button red">∅ Omit word</button><button type="button" id="clear-mark" class="plain-button">Clear mark</button></div>' +
                '<div id="initial-sound-row"><p class="small-note" style="margin:12px 0 3px">Did the student sound out the first letter? This remains an error.</p>' +
                  '<div class="class-row"><button type="button" id="first-sound-yes" class="class-button">Yes · first sound</button><button type="button" id="first-sound-no" class="class-button">No · first sound</button></div></div>' +
                '</section></div>' +
            '<section class="card teacher-card"><p class="eyebrow">Live record</p><h3>Reading check</h3>' +
              '<div class="metric-grid"><div class="metric"><strong id="metric-total"></strong><span>Words</span></div><div class="metric"><strong id="metric-correct"></strong><span>Correct</span></div><div class="metric"><strong id="metric-errors"></strong><span>Errors</span></div><div class="metric"><strong id="metric-omissions"></strong><span>Omissions</span></div><div class="metric"><strong id="metric-self"></strong><span>Self-corrected</span></div><div class="metric"><strong id="metric-accuracy"></strong><span>Accuracy</span></div></div>' +
              '<p class="small-note">Untouched words count as correct. To record an omission, tap the skipped word, then press <strong>Omit word</strong>. Omissions are numbered and also count as errors. First-letter sound notes do not change the score.</p>' +
            '</section>' +
            '<section class="card teacher-card"><h3>Assessment actions</h3>' +
              '<div class="teacher-actions"><button type="button" id="print-button" class="action-button red">🌺 Print / Save PDF</button><button type="button" id="reset-button" class="plain-button">Start a fresh record</button><button type="button" id="restore-button" class="plain-button" hidden>Restore previous record</button></div>' +
              '<p id="save-note" class="save-note" role="status" aria-live="polite">Ready to save.</p>' +
            '</section>' +
          '</aside>' +
        '</div>' +
        (level === 0 ? '<section class="card cvc-preview-card" aria-labelledby="cvc-preview-title"><h2 id="cvc-preview-title">CVC assessment · Teacher preview words</h2><p>Teach these words before the running record, then tick each item previewed. These names and story words are not all CVC. Ticked words are highlighted yellow in the passage. Mark the passage as usual to see how the student retains them after teaching.</p><div id="cvc-preview-results"></div></section><section class="card cvc-word-results" aria-labelledby="cvc-word-results-title"><h2 id="cvc-word-results-title">Correct and incorrect CVC words</h2><div id="cvc-word-results"></div></section>' : '') +
        '<section class="card decoding-card" aria-labelledby="decoding-title"><h2 id="decoding-title">Reading and decoding assessment</h2><p>Correct and incorrect passage words grouped by decoding feature. These results show whole-word reading; they do not isolate mastery of a single sound. A word may appear in more than one area.</p><div id="digraph-assessment"></div><div id="decoding-results"></div></section>' +
        '<div class="below-grid"><section class="card" aria-labelledby="questions-title"><p class="eyebrow">Talk about the story</p><h2 id="questions-title">Quick check</h2>' +
          '<p>Ask each question aloud. Select how well the student explains the answer. The buttons record the teacher’s judgment, not an automatic score.</p>' +
          '<div id="questions"></div>' +
        '</section><section class="card"><p class="eyebrow">Teacher notes</p><h2>Retell & next step</h2>' +
          '<label class="field-label" for="teacher-notes">What did the reader do well? What should you practise next?</label>' +
          '<textarea id="teacher-notes" class="teacher-notes" placeholder="Type notes here. They save on this device.">' + escapeHTML(state.notes) + '</textarea>' +
          '<details><summary>Teacher answer guide</summary><p><strong>Surprise:</strong> They came to play with a new frisbee and unexpectedly arrived on burn day. Their favourite wildflower patch looked black and bare.</p>' +
          '<p><strong>Feelings:</strong> Luna felt sad and believed the forest was ruined. Peter worried about animal food. New growth helped them feel hopeful and glad.</p>' +
          '<p><strong>Explanation:</strong> A trained team planned and controlled the burn. Removing dead grass and leaves lets light reach the ground and helps native plants and young black oak trees grow. Some roots and seeds survive.</p>' +
          '<p><strong>Observations:</strong> They returned each week to the same spot on an open path. At first they saw no change; then a green shoot, more plants, and butterflies appeared.</p>' +
          '<p><strong>First clue:</strong> Luna found a tiny green shoot.</p>' +
          '<p><strong>Main idea:</strong> A carefully planned burn can help a habitat renew itself. Asking questions and observing changes can help us understand an unexpected event.</p></details>' +
        '</section></div>' +
        '<div class="below-grid"><section class="card" aria-labelledby="behaviours-title"><p class="eyebrow">Teacher observations</p><h2 id="behaviours-title">Reading behaviours</h2>' +
          '<p>For each item, tap <strong>Observed</strong> or <strong>Practise next</strong>. Tap a selected button again to clear it.</p>' +
          '<div id="reading-behaviours"></div></section>' +
          '<section class="card" aria-labelledby="strategies-title"><p class="eyebrow">Teacher observations</p><h2 id="strategies-title">Reading strategies</h2>' +
          '<p>Record only what you noticed during this reading. Unselected items are not assessed.</p>' +
          '<div id="reading-strategies"></div></section></div>' +
        '<nav class="story-nav" aria-label="Reading level navigation"><span id="previous-story"></span><a class="action-button primary" href="' + homeHref(student) + '">All levels</a><span id="next-story"></span></nav>' +
      '</div><section id="print-report" aria-label="Printable running record"></section>';

    var questions = [
      {id:'problem', text:'What surprised Peter and Luna when they came to play with their new frisbee?'},
      {id:'feelings', text:'How did Peter and Luna feel about the missing wildflowers? Why?'},
      {id:'rejectedIdeas', text:'Why was the fire planned, and how could it help native plants and young oak trees?'},
      {id:'mapAndMarkers', text:'What did the Nature Detectives observe over several weeks?'},
      {id:'detail', text:story.detailQuestion},
      {id:'mainIdea', text:'What is the main idea of this story?'}
    ];
    document.getElementById('questions').innerHTML = questions.map(function (question) {
      return '<div class="response-question"><strong>' + escapeHTML(question.text) + '</strong>' +
        '<div class="rating-row" data-question="' + question.id + '">' +
          '<button type="button" class="rating-button" data-rating="yes">Explains clearly</button>' +
          '<button type="button" class="rating-button" data-rating="partial">With support</button>' +
          '<button type="button" class="rating-button" data-rating="notyet">Not yet</button>' +
        '</div></div>';
    }).join('');
    function observationHTML(items, type) {
      return items.map(function (item) {
        return '<div class="observation-item" data-observation="' + item.id + '" data-observation-type="' + type + '">' +
          '<strong>' + escapeHTML(item.label) + '</strong>' +
          '<div class="rating-row"><button type="button" class="rating-button" data-observation-value="observed">✓ Observed</button>' +
          '<button type="button" class="rating-button" data-observation-value="next">↗ Practise next</button></div></div>';
      }).join('');
    }
    document.getElementById('reading-behaviours').innerHTML = observationHTML(readingBehaviours, 'behaviour');
    document.getElementById('reading-strategies').innerHTML = observationHTML(readingStrategies, 'strategy');
    if (level > 0) {
      document.getElementById('previous-story').innerHTML = '<a class="plain-button" data-fresh-level="' + (level - 1) + '" href="' + storyHref(level - 1, student) + '">← Easier level</a>';
    }
    if (level < story.levels.length - 1) {
      document.getElementById('next-story').innerHTML = '<a class="action-button primary" data-fresh-level="' + (level + 1) + '" href="' + storyHref(level + 1, student) + '">Next level →</a>';
    }

    function elapsedNow() {
      return state.elapsed + (timerStart ? (Date.now() - timerStart) / 1000 : 0);
    }
    function omissionIndices() {
      return Object.keys(state.marks).filter(function (index) {
        return state.marks[index] && state.marks[index].status === 'omission';
      }).map(Number).sort(function (a, b) { return a - b; });
    }
    function omissionNumber(index) {
      return omissionIndices().indexOf(Number(index)) + 1;
    }
    function recordMetrics() {
      var errors = 0;
      var omissions = 0;
      var self = 0;
      var correct = 0;
      words.forEach(function (_word, index) {
        var mark = state.marks[index];
        if (!mark) correct++;
        else if (mark.status === 'self') self++;
        else {
          errors++;
          if (mark.status === 'omission') omissions++;
        }
      });
      var accuracy = words.length ? Math.round((words.length - errors) / words.length * 1000) / 10 : 100;
      var seconds = elapsedNow();
      var wpm = seconds >= 30 ? Math.round((words.length - errors) / (seconds / 60)) : null;
      return {total:words.length, correct:correct, errors:errors, omissions:omissions, self:self, accuracy:accuracy, wpm:wpm, seconds:seconds};
    }
    function save() {
      state.updatedAt = new Date().toISOString();
      var stored = Object.assign({}, state, {elapsed:elapsedNow(), running:false});
      var okay = writeStore(key, stored);
      document.getElementById('save-note').textContent = okay ? 'Saved on this device · ' + new Date().toLocaleTimeString() : 'Browser storage unavailable. Print this record before leaving.';
    }
    function updateRestoreButton() {
      document.getElementById('restore-button').hidden = !hasRecordWork(readStore(previousKey, {}));
    }
    function initialSoundOption(word) {
      var match = plainWord(word).match(/^(scr|spl|spr|str|squ|shr|thr|bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw|dw|sh|ch|th|wh|ph)/);
      return match ? match[0] : '';
    }
    function pairedDecodingGroupsHTML() {
      var categories = [
        {name:'Vowel neighbours',emoji:'👫',explanation:'These words contain neighbouring vowel letters or a vowel team, such as ee in seed or ow in grow. The sound can vary from word to word.',match:function(w){var m=w.match(/(ai|ay|ee|ea|oa|oo|ow|ou|ew|ue|oi|oy|au|aw|ie|ei|ui|ey|oe)/);return m?m[0]:'';}},
        {name:'Consonant blends at the end',emoji:'🔗',explanation:'These words end in consonants whose separate sounds can still be heard, such as st in forest.',match:function(w){if(/(sh|ch|th|ck|ng|ph)$/.test(w))return '';var m=w.match(/(nths|ngs|nds|nts|sts|mps|lps|lfs|lts|lds|rds|rks|rms|rns|rts|fts|cts|sks|sps|nd|nt|st|mp|nk|ft|lt|ld|lk|lp|lf|pt|ct|sk|sp|rd|rk|rm|rn|rt|ts|ds|ps|bs|gs|ks)$/);return m?m[0]:'';}},
        {name:'Digraphs at the end',emoji:'🔤',explanation:'These words end in two consonants that work together to make one sound, such as ck in black. The three-letter ending tch is not included here.',match:function(w){if(/tch$/.test(w))return '';var m=w.match(/(sh|ch|th|ck|ng|ph)$/);return m?m[0]:'';}},
        {name:'Silent letters at the end',emoji:'🤫',explanation:'These words have an ending letter that is not pronounced separately, such as the final e in come or the gh in high.',match:function(w){if(/(igh|ough)$/.test(w))return 'gh';if(/mb$/.test(w))return 'b';if(/mn$/.test(w))return 'n';if(/[^aeiou]e$/.test(w)&&!/^(the|he|she|we|be|me)$/.test(w))return 'e';return '';}}
      ];
      var taught=taughtWordSet();
      return '<h3>Correct · word-pattern groups</h3><p class="small-note">These words were read correctly, including mistakes your child fixed. Each occurrence is listed. A word can appear in several groups.</p>'+renderGroup(false)+'<h3>Incorrect · word-pattern groups</h3><p class="small-note">These words were read incorrectly or skipped. The letter pattern helps choose words for practice; it does not tell us which part caused the mistake. Words can appear in several groups.</p>'+renderGroup(true);
      function renderGroup(wantIncorrect){
        return categories.map(function(category){
          var items=[];
          words.forEach(function(raw,index){
            var mark=state.marks[index];
            if(!!(mark&&mark.status!=='self')!==wantIncorrect)return;
            var pattern=category.match(plainWord(raw));
            if(!pattern)return;
            items.push('<li>'+escapeHTML(raw)+' — <strong>'+pattern+'</strong> <small>(word '+(index+1)+(mark&&mark.status==='self'?'; correct — student corrected':'')+(mark&&mark.status==='omission'?'; omitted':'')+(taught.has(plainWord(raw))?'; pretaught':'')+')</small></li>');
          });
          return '<section class="paired-decoding-group"><h4><span class="assessment-emoji">'+category.emoji+'</span> '+category.name+' ('+items.length+')</h4><p class="section-explanation">'+category.explanation+'</p>'+(items.length?'<ul>'+items.join('')+'</ul>':'<p>No words recorded in this group.</p>')+'</section>';
        }).join('');
      }
    }
    function finalSoundAssessmentHTML() {
      var results = [];
      words.forEach(function(raw,index) {
        var mark=state.marks[index];
        if (!mark || mark.status === 'self') return;
        var word=plainWord(raw);
        if (/tch$/.test(word)) return; // tch is a trigraph, not a digraph.
        var digraph=word.match(/(sh|ch|th|ck|ng|ph)$/);
        var blend=word.match(/(nths|ngs|nds|nts|sts|mps|lps|lfs|lts|lds|rds|rks|rms|rns|rts|fts|cts|sks|sps|nd|nt|st|mp|nk|ft|lt|ld|lk|lp|lf|pt|ct|sk|sp|rd|rk|rm|rn|rt|ts|ds|ps|bs|gs|ks)$/);
        var ending=digraph?digraph[1]:blend?blend[1]:'';
        if (!ending) return;
        results.push('<li>'+escapeHTML(raw)+' — <strong>'+ending+'</strong> ('+(digraph?'final digraph':'final consonant blend')+') <small>(word '+(index+1)+(mark.status==='omission'?'; omitted':'')+')</small></li>');
      });
      return '<h3>Words incorrect · ending digraph or consonant blend ('+results.length+')</h3><p class="small-note">These words were read incorrectly or skipped and have a letter team at the end. A digraph makes one sound, such as ck in black. A blend keeps its separate consonant sounds, such as st in forest. The ending is shown to help choose practice words; this does not tell us which part caused the mistake. Student-corrected words count as correct and are not listed here.</p>'+(results.length?'<ul>'+results.join('')+'</ul>':'<p>No words recorded in this group.</p>');
    }
    function digraphAssessmentHTML() {
      var incorrect = [], correct = [];
      words.forEach(function(word,index) {
        var digraph = initialSoundOption(word);
        if (!digraph) return;
        var mark = state.marks[index];
        var label = '<li>' + escapeHTML(word) + ' — <strong>' + digraph + '</strong> (' + (/^(sh|ch|th|wh|ph)$/.test(digraph) ? 'digraph' : 'blend') + ') <small>(word ' + (index + 1) + (mark && mark.status === 'self' ? '; correct — student corrected' : '') + ')</small></li>';
        if (!mark || mark.status === 'self') correct.push(label);
        else if (mark.status === 'error' && mark.detectedDigraph === digraph) incorrect.push(label);
      });
      return '<h3>Correct initial sound, incorrect word reading (' + incorrect.length + ')</h3><p class="small-note">Your child recognised the beginning sound but needed help with the rest of the word. This is useful progress to notice. The whole word still counts as incorrect in the reading score.</p>' + (incorrect.length ? '<ul>' + incorrect.join('') + '</ul>' : '<p>None recorded.</p>') + '<h3>Correct words beginning with a digraph or consonant blend (' + correct.length + ')</h3><p class="small-note">These words begin with a letter team, such as ch in chair or bl in black, and were read correctly. “Student corrected” means your child noticed a mistake and fixed it; it does not mean the first try was correct.</p>' + (correct.length ? '<ul>' + correct.join('') + '</ul>' : '<p>None recorded.</p>');
    }
    function decodingAreasHTML(printing) {
      var compounds = /^(wildflowers?|sunlight|notebooks?|butterflies|butterfly|underground|afternoon|sometimes|anyone|everything|something|without|outside|inside|nearby|sunshine)$/;
      var silent = /^(signs?|high|light|lights|sunlight|right|night|might|sight|thought|bought|brought|through|know|knows|knew|knees?|knock|write|wrote|wrong|whole|who|whose|walk|walked|walking|talk|talked|calm|half|could|would|should)$/;
      var areas = [
        {title:'Initial consonants · single consonant', test:function(w){return /^[bcdfghjklmnpqrstvwxyz][aeiou]/.test(w) && !/^(qu|wh|th|sh|ch|ph|kn|wr)/.test(w);}},
        {title:'Initial consonant blends', test:function(w,f){return /Initial consonant cluster/.test(f) || /^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw|scr|spr|str)/.test(w);}},
        {title:'Consonant digraphs · sh, ch, th, wh, ph, ck, ng', test:function(w){return /(sh|ch|th|wh|ph|ck|ng)/.test(w);}},
        {title:'Short vowels · CVC words', test:function(w,f){return /CVC pattern/.test(f);}},
        {title:'Vowel neighbours · vowel teams', test:function(w,f){return /(ai|ay|ee|ea|oa|oo|ow|ou|ew|ue|oi|oy|au|aw)/.test(w) && /Vowel team|Vowel spelling|vowel team|vowel spelling/.test(f) && !/Irregular|irregular/.test(f);}},
        {title:'Long vowels · silent e', test:function(w,f){return /CVCe/.test(f);}},
        {title:'R-controlled vowels', test:function(w,f){return /R-controlled/.test(f);}},
        {title:'Silent letters', test:function(w,f){return silent.test(w) || /silent [a-z]|[a-z] is silent/i.test(f) || /igh/.test(w);}},
        {title:'Compound words', test:function(w){return compounds.test(w);}},
        {title:'Word endings · -s, -es, -ed, -ing', test:function(w,f){return /plural -s|plural -es|-[se]s ending|-s ending|-es ending|-ed ending|Suffix -ed|Suffix -ing|Base .*;.*-s/.test(f);}},
        {title:'Multisyllable words', test:function(w,f){return /Two syllables|Three syllables|syllables|syllable words|Longer word/i.test(f);}},
        {title:'Irregular high-frequency words', test:function(w,f){return /Irregular high-frequency|irregular high-frequency/.test(f);}}
      ];
      var explanations = [
        'A single letter starts the word, such as m in mat. These results show whole-word reading, not a separate test of that first sound.',
        'A blend has neighbouring consonants whose sounds can still be heard, such as bl in black or st in stop.',
        'A digraph is two letters working together to make one sound, such as sh in ship or ch in chair.',
        'Short-vowel words such as cat, red, and sun follow a consonant–vowel–consonant pattern.',
        'Vowel neighbours are letters that work together to represent a vowel sound, such as ee in seed or oa in boat.',
        'An e at the end can help the earlier vowel say its name, as in the change from cap to cape.',
        'The letter r changes the vowel sound beside it, as in ar in park or or in forest.',
        'Some written letters are not pronounced, such as k in know or g in sign.',
        'Two smaller words join to make one larger word, such as sun + light = sunlight.',
        'Endings can change a word’s meaning or tell us when something happened, such as -s in seeds or -ed in helped.',
        'Longer words have more than one spoken beat, such as but-ter-fly. Breaking them into parts can help.',
        'These familiar words have a part that does not follow the usual sound pattern, such as said or was.'
      ];
      var taught = taughtWordSet();
      return '<p class="small-note">These groups help you see which letter patterns your child read successfully and which could use more practice. “Correct” includes mistakes your child fixed. “Omitted” means a word was skipped. A repeated word is counted each time it appears. “Pretaught” means the teacher taught it before reading. “Not assessed” means this story had no matching words, not that your child could not read them.</p>' + areas.map(function(area, areaIndex) {
        var correct=[], incorrect=[];
        words.forEach(function(raw,index) {
          var word=plainWord(raw), feature=readingFeature(word,raw);
          if(!area.test(word,feature)) return;
          var mark=state.marks[index];
          var label=escapeHTML(raw)+' <small>(word '+(index+1)+(taught.has(word)?'; pretaught':'')+(mark && mark.status==='self'?'; self-corrected':mark && mark.status==='omission'?'; omitted':'')+')</small>';
          (mark && mark.status!=='self'?incorrect:correct).push('<li>'+label+'</li>');
        });
        var total=correct.length+incorrect.length;
        var heading=escapeHTML(area.title)+' · '+(total?correct.length+' / '+total+' correct ('+(Math.round(correct.length/total*1000)/10)+'%)':'Not assessed');
        var content=total?'<table class="preview-table"><thead><tr><th>Correct ('+correct.length+')</th><th>Incorrect ('+incorrect.length+')</th></tr></thead><tbody><tr><td>'+(correct.length?'<ul>'+correct.join('')+'</ul>':'None')+'</td><td>'+(incorrect.length?'<ul>'+incorrect.join('')+'</ul>':'None')+'</td></tr></tbody></table>':'<p>No matching words in this passage.</p>';
        var explanation = '<p class="section-explanation">' + explanations[areaIndex] + '</p>';
        return printing?'<section><h3>'+heading+'</h3>'+explanation+content+'</section>':'<details class="decoding-area"><summary>'+heading+'</summary>'+explanation+content+'</details>';
      }).join('');
    }
    function cvcWordResultsHTML() {
      var correct = [], incorrect = [];
      var taught = taughtWordSet();
      words.forEach(function (word, index) {
        if (!/CVC pattern/.test(readingFeature(plainWord(word), word))) return;
        var mark = state.marks[index];
        var label = escapeHTML(word) + ' <small>(word ' + (index + 1) + (taught.has(plainWord(word)) ? '; pretaught' : '') + (mark && mark.status === 'self' ? '; self-corrected' : mark && mark.status === 'omission' ? '; omitted' : '') + ')</small>';
        (mark && mark.status !== 'self' ? incorrect : correct).push('<li>' + label + '</li>');
      });
      var total = correct.length + incorrect.length;
      return '<p><strong>CVC score:</strong> ' + correct.length + ' / ' + total + ' (' + (total ? Math.round(correct.length / total * 1000) / 10 : 0) + '%)</p><p class="small-note">CVC means consonant–vowel–consonant: a short word such as cat, sun, or red. This section looks only at those short-vowel words. The lists show words read correctly and words to revisit together. Mistakes your child fixed count as correct and are labelled. Skipped words count as incorrect. Words taught beforehand are labelled “pretaught”.</p><table class="preview-table"><thead><tr><th>Correct CVC words (' + correct.length + ')</th><th>Incorrect CVC words (' + incorrect.length + ')</th></tr></thead><tbody><tr><td>' + (correct.length ? '<ul>' + correct.join('') + '</ul>' : 'None') + '</td><td>' + (incorrect.length ? '<ul>' + incorrect.join('') + '</ul>' : 'None') + '</td></tr></tbody></table>';
    }
    function previewAssessmentHTML(printing) {
      var additions = Array.isArray(state.customPreviewTerms) ? state.customPreviewTerms : [];
      var previewTerms = defaultPreviewTerms.concat(additions);
      var previewWords = new Set(previewTerms.join(' ').toLowerCase().split(/\s+/).map(plainWord));
      var taught = state.previewTaught || {};
      var all = {total:0, correct:0, self:0, errors:0};
      var without = {total:0, correct:0, self:0, errors:0};
      function add(result, index) {
        result.total++;
        var mark = state.marks[index];
        if (!mark) result.correct++;
        else if (mark.status === 'self') result.self++;
        else result.errors++;
      }
      words.forEach(function (word, index) {
        add(all, index);
        if (!previewWords.has(plainWord(word))) add(without, index);
      });
      function score(result) {
        return (result.correct + result.self) + ' / ' + result.total + ' (' + (result.total ? Math.round((result.correct + result.self) / result.total * 1000) / 10 : 0) + '%)';
      }
      var rowItems = previewTerms.map(function (term, termIndex) {
        var parts = term.toLowerCase().split(/\s+/).map(plainWord);
        var result = {total:0, correct:0, self:0, errors:0};
        words.forEach(function (word, index) {
          if (parts.indexOf(plainWord(word)) >= 0) add(result, index);
        });
        return '<tr><td>' + escapeHTML(term) + '</td><td>' + (printing ? (taught[termIndex] ? 'Yes' : 'Not recorded') : '<label><input type="checkbox" data-preview-term="' + termIndex + '" aria-label="Previewed ' + escapeHTML(term) + '"' + (taught[termIndex] ? ' checked' : '') + '> Previewed</label>') + '</td><td>' + result.total + '</td><td>' + result.correct + '</td><td>' + result.self + '</td><td>' + result.errors + '</td></tr>';
      });
      var rows = rowItems.slice(0, defaultPreviewTerms.length).join('');
      var additionRows = rowItems.slice(defaultPreviewTerms.length).join('');
      var tableHead = '<div style="overflow-x:auto"><table class="preview-table"><thead><tr><th>Preview word or phrase</th><th>Teacher previewed</th><th>Word occurrences</th><th>Correct unaided</th><th>Self-corrected</th><th>Errors / omissions</th></tr></thead><tbody>';
      return '<h3>CVC reading scores</h3><p><strong>Overall score:</strong> ' + score(all) + '</p><p><strong>Score without preview words:</strong> ' + score(without) + '</p><p class="small-note">The overall score includes every word in the story. The second score leaves out the preview words and teacher additions, so you can see how your child read the other words. Both scores count mistakes your child fixed as correct. The remaining words are not all CVC words.</p><h3>Preview-word retention after teaching</h3><p class="small-note">The teacher introduced these words before the story. This table shows how your child read them afterwards. “Correct unaided” means read without a recorded correction. “Self-corrected” means your child fixed a mistake. The teaching tick tells us a word was taught; it does not mean your child read it correctly. Repeated words are counted each time.</p>' + tableHead + rows + '</tbody></table></div><h3>Teacher additions</h3><p class="small-note">These are extra words the teacher chose to teach before reading. The results show how your child read them in the story. A word with zero occurrences did not appear in this passage and was not assessed.</p>' + (additionRows ? tableHead + additionRows + '</tbody></table></div>' : '<p>No teacher additions recorded.</p>');
    }
    function updateTeacherAddedWords() {
      if (level !== 0) return;
      var additions = Array.isArray(state.customPreviewTerms) ? state.customPreviewTerms : [];
      document.getElementById('teacher-added-list').innerHTML = additions.length ? '<ul class="teacher-added-words">' + additions.map(function (term) { return '<li>' + escapeHTML(term) + '</li>'; }).join('') + '</ul>' : '<p class="small-note">No words added yet. Add preview words above to show them here.</p>';
    }
    function updateMetrics() {
      updateTeacherAddedWords();
      document.getElementById('decoding-results').innerHTML = decodingAreasHTML(false);
      document.getElementById('digraph-assessment').innerHTML = digraphAssessmentHTML() + finalSoundAssessmentHTML() + pairedDecodingGroupsHTML();
      var metrics = recordMetrics();
      if (level === 0) {
        document.getElementById('cvc-preview-results').innerHTML = previewAssessmentHTML(false);
        document.getElementById('cvc-word-results').innerHTML = cvcWordResultsHTML();
      }
      document.getElementById('metric-total').textContent = metrics.total;
      document.getElementById('metric-errors').textContent = metrics.errors;
      document.getElementById('metric-omissions').textContent = metrics.omissions;
      document.getElementById('metric-self').textContent = metrics.self;
      document.getElementById('metric-correct').textContent = metrics.correct;
      document.getElementById('metric-accuracy').textContent = metrics.accuracy + '%';
      document.getElementById('time-display').textContent = formatTime(metrics.seconds);
      document.getElementById('wpm-display').textContent = 'Words per minute: ' + (metrics.wpm == null ? '— (time 30 seconds first)' : metrics.wpm);
      document.getElementById('timer-button').textContent = timerStart ? '⏸ Pause' : '▶ Start';
    }
    function positionWordTicks() {
      var ticks = document.getElementById('word-ticks');
      if (ticks.hidden || selectedWord == null) return;
      var word = document.querySelector('.word-token[data-word="' + selectedWord + '"]');
      if (!word) return;
      var rect = word.getBoundingClientRect();
      ticks.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - ticks.offsetWidth - 8)) + 'px';
      ticks.style.top = Math.max(8, rect.top - ticks.offsetHeight - 10) + 'px';
    }
    window.addEventListener('scroll', positionWordTicks, true);
    window.addEventListener('resize', positionWordTicks);
    function wordErrorCodes(mark) {
      if (!mark || mark.status === 'self') return [];
      var codes = String(mark.code || '').split(/\s+/).map(function (code) { return code === 'N' ? 'NM' : code; }).filter(function (code) { return ['NM','M','REV','I'].indexOf(code) >= 0; });
      if (mark.firstSound === 'yes' && codes.indexOf('I') < 0) codes.push('I');
      return codes;
    }
    function updateSelectedPanel() {
      var box = document.getElementById('selection-box');
      var slot = document.getElementById('selection-slot');
      var mark = selectedWord == null ? null : state.marks[selectedWord];
      box.hidden = !mark;
      slot.hidden = !mark;
      document.getElementById('word-ticks').hidden = !mark;
      if (!mark) return;
      var digraph = initialSoundOption(words[selectedWord]);
      document.getElementById('digraph-ticks').innerHTML = digraph ? '<label><input type="checkbox" data-digraph="' + digraph + '"' + (mark.detectedDigraph === digraph ? ' checked' : '') + '> ' + digraph + ' · correct initial sound</label>' : '';
      positionWordTicks();
      document.getElementById('selection-word').textContent = 'Word ' + (selectedWord + 1) + ': “' + words[selectedWord] + '”' +
        (mark.status === 'omission' ? ' · Omission #' + omissionNumber(selectedWord) : '');
      document.getElementById('self-correct').checked = mark.status === 'self';
      document.getElementById('omit-word').textContent = mark.status === 'omission' ? '↩ Mark as error' : '∅ Omit word';
      document.getElementById('initial-sound-row').hidden = mark.status !== 'error';
      document.getElementById('first-sound-yes').setAttribute('aria-pressed', String(mark.firstSound === 'yes'));
      document.getElementById('first-sound-no').setAttribute('aria-pressed', String(mark.firstSound === 'no'));
      document.querySelectorAll('[data-code]').forEach(function (button) {
        button.checked = wordErrorCodes(mark).indexOf(button.dataset.code) >= 0;
      });
    }
    function pretaughtSlideWords() {
      var result = [], seen = new Set();
      defaultPreviewTerms.concat(state.customPreviewTerms || []).forEach(function (term, index) {
        if (!state.previewTaught || !state.previewTaught[index]) return;
        term.split(/\s+/).forEach(function (word) {
          var normalized = plainWord(word);
          if (!normalized || seen.has(normalized)) return;
          seen.add(normalized);
          result.push(word.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, ''));
        });
      });
      return result;
    }
    if (level === 0) document.getElementById('export-preview-slides').addEventListener('click', async function () {
      var button = document.getElementById('export-preview-slides');
      var status = document.getElementById('preview-export-status');
      var slideWords = pretaughtSlideWords();
      if (!slideWords.length) { status.textContent = 'Tick Previewed beside at least one word in the assessment first.'; return; }
      button.disabled = true;
      status.textContent = 'Creating word slides…';
      try {
        var bytes = await window.RIVER_WORD_SLIDES.build(slideWords);
        var blob = new Blob([bytes], {type:'application/vnd.ms-powerpoint.presentation.macroEnabled.12'});
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'RiverReader2-' + student.replace(/[^a-z0-9-]/gi,'-') + '-pretaught-words.pptm';
        link.textContent = 'Save PPTM · ' + slideWords.length + ' slides';
        link.className = 'plain-button';
        status.textContent = 'Your slides are ready. If the download does not start, click Save PPTM below. ';
        status.appendChild(link);
        link.click();
      } catch (error) { status.textContent = 'Could not create slides: ' + (error.message || 'Please refresh and try again.'); }
      finally { button.disabled = false; }
    });
    function taughtWordSet() {
      var taught = new Set();
      if (level !== 0) return taught;
      defaultPreviewTerms.concat(state.customPreviewTerms || []).forEach(function (term, index) {
        if (state.previewTaught && state.previewTaught[index]) {
          term.split(/\s+/).forEach(function (word) { taught.add(plainWord(word)); });
        }
      });
      return taught;
    }
    function updateTaughtHighlights() {
      var taught = taughtWordSet();
      document.querySelectorAll('.word-token').forEach(function (button) {
        var highlighted = taught.has(plainWord(words[Number(button.dataset.word)]));
        button.classList.toggle('is-pretaught', highlighted);
      });
    }
    function updateMarks() {
      updateTaughtHighlights();
      document.querySelectorAll('.word-token').forEach(function (button) {
        var index = button.dataset.word;
        var mark = state.marks[index];
        button.classList.toggle('is-error', !!mark && mark.status === 'error');
        button.classList.toggle('is-omission', !!mark && mark.status === 'omission');
        button.classList.toggle('is-self', !!mark && mark.status === 'self');
        button.classList.toggle('is-selected', selectedWord === Number(index));
        button.setAttribute('aria-pressed', String(!!mark));
        button.title = mark ? (mark.status === 'self' ? 'Self-corrected' : mark.status === 'omission' ? 'Omission #' + omissionNumber(index) : 'Incorrect') + ' — tap to review' : 'Tap to mark incorrect';
      });
      updateSelectedPanel();
      updateMetrics();
    }
    function updateRatings() {
      document.querySelectorAll('[data-question]').forEach(function (row) {
        row.querySelectorAll('[data-rating]').forEach(function (button) {
          button.setAttribute('aria-pressed', String(state.responses[row.dataset.question] === button.dataset.rating));
        });
      });
    }
    function updateObservations() {
      document.querySelectorAll('.observation-item').forEach(function (row) {
        row.querySelectorAll('[data-observation-value]').forEach(function (button) {
          button.setAttribute('aria-pressed', String(state.observations[row.dataset.observation] === button.dataset.observationValue));
        });
      });
    }

    if (level === 0) document.getElementById('add-preview-words').addEventListener('click', function () {
      var input = document.getElementById('extra-preview-words');
      var entries = input.value.split(/[,;\n]+/).map(function (term) { return term.trim().replace(/\s+/g, ' '); }).filter(Boolean);
      state.customPreviewTerms = Array.isArray(state.customPreviewTerms) ? state.customPreviewTerms : [];
      var added = 0;
      entries.forEach(function (term) {
        if (!/[a-z]/i.test(term)) return;
        var normal = term.toLowerCase().split(/\s+/).map(plainWord).join(' ');
        var exists = defaultPreviewTerms.concat(state.customPreviewTerms).some(function (existing) { return existing.toLowerCase().split(/\s+/).map(plainWord).join(' ') === normal; });
        if (!exists) { state.customPreviewTerms.push(term); added++; }
      });
      input.value = '';
      document.getElementById('preview-add-status').textContent = added ? added + ' teacher addition(s) added. Tick Previewed after teaching.' : 'Enter a new word or phrase to add.';
      updateMetrics();
      save();
    });
    if (level === 0) document.getElementById('cvc-preview-results').addEventListener('change', function (event) {
      var input = event.target.closest('input[data-preview-term]');
      if (!input) return;
      state.previewTaught = state.previewTaught || {};
      state.previewTaught[input.dataset.previewTerm] = input.checked;
      updateTaughtHighlights();
      document.getElementById('decoding-results').innerHTML = decodingAreasHTML(false);
      document.getElementById('cvc-word-results').innerHTML = cvcWordResultsHTML();
      save();
    });
    document.getElementById('passage').addEventListener('click', function (event) {
      var button = event.target.closest('.word-token');
      if (!button) return;
      var index = Number(button.dataset.word);
      if (!state.marks[index]) state.marks[index] = {status:'error', code:''};
      selectedWord = index;
      updateMarks();
      document.querySelector('.teacher-column').scrollTop = 0;
      save();
    });
    document.getElementById('passage').addEventListener('contextmenu', function (event) {
      if (event.target.closest('.word-token')) event.preventDefault();
    });
    document.getElementById('self-correct').addEventListener('click', function () {
      var mark = state.marks[selectedWord];
      if (!mark) return;
      mark.status = mark.status === 'self' ? 'error' : 'self';
      if (mark.status === 'self') { mark.code = ''; delete mark.firstSound; delete mark.detectedDigraph; }
      updateMarks();
      save();
    });
    document.getElementById('omit-word').addEventListener('click', function () {
      var mark = state.marks[selectedWord];
      if (!mark) return;
      mark.status = mark.status === 'omission' ? 'error' : 'omission';
      if (mark.status === 'omission') { delete mark.firstSound; delete mark.detectedDigraph; mark.code = wordErrorCodes(mark).filter(function (code) { return code !== 'I'; }).join(' '); }
      updateMarks();
      save();
    });
    function setFirstSound(value) {
      var mark = state.marks[selectedWord];
      if (!mark || mark.status !== 'error') return;
      if (mark.firstSound === value) delete mark.firstSound;
      else mark.firstSound = value;
      if (mark.firstSound !== 'yes') delete mark.detectedDigraph;
      var codes = wordErrorCodes(mark).filter(function (code) { return code !== 'I'; });
      if (mark.firstSound === 'yes') { codes = codes.filter(function (code) { return code !== 'REV'; }); codes.push('I'); }
      mark.code = codes.join(' ');
      updateSelectedPanel();
      save();
    }
    document.getElementById('first-sound-yes').addEventListener('click', function () { setFirstSound('yes'); });
    document.getElementById('first-sound-no').addEventListener('click', function () { setFirstSound('no'); });
    document.getElementById('clear-mark').addEventListener('click', function () {
      if (selectedWord == null) return;
      delete state.marks[selectedWord];
      selectedWord = null;
      updateMarks();
      save();
    });
    document.getElementById('digraph-ticks').addEventListener('change', function(event) {
      var input = event.target.closest('input[data-digraph]');
      var mark = state.marks[selectedWord];
      if (!input || !mark || input.dataset.digraph !== initialSoundOption(words[selectedWord])) return;
      if (input.checked) {
        mark.status = 'error';
        mark.detectedDigraph = input.dataset.digraph;
        mark.firstSound = 'yes';
        mark.code = wordErrorCodes(mark).filter(function(code) { return code !== 'REV' && code !== 'I'; }).concat('I').join(' ');
      } else delete mark.detectedDigraph;
      updateMarks();
      save();
    });
    document.querySelectorAll('[data-code]').forEach(function (button) {
      button.addEventListener('click', function () {
        var mark = state.marks[selectedWord];
        if (!mark) return;
        var code = button.dataset.code;
        var codes = wordErrorCodes(mark).filter(function (existing) {
          return existing !== code && !(button.checked && (code === 'M' || code === 'NM') && (existing === 'M' || existing === 'NM')) && !(button.checked && ((code === 'I' && existing === 'REV') || (code === 'REV' && existing === 'I')));
        });
        if (button.checked) { codes.push(code); if (mark.status === 'self') mark.status = 'error'; }
        if (code === 'REV' && button.checked) { delete mark.firstSound; delete mark.detectedDigraph; }
        if (code === 'I') {
          if (button.checked) { mark.firstSound = 'yes'; mark.status = 'error'; }
          else { delete mark.firstSound; delete mark.detectedDigraph; }
        }
        mark.code = codes.join(' ');
        updateMarks();
        save();
      });
    });
    document.getElementById('questions').addEventListener('click', function (event) {
      var button = event.target.closest('[data-rating]');
      if (!button) return;
      var questionId = button.closest('[data-question]').dataset.question;
      state.responses[questionId] = button.dataset.rating;
      updateRatings();
      save();
    });
    function observationClick(event) {
      var button = event.target.closest('[data-observation-value]');
      if (!button) return;
      var id = button.closest('[data-observation]').dataset.observation;
      var value = button.dataset.observationValue;
      if (state.observations[id] === value) delete state.observations[id];
      else state.observations[id] = value;
      updateObservations();
      save();
    }
    document.getElementById('reading-behaviours').addEventListener('click', observationClick);
    document.getElementById('reading-strategies').addEventListener('click', observationClick);
    document.getElementById('teacher-notes').addEventListener('input', function (event) {
      state.notes = event.target.value;
      save();
    });
    document.getElementById('timer-button').addEventListener('click', function () {
      if (timerStart) {
        state.elapsed = elapsedNow();
        timerStart = 0;
        save();
      } else {
        timerStart = Date.now();
      }
      updateMetrics();
    });
    setInterval(function () {
      if (!timerStart) return;
      updateMetrics();
      save();
    }, 1000);
    window.addEventListener('beforeunload', function () {
      if (timerStart) {
        state.elapsed = elapsedNow();
        timerStart = 0;
      }
      save();
    });

    document.getElementById('print-button').addEventListener('click', function () {
      save();
      buildPrintReport();
      requestAnimationFrame(function () { window.print(); });
    });
    document.getElementById('reset-button').addEventListener('click', function () {
      if (!window.confirm('Start a fresh record for this student and reading level? This clears the current marks, timing, responses, and notes.')) return;
      if (hasRecordWork(state) && !writeStore(previousKey, state)) {
        document.getElementById('save-note').textContent = 'Could not preserve the current record. Print it before starting fresh.';
        return;
      }
      state = {marks:{}, responses:{}, observations:{}, notes:'', elapsed:0, updatedAt:null};
      timerStart = 0;
      selectedWord = null;
      document.getElementById('teacher-notes').value = '';
      updateMarks();
      updateRatings();
      updateObservations();
      updateRestoreButton();
      save();
    });
    document.getElementById('restore-button').addEventListener('click', function () {
      var previous = readStore(previousKey, {});
      if (!hasRecordWork(previous) || !window.confirm('Restore the previous record for this student and level? The current record will be saved as the previous one if it has work.')) return;
      var current = state;
      if (!writeStore(previousKey, hasRecordWork(current) ? current : {})) {
        document.getElementById('save-note').textContent = 'Could not preserve the current record. Nothing was changed.';
        return;
      }
      state = previous;
      timerStart = 0;
      selectedWord = null;
      document.getElementById('teacher-notes').value = state.notes || '';
      updateMarks();
      updateRatings();
      updateObservations();
      updateRestoreButton();
      save();
    });
    updateMarks();
    updateRatings();
    updateObservations();
    updateMetrics();
    updateRestoreButton();
    if (entryNote) document.getElementById('save-note').textContent = entryNote;

    function buildPrintReport() {
      var metrics = recordMetrics();
      var reportPassageWordIndex = 0;
      var statusLabels = {yes:'Explains clearly',partial:'With support',notyet:'Not yet'};
      var firstSoundYes = 0;
      var firstSoundNo = 0;
      var wordLedgerRows = words.map(function (word, wordIndex) {
        var wordMark = state.marks[wordIndex];
        var resultKind = !wordMark ? 'correct' : wordMark.status === 'self' ? 'self-corrected' : wordMark.status === 'omission' ? 'omission' : 'incorrect';
        var wordStatus = resultKind === 'omission' ? 'Omission #' + omissionNumber(wordIndex) :
          resultKind === 'self-corrected' ? 'Correct — student corrected' : resultKind === 'incorrect' ? 'Incorrect' : 'Correct';
        var firstSound = '—';
        if (resultKind === 'incorrect') {
          firstSound = wordMark.firstSound === 'yes' ? 'Yes' : wordMark.firstSound === 'no' ? 'No' : 'Not recorded';
          if (firstSound === 'Yes') firstSoundYes++;
          if (firstSound === 'No') firstSoundNo++;
        }
        var codes = wordErrorCodes(wordMark);
        var codeLabels = {I:'Initial sound detected — error', REV:'Reversal', NM:'Non-meaningful error', N:'Non-meaningful error', M:'Meaningful error'};
        var wordCode = codes.length ? ' · ' + codes.map(function (code) { return escapeHTML(codeLabels[code] || code); }).join(' · ') : '';
        if (wordMark && wordMark.status === 'error' && wordMark.detectedDigraph) wordCode += ' · Correct initial sound: ' + escapeHTML(wordMark.detectedDigraph) + ' (' + (/^(sh|ch|th|wh|ph)$/.test(wordMark.detectedDigraph) ? 'digraph' : 'consonant blend') + ') — incorrect word reading';
        var info = wordInfo(word, wordIndex, words);
        return '<tr class="word-result" data-status="' + resultKind + '"><td class="word-number">' + (wordIndex + 1) + '</td>' +
          '<td><strong>' + escapeHTML(word) + '</strong></td><td class="word-status">' + wordStatus + wordCode + '</td>' +
          '<td>' + firstSound + '</td><td>' + escapeHTML(info.feature) + '</td><td>' + escapeHTML(info.significance) + '</td></tr>';
      });
      var selectedObservations = [
        ...readingBehaviours.map(function (item) { return {group:'Reading behaviour', item:item}; }),
        ...readingStrategies.map(function (item) { return {group:'Reading strategy', item:item}; })
      ].filter(function (entry) { return state.observations[entry.item.id]; });
      var observationRows = selectedObservations.map(function (entry) {
        return '<tr><td>' + entry.group + '</td><td>' + escapeHTML(entry.item.label) + '</td><td>' +
          (state.observations[entry.item.id] === 'observed' ? 'Observed' : 'Practise next') + '</td></tr>';
      }).join('');
      var taughtForReport = taughtWordSet();
      var reportPassage = paragraphs.map(function (paragraph) {
        return '<p>' + wordParts(paragraph).map(function (part) {
          if (!isWord(part)) return escapeHTML(part);
          var index = reportPassageWordIndex++;
          var mark = state.marks[index];
          var css = mark ? (mark.status === 'self' ? 'report-self' : mark.status === 'omission' ? 'report-omission' : 'report-error') : '';
          if (taughtForReport.has(plainWord(part))) css += ' report-pretaught';
          return '<span class="' + css + '">' + escapeHTML(part) + '</span>';
        }).join('') + '</p>';
      }).join('');
      document.getElementById('print-report').innerHTML =
        '<h1>Your child’s reading report</h1><p class="family-intro">This report is a snapshot of one reading of <strong>' + escapeHTML(story.title) + '</strong>. It shows successes, words to practise, and observations to discuss with the teacher. It is not a grade or a diagnosis.</p><h2>Reading at a glance</h2><p>The accuracy score shows how many words were read correctly, including words your child corrected. Skipped words are included in errors. Reading time adds context; understanding and accuracy matter alongside speed.</p>' +
        '<div class="report-meta"><div><strong>Student:</strong> ' + escapeHTML(studentLabel(student)) + '</div><div><strong>Reading level:</strong> ' + escapeHTML(levelInfo.label) + '</div>' +
          '<div><strong>Story:</strong> ' + escapeHTML(story.title) + '</div><div><strong>Printed:</strong> ' + escapeHTML(new Date().toLocaleString()) + '</div>' +
          '<div><strong>Words:</strong> ' + metrics.total + '</div><div><strong>Correct without a correction:</strong> ' + metrics.correct + '</div>' +
          '<div><strong>Errors (including omissions):</strong> ' + metrics.errors + '</div><div><strong>Omissions:</strong> ' + metrics.omissions + '</div>' +
          '<div><strong>Self-corrections:</strong> ' + metrics.self + '</div><div><strong>Accuracy:</strong> ' + metrics.accuracy + '%</div>' +
          '<div><strong>First-letter sound on errors:</strong> Yes ' + firstSoundYes + ' · No ' + firstSoundNo + ' · Not recorded ' + (metrics.errors - metrics.omissions - firstSoundYes - firstSoundNo) + '</div>' +
          '<div><strong>Check:</strong> ' + metrics.correct + ' correct + ' + metrics.errors + ' errors + ' + metrics.self + ' self-corrected = ' + metrics.total + ' words</div>' +
          '<div><strong>Read-aloud time:</strong> ' + (metrics.seconds > 0 ? formatTime(metrics.seconds) : 'Not timed') + '</div><div><strong>Words per minute:</strong> ' + (metrics.wpm == null ? 'Not timed long enough' : metrics.wpm) + '</div></div>' +
        (level === 0 ? '<section><h2>Teacher preview words · CVC assessment</h2>' + previewAssessmentHTML(true) + '</section><section><h2>Correct and incorrect CVC words</h2>' + cvcWordResultsHTML() + '</section>' : '') +
        '<h2>Passage with teacher marks</h2><p>Read this marked story alongside the results. Words without a mark were recorded as correct. A wavy underline shows a reading error, a line through a word shows it was skipped, and a straight underline shows your child corrected it. Yellow highlighting identifies words taught beforehand.</p><div class="report-passage">' + reportPassage + '</div>' +
        '<h2>Word-by-word results, features, and significance</h2>' +
          '<p>This detailed list explains what happened with each word. “Feature” is a letter or sound clue that can help with reading. “Significance” explains the word’s job in the story. Recognising a beginning sound is helpful, but the whole word is still incorrect if it was not read correctly. A reversal means letters or sounds were read in a different order. A meaningful error means the incorrect word still makes sense in the sentence; a non-meaningful error does not. These are the teacher’s recorded judgments.</p>' +
          (metrics.correct === metrics.total ? '<p>No words marked incorrect. Every word is Correct.</p>' : '') +
          '<table class="word-ledger"><thead><tr><th>#</th><th>Word</th><th>Result</th><th>First sound</th><th>Feature</th><th>Significance</th></tr></thead><tbody>' + wordLedgerRows.join('') + '</tbody></table>' +
        '<section><h2>Reading and decoding assessment</h2>' + digraphAssessmentHTML() + finalSoundAssessmentHTML() + pairedDecodingGroupsHTML() + decodingAreasHTML(true) + '</section>' +
        '<div class="print-no-break"><h2>Comprehension and main idea</h2><p>Reading is also about understanding. These questions explore what your child remembers, how the characters felt, and what the story means. The teacher records how much support was needed. “Not marked” means no judgment was recorded.</p>' +
          '<table><thead><tr><th>Question</th><th>Teacher judgment</th></tr></thead><tbody>' +
          questions.map(function (question) {
            return '<tr><td>' + escapeHTML(question.text) + '</td><td>' + escapeHTML(statusLabels[state.responses[question.id]] || 'Not marked') + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
        '<div class="print-no-break"><h2>Reading behaviours and strategies</h2><p>These are habits that help children become confident readers, such as trying to sound out a word, rereading, or noticing a mistake. “Observed” means the teacher saw the habit during this reading. “Practise next” identifies a useful next step. An unselected habit has not been assessed.</p>' +
          (observationRows ? '<table><thead><tr><th>Type</th><th>Teacher-selected item</th><th>Assessment</th></tr></thead><tbody>' + observationRows + '</tbody></table>' :
            '<p>No reading behaviours or strategies were selected. Unselected items were not assessed.</p>') +
        '</div>' +
        '<div class="print-no-break"><h2>Teacher notes</h2><p>The teacher’s observations describe strengths and next steps. Ask which one or two skills would be most useful to practise together at home.</p><div class="report-note">' + escapeHTML(state.notes || 'No notes entered.') + '</div></div>' +
        '<p><small>How the score works: words read correctly, including student corrections, are divided by all words in the story. Beginning-sound successes are recorded separately when the whole word is incorrect. Results are based on the teacher’s marks during this reading.</small></p>';
      var sectionLetter = 0;
      var reportElement = document.getElementById('print-report');
      reportElement.innerHTML = reportElement.innerHTML.replace(/<h2>([\s\S]*?)<\/h2>/g, function (_match, title) {
                var emojis = {'Reading at a glance':'📊','Teacher preview words · CVC assessment':'👩‍🏫','Correct and incorrect CVC words':'🔤','Passage with teacher marks':'📖','Word-by-word results, features, and significance':'🔎','Reading and decoding assessment':'🧩','Comprehension and main idea':'💬','Reading behaviours and strategies':'🌱','Teacher notes':'📝'};
        return '<h2>' + String.fromCharCode(65 + sectionLetter++) + '. ' + '<span class="assessment-emoji">' + (emojis[title] || '📚') + '</span> ' + title + '</h2>';
      });
      var subsectionEmojis = ['🔠','🔡','🔗','🔤','👫','✨','🦁','🤫','🧱','🌿','👏','⭐'];
      reportElement.innerHTML = reportElement.innerHTML.replace(/<h3>([\s\S]*?)<\/h3>/g, function (_match, title) {
        var emoji = title.indexOf('Correct · word-pattern') === 0 ? '✅' : title.indexOf('Incorrect · word-pattern') === 0 ? '🔎' : title.indexOf('CVC reading scores') === 0 ? '📊' : title.indexOf('Preview-word retention') === 0 ? '🧠' : title.indexOf('Teacher additions') === 0 ? '➕' : title.indexOf('Correct initial sound') === 0 ? '👂' : title.indexOf('Correct words beginning') === 0 ? '✅' : title.indexOf('Words incorrect · ending') === 0 ? '🔚' : '🔎';
        var areaNames = ['Initial consonants · single','Initial consonant blends','Consonant digraphs','Short vowels','Vowel neighbours','Long vowels','R-controlled','Silent letters','Compound words','Word endings','Multisyllable','Irregular high-frequency'];
        areaNames.forEach(function (name, index) { if (title.indexOf(name) === 0) emoji = subsectionEmojis[index]; });
        return '<h3><span class="assessment-emoji">' + emoji + '</span> ' + title + '</h3>';
      });
    }
  }

  window.RIVER_READER_UTILS = {wordCount:wordCount, wordInfo:wordInfo, formatTime:formatTime, storyHref:storyHref};
}());
