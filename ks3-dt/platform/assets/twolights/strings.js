/* TWO LIGHTS · every string the hour shows (spec §8, §6, §3, §5), byte for byte. Nothing on screen is written anywhere
   else: the engine renders from here, the words gate (A1) reads every entry, the coverage gate (A14) checks this file
   against the spec both ways. {x} slots are filled by the engine; `ex` is the spec's own example filling.
   type: line (≤ 12 words) · instruction (≤ 14) · say (each sentence ≤ 12, prose < 40) · card (several short sentences,
   each on its own line, each ≤ 12) · label (button, poster, header; a poster's title and line are shown apart).
   UMD: window.TwoLightsStrings. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TwoLightsStrings = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var S = {
    // stage pills (§3 TOP)
    'pill.radio': { t: 'label', s: 'Another light' },
    'pill.coldopen': { t: 'label', s: 'Fog' },
    'pill.tour': { t: 'label', s: 'Tour' },
    'pill.ch1': { t: 'label', s: 'Read the red' },
    'pill.ch2': { t: 'label', s: 'Silent' },
    'pill.ch3': { t: 'label', s: 'Hand it back' },
    'pill.ch4': { t: 'label', s: 'Bug Bounty' },
    'pill.home': { t: 'label', s: 'Home' },
    // ceremony (stage radio)
    'cer.1': { t: 'line', s: 'ANOTHER LIGHT ANSWERS.' },
    'cer.2': { t: 'line', s: 'You are the keeper of the {mine}.', ex: { mine: 'North Light' } },
    'cer.3': { t: 'line', s: 'Someone in this room keeps the {other}.', ex: { other: 'South Light' } },
    'cer.4': { t: 'line', s: 'You will not know who. They will not know who.' },
    'cer.5': { t: 'line', s: 'You find out at the end.' },
    'cer.trio': { t: 'line', s: 'The Lightship answers too.' },
    'cer.solo': { t: 'line', s: 'Tonight you keep both lights.' },
    'btn.begin': { t: 'label', s: 'Begin' },
    // cold open
    'open.1': { t: 'line', s: 'Marigold is coming home in fog.' },
    'open.2': { t: 'line', s: 'Three puffins aboard: Pip, Nuala and wee Finn.' },
    'open.3': { t: 'line', s: 'She needs every light to find the channel.' },
    'open.4': { t: 'line', s: 'Every light is out.' },
    'btn.tour': { t: 'label', s: 'Show me around' },
    // tour
    'tour.1': { t: 'card', s: 'Your code. Three things are wired already: light, horn and radio.' },
    'tour.2': { t: 'card', s: 'Your console. Python\'s words appear here, red when something is wrong.' },
    'tour.3': { t: 'card', s: 'The window. That is THEIR light. You can never see your own.' },
    'tour.4': { t: 'card', s: 'The radio. Four buttons. The only way to reach them.' },
    'tour.5': { t: 'card', s: 'The bounty board. Five kinds of fault. Name one to earn a bounty.' },
    'tour.6': { t: 'card', s: 'The bay. Marigold the boat drifts to the rocks while a fault is left.' },
    'tour.last': { t: 'instruction', s: 'You cannot see your own light. They can. Tell them what you see.' },
    'btn.next': { t: 'label', s: 'Next' },
    'btn.again': { t: 'label', s: 'Show me around again' },
    // always visible (§3, 321)
    'top.pair': { t: 'card', s: 'You keep the {mine}. Someone keeps the {other}.', ex: { mine: 'North Light', other: 'South Light' } },
    'top.trio': { t: 'card', s: 'You keep the {mine}. Someone keeps the {other} and the {third}.', ex: { mine: 'North Light', other: 'South Light', third: 'Lightship' } },
    'top.solo': { t: 'line', s: 'You keep both lights tonight.' },
    'console.head': { t: 'label', s: 'Your console' },
    'btn.run': { t: 'label', s: 'RUN' },
    // bar lines (one at a time)
    'bar.run': { t: 'instruction', s: 'Press RUN and read what Python says.' },
    'bar.readred': { t: 'instruction', s: 'Read the red. Which line does it name?' },
    'bar.fixline': { t: 'instruction', s: 'Fix line {n}, then RUN again.', ex: { n: 9 } },
    'bar.lampon': { t: 'instruction', s: 'Your lamp is on. Watch their light.' },
    'bar.tell.light': { t: 'instruction', s: 'Their light is out. Tell them.' },
    'bar.tell.horn': { t: 'instruction', s: 'Their horn is silent. Tell them.' },
    'bar.tell.none': { t: 'instruction', s: 'Their radio sent None. Tell them.' },
    'bar.slip': { t: 'instruction', s: 'A slip has arrived. Read your radio.' },
    'bar.hunt': { t: 'instruction', s: 'Nothing is red and nothing happened. Find the fault in your code.' },
    'bar.name': { t: 'instruction', s: 'Click the poster that names this fault.' },
    'bar.turning': { t: 'line', s: 'Every light is on. Marigold is turning.' },
    'bar.putback': { t: 'instruction', s: 'Line {n} was right before. Put it back.', ex: { n: 4 } },
    'bar.extra': { t: 'instruction', s: 'Line {n} is not part of this program. Delete it.', ex: { n: 6 } },
    'bar.slow': { t: 'instruction', s: 'The link to your partner is slow. Share one computer and take turns.' },
    'bar.dark': { t: 'instruction', s: 'The {other} has gone dark. Keep both lights yourself.', ex: { other: 'South Light' } },
    // solo symptoms (§6: the bar carries the symptom)
    'solo.light': { t: 'line', s: 'The light is out.' },
    'solo.horn': { t: 'line', s: 'The horn is silent.' },
    'solo.none': { t: 'line', s: 'The radio sent None.' },
    // radio
    'radio.light': { t: 'label', s: 'Your light is out' },
    'radio.horn': { t: 'label', s: 'No horn from you' },
    'radio.none': { t: 'label', s: 'I got None' },
    'radio.clear': { t: 'label', s: 'All clear' },
    'slip.light': { t: 'line', s: '{SIGN}: your light is out.', ex: { SIGN: 'SOUTH LIGHT' } },
    'slip.horn': { t: 'line', s: '{SIGN}: no horn from you.', ex: { SIGN: 'SOUTH LIGHT' } },
    'slip.none': { t: 'line', s: '{SIGN}: I got None.', ex: { SIGN: 'SOUTH LIGHT' } },
    'slip.clear': { t: 'line', s: '{SIGN}: all clear.', ex: { SIGN: 'SOUTH LIGHT' } },
    // presence (§6)
    'pres.typing': { t: 'line', s: '{Who} is typing.', ex: { Who: 'Your partner' } },
    'pres.line': { t: 'line', s: '{Who} is on line {n}.', ex: { Who: 'Your partner', n: 7 } },
    'pres.quiet': { t: 'line', s: '{Who} has gone quiet.', ex: { Who: 'Your partner' } },
    // say lines (one per chapter)
    'say.ch1': { t: 'say', s: 'Red lines name the line and the fault. Read them first.' },
    'say.ch2': { t: 'say', s: 'Some faults are silent. A function only runs when it is called.' },
    'say.ch3': { t: 'say', s: 'print shows it to you. return hands it back to the line that asked. The radio sends what comes back.' },
    // help ladders (three steps each); line numbers come from the real fault line (N5)
    'help.name.1': { t: 'instruction', s: 'Read the red. It names a line.' },
    'help.name.2': { t: 'instruction', s: 'Line {n} calls a name Python has never heard.', ex: { n: 9 } },
    'help.name.3': { t: 'instruction', s: 'Type {fix} on line {n}.', ex: { fix: 'lamp_on()', n: 9 } },
    'help.type.1': { t: 'instruction', s: 'Read the red. It names a line.' },
    'help.type.2': { t: 'instruction', s: 'Line {n} adds words to a number. Wrap the number in str( ).', ex: { n: 6 } },
    'help.type.3': { t: 'instruction', s: 'Type str(beam) in place of beam on line {n}.', ex: { n: 6 } },
    'help.indent.1': { t: 'instruction', s: 'Read the red. It names a line.' },
    'help.indent.2': { t: 'instruction', s: 'The line after def must be pushed in.' },
    'help.indent.3': { t: 'instruction', s: 'Push line {n} in by four spaces.', ex: { n: 10 } },
    'help.called.1': { t: 'instruction', s: 'Nothing is red and nothing happened.' },
    'help.called.2': { t: 'instruction', s: '{fn} is defined. Is it ever called?', ex: { fn: 'fog_horn' } },
    'help.called.3': { t: 'instruction', s: 'Type {fn}() on a new last line.', ex: { fn: 'fog_horn' } },
    'help.return.1': { t: 'instruction', s: 'Your console shows the number. Their radio got None.' },
    'help.return.2': { t: 'instruction', s: 'bearing prints the number but hands nothing back.' },
    'help.return.3': { t: 'instruction', s: 'Type return channel inside bearing, after the print.' },
    // rewind, running out of time, pause
    'rewind': { t: 'line', s: 'You have not reached that part of the story yet.' },
    'btn.late': { t: 'label', s: 'Running out of time?' },
    'late.line': { t: 'instruction', s: 'Here are the lines that are left. Type them and Marigold comes home.' },
    'btn.pause': { t: 'label', s: 'Pause the story' },
    'btn.carry': { t: 'label', s: 'Carry on' },
    // bounty board
    'poster.name': { t: 'label', s: 'NameError · a name Python has never heard' },
    'poster.type': { t: 'label', s: 'TypeError · words added to a number' },
    'poster.indent': { t: 'label', s: 'Not pushed in · a line that should sit under def' },
    'poster.called': { t: 'label', s: 'Never called · defined, but nobody called it' },
    'poster.return': { t: 'label', s: 'Nothing comes back · no return, so None' },
    'crew.total': { t: 'line', s: 'Your crew has found {n} of {m} faults.', ex: { n: 4, m: 6 } },
    // home
    'home.1': { t: 'line', s: 'Marigold is home. Every light was lit.' },
    'home.reveal': { t: 'line', s: 'The {other} was kept by {first}.', ex: { other: 'South Light', first: 'Aoife' } },
    'home.solo': { t: 'line', s: 'You kept both lights tonight.' },
    'home.bounties': { t: 'line', s: 'Bounties earned: {badges}.', ex: { n: 5, m: 6, badges: 'Red Reader, Radio Keeper, Bounty Hunter' } },
    'btn.exit': { t: 'label', s: 'Go to the five questions' },
    // extras
    'extras.1': { t: 'instruction', s: 'More posters. One fault each. Stop whenever you like.' }
  };
  function render(id, vars) {
    var e = S[id];
    if (!e) throw new Error('TwoLightsStrings: no string ' + id);
    return e.s.replace(/\{(\w+)\}/g, function (_, k) {
      if (!vars || vars[k] === undefined) throw new Error('TwoLightsStrings: ' + id + ' needs ' + k);
      return String(vars[k]);
    });
  }
  return { S: S, render: render };
}));
