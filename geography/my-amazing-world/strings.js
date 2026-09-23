/* strings.js — every word a pupil reads in My Amazing World lives here (one place, so the cold read covers all of it).
   Rule: name the whole act before the control. No slogans. British spelling. */
window.MAW_STRINGS = {
  title: 'My Amazing World',
  door: {
    lead: 'A race around the world in seven legs. Finish a leg and it stamps your passport.',
    nameLabel: 'Your explorer name',
    namePlaceholder: 'First name',
    nameHelp: 'Type your first name, then press Start the race.',
    start: 'Start the race',
    needName: 'Type your name first.',
    welcomeBack: function (n) { return 'Welcome back, ' + n + '.'; },
    stampCount: function (n) { return n === 1 ? '1 stamp in your passport.' : n + ' stamps in your passport.'; },
    carryOn: 'Carry on',
    restart: 'Start again',
    restartWarn: 'Starting again wipes every stamp and all your points.',
    restartYes: 'Yes, wipe it and start again',
    restartNo: 'No, keep my passport'
  },
  header: {
    leg: function (n, total) { return 'Leg ' + n + ' of ' + total; },
    points: function (p) { return p + (p === 1 ? ' pt' : ' pts'); },
    passport: 'Passport',
    sub: 'Race Around the World · Geography · Year 8'
  },
  legTitle: function (L) { return 'Leg ' + L.n + ' · ' + L.title; },
  brief: {
    oceans: 'The globe names an ocean. Spin the globe with your finger or mouse, find that ocean, and tap it. Five oceans, then your first stamp.',
    continents: 'Drag each continent name from the tray onto its continent on the map. When all seven are placed, press Check. Wrong names come back to the tray for one more go.',
    europe: 'Tap ten countries on the map of Europe, one at a time. Then drop a pin on five capital cities: the closer your pin, the more points. Drag the map to move it; scroll or pinch to zoom.',
    ni: 'Northern Ireland in three parts. First tap its six counties. Then find its rivers, loughs, mountains and towns. Then answer ten questions about it, mostly by tapping the map.',
    ireland: 'Find the two parts of the island, drop pins on the two capital cities, drag the four provinces into place, then find mountains, rivers, cities and counties.',
    types: 'Sort fourteen words into Physical, Human and Environmental geography. Then look at three real photographs of the Earth taken from space and tap what each one asks for.',
    final: 'Five mystery places. Read a clue, spin the globe and drop a pin where you think the place is. Each extra clue costs a point. Then measure how far it is from New York to Lisbon.'
  },
  buttons: {
    ready: 'Ready — show me the globe',
    readyMap: 'Ready — show me the map',
    readySort: 'Ready — show me the words',
    next: 'Next ocean',
    nextTask: 'Next',
    check: 'Check my answers',
    checkAgain: 'Check again',
    carryOn: 'Carry on',
    listOpen: 'Choose from a list instead',
    listClose: 'Back to the map',
    clue: 'Next clue',
    spin: 'Spin the globe',
    ruler: 'Use the ruler',
    lockRuler: 'Lock in my measurement',
    copy: 'Copy my score',
    copySoFar: 'Copy my score so far',
    copied: 'Copied',
    print: 'Print my certificate',
    again: 'Start again',
    finish: 'Collect my stamp',
    certificate: 'See my certificate',
    nextLeg: function (L) { return 'Next leg: ' + L.title; },
    passport: 'Open my passport',
    back: 'Back to the race',
    door: 'Back to the start',
    answer: 'Lock in my answer'
  },
  oceans: {
    task: function (name) { return 'Tap the ' + name; },
    sub: 'Spin the globe to find it. Your first tap counts.',
    count: function (i, n) { return 'Ocean ' + i + ' of ' + n; },
    label: 'Ocean',
    clock: function (t) { return 'Clock ' + t; },
    right: function (name, points) {
      if (points === 3) return 'Yes — the ' + name + '. 3 points.';
      if (points === 2) return 'Got it on the second tap. 2 points.';
      if (points === 1) return 'Third tap. 1 point.';
      return 'Now you know where it is. 0 points this time.';
    },
    wrongLand: function (continent) { return 'That is land — ' + continent + '. Oceans are the blue. Try again.'; },
    wrongSea: function (sea) { return 'That is the ' + sea + '. A sea, not an ocean. Try again.'; },
    wrongLake: 'That is the Caspian Sea — really a giant lake, closed in by land. Try again.',
    wrongOcean: function (name) { return 'That is the ' + name + '. Try again.'; },
    hint: function (h) { return ' Hint: ' + h; },
    reveal: function (name) { return 'Here it is — the ' + name + ' is lit up in gold. Tap it to carry on.'; },
    revealMiss: function (hitLine, name) { return hitLine.replace(/ Try again\.$/, '') + ' The ' + name + ' is the gold part. Tap inside it.'; }
  },
  legDone: {
    title: function (L) { return 'Stamp earned: ' + L.title; },
    points: function (p, max) { return 'You scored ' + p + ' of ' + max + ' points on this leg.'; },
    time: function (t) { return 'Time on the clock: ' + t + '.'; },
    stamp: function (L) { return L.stamp; }
  },
  expedition: {
    title: 'Expedition',
    open: 'Open Google Earth',
    opens: '(opens in a new tab)',
    then: 'Then come back and answer the question.',
    right: function (p) { return 'Right. ' + p + (p === 1 ? ' point.' : ' points.'); },
    wrong: function (answer, why) { return 'No — the answer is ' + answer + '. ' + why + ' 0 points.'; }
  },
  passport: {
    title: 'Explorer Passport',
    explorer: function (n) { return 'Explorer: ' + n; },
    points: function (p) { return p + (p === 1 ? ' point' : ' points'); },
    rank: function (r) { return 'Rank: ' + r; },
    empty: 'not yet',
    now: 'in progress',
    tokenLabel: 'Your score',
    tokenHelp: 'Press the button, then paste your score where your teacher asked (Teams, Google Classroom or an email). The game never sends it anywhere.',
    tokenSelect: 'or select it and copy it:',
    copyFailed: 'Copying did not work here. Select the score below and copy it.'
  },
  /* Tasks on the maps (Legs 2–5, 7). Each task line names the act first. */
  play: {
    clock: function (t) { return 'Clock ' + t; },
    part: function (label, i, n) { return label + ' ' + i + ' of ' + n; },
    sub: {
      tap: 'Drag the map to move it and pinch or scroll to zoom. Your first tap counts.',
      pin: 'Tap the map to drop your pin. You get one pin, so zoom in first if you need to.',
      drag: 'Drag a name onto the map, or tap a name and then tap the map. Place them all, then check.',
      choice: 'Choose one answer. You get one try.',
      globePin: 'Spin the globe and tap to drop your pin. You get one pin.',
      ruler: 'Press Use the ruler, then drag from one city to the other. Spin the globe first so you can see both.'
    },
    right: function (points) {
      if (points >= 2) return 'Yes. ' + points + ' points.';
      if (points === 1) return 'Got it on the second tap. 1 point.';
      return 'Now you know where it is. 0 points this time.';
    },
    wrongRegion: function (name) { return name ? 'That is ' + name + '. Try again.' : 'That is the sea. Try again.'; },
    wrongFeature: function (name) { return name ? 'That is ' + name + '. Try again.' : 'Nothing there. Tap right on the line, lake, mountain or dot.'; },
    wrongSea: function (name) { return name === 'land' ? 'That is land. Tap the sea.' : 'That is the ' + name + '. Try again.'; },
    reveal: function (name) { return 'Here it is — ' + name + ' is lit up in gold. Tap it to carry on.'; },
    pinResult: function (km, points) { return 'Your pin is ' + km.toLocaleString('en-GB') + ' km away. ' + points + (points === 1 ? ' point.' : ' points.'); },
    pinTrue: 'The gold pin shows where it really is.',
    choiceRight: function (p) { return 'Right. ' + p + (p === 1 ? ' point.' : ' points.'); },
    choiceWrong: function (answer) { return 'No — it is ' + answer + '. 0 points.'; },
    listLead: 'Choose the right one. It scores the same as tapping the map.',
    listDrag: 'Tap a name, then choose the letter on the map where it belongs.',
    listRuler: 'Choose the distance. Right scores 3 points.',
    placeAll: function (n) { return n === 1 ? 'Place 1 more name, then check.' : 'Place ' + n + ' more names, then check.'; },
    yourPin: 'your pin'
  },
  tasks: {
    /* Leg 2 */
    continents: 'Drag each name onto its continent',
    continentsDone: function (p) { return 'All seven continents placed. ' + p + (p === 1 ? ' point.' : ' points.'); },
    tileWrong: function (tile, on) { return tile + ' was on ' + on + '.'; },
    tilesBack: 'The names in the tray were in the wrong place. Place them again, then check again for 1 point each.',
    tilesShown: 'The last ones are now shown in the right place. 0 points for those.',
    continentsKicker: 'Continents',
    /* Leg 3 */
    country: function (n) { return 'Tap ' + (n === 'United Kingdom' ? 'the United Kingdom' : n); },
    capital: function (n, c) { return 'Drop a pin on ' + n + ', the capital of ' + (c === 'United Kingdom' ? 'the United Kingdom' : c); },
    partCountries: 'Country',
    partCapitals: 'Capital',
    /* Leg 4 */
    county: function (n) { return 'Tap County ' + n; },
    feature: function (n) {
      if (/^River |^Lough |^Lower |^Upper /.test(n)) return 'Tap the ' + n.replace(/^Lough/, 'Lough').replace(/^River/, 'River');
      if (/Mountains$/.test(n)) return 'Tap the ' + n;
      if (n === 'Slieve Gullion') return 'Tap Slieve Gullion';
      return 'Tap the town of ' + n;
    },
    partCounties: 'County',
    partFeatures: 'Feature',
    partQuestions: 'Question',
    q: {
      highest: 'Tap the mountains where the highest mountain in Northern Ireland stands',
      range: 'Choose the mountain range that includes Slieve Donard',
      largest: 'Tap the largest lake in Northern Ireland and the UK',
      longest: 'Tap the longest river in Northern Ireland',
      basalt: 'Tap the coastal landmark made of six-sided basalt columns',
      plateau: 'Choose the name of the large plateau in County Antrim',
      lakelands: 'Tap the county that is home to the lakelands around Enniskillen',
      second: 'Tap the second largest lake in Northern Ireland',
      west: 'Tap the mountain range in the west of Northern Ireland',
      ocean: "Tap the ocean that borders Northern Ireland's north and west coast"
    },
    /* Leg 5 */
    ireland: {
      north: 'Tap Northern Ireland',
      south: 'Tap the Republic of Ireland',
      pin: function (n, of) { return 'Drop a pin on ' + n + ', the capital of ' + of; },
      provinces: 'Drag the four provinces onto the map',
      carrauntoohil: "Tap Carrauntoohil, Ireland's highest mountain",
      kerry: 'Tap the county Carrauntoohil is in',
      shannon: "Tap the River Shannon, Ireland's longest river",
      city: function (n) { return 'Tap the city of ' + n; },
      munster: 'Tap any county in Munster',
      connacht: 'Tap any county in Connacht',
      counties: 'Choose how many counties there are on the island of Ireland',
      causeway: "Tap the county the Giant's Causeway is in",
      part: 'Task'
    },
    /* Leg 6 */
    types: {
      task: 'Drag each word into Physical, Human or Environmental',
      zones: { Physical: 'Physical geography — the natural world: land, water and weather', Human: 'Human geography — people and what they do', Environmental: 'Environmental geography — how people and the natural world affect each other' },
      tray: 'Words to sort',
      sub: 'Drag a word into a group, or tap a word and then tap the group name.',
      placeAll: function (n) { return n === 1 ? 'Place 1 more word, then check.' : 'Place ' + n + ' more words, then check.'; },
      done: function (p) { return 'Sorted. ' + p + (p === 1 ? ' point.' : ' points.'); },
      back: 'The words in the tray were in the wrong group. Place them again, then check again for 1 point each.',
      shown: 'The last ones are now shown in the right group. 0 points for those.',
      photoTask: function (i, n) { return 'Photo ' + i + ' of ' + n; },
      photoRight: 'Yes. 2 points.',
      photoWrong: 'Not quite — the right place is outlined in gold. 0 points.',
      photoSub: 'Tap the photo. You get one tap.',
      credit: function (c) { return 'Photo: ' + c; }
    },
    /* Leg 7 */
    mystery: function (i) { return 'Drop a pin where you think mystery place ' + i + ' is'; },
    partMystery: 'Mystery place',
    rulerPart: 'Measure',
    clueLabel: function (i) { return 'Clue ' + i + ' of 3'; },
    clueCost: 'Each extra clue costs 1 point.',
    mysteryResult: function (name, km, points) { return 'It was ' + name + '. Your pin is ' + km.toLocaleString('en-GB') + ' km away. ' + points + (points === 1 ? ' point.' : ' points.'); },
    rulerTask: 'Measure how far it is from New York to Lisbon',
    rulerHint: 'New York is on the east coast of North America. Lisbon is on the west coast of Portugal, in Europe.',
    rulerLive: function (km) { return 'Ruler: ' + km.toLocaleString('en-GB') + ' km'; },
    rulerNone: 'Ruler: drag on the globe to measure.',
    rulerResult: function (measured, real, points) { return 'You measured ' + measured.toLocaleString('en-GB') + ' km. It is about ' + real.toLocaleString('en-GB') + ' km. ' + points + (points === 1 ? ' point.' : ' points.'); },
    rulerOption: function (k) { return k.toLocaleString('en-GB') + ' km'; }
  },
  finish: {
    kicker: 'Certificate',
    title: 'Race Around the World',
    awarded: 'This certifies that',
    line: function (rank) { return 'finished all seven legs and earned the rank of ' + rank + '.'; },
    points: function (p, max) { return p + ' of ' + max + ' points'; },
    date: function (d) { return d; },
    again: 'Starting again wipes your passport. Use it only when you want to race from the very start.'
  },
  aria: {
    globe: 'Globe. Drag to spin, scroll to zoom, tap to answer.',
    map: 'Map. Drag to move, scroll or pinch to zoom, tap to answer. A list of answers is under the map.',
    tray: 'Names to place',
    legs: 'Legs of the race',
    feedback: 'Feedback'
  }
};
