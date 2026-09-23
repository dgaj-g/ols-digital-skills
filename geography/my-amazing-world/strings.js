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
    passport: 'Passport'
  },
  legTitle: function (L) { return 'Leg ' + L.n + ' · ' + L.title; },
  brief: {
    oceans: 'The globe names an ocean. Spin the globe with your finger or mouse, find that ocean, and tap it. Five oceans, then your first stamp.'
  },
  buttons: {
    ready: 'Ready — show me the globe',
    next: 'Next ocean',
    finish: 'Collect my stamp',
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
    tokenLater: 'Your score token appears here once all seven stamps are in.',
    token: function (t) { return 'Score token: ' + t; }
  },
  later: { /* PROTOTYPE ONLY — removed in the full build */
    title: function (L) { return 'Leg ' + L.n + ' · ' + L.title + ' opens in the full build.'; },
    text: 'This is the prototype. Leg 1 runs end to end; the other six legs are built next.'
  },
  aria: {
    globe: 'Globe. Drag to spin, scroll to zoom, tap to answer.',
    feedback: 'Feedback'
  }
};
