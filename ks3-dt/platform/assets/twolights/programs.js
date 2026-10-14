/* TWO LIGHTS · the programs (spec §5). North's text is the spec's; the other seats come by substitution.
   Chapter 4 variants per N6: S1 pairs only with Q1Q2 (S1 and Q3 sit on the same line), so seven per seat.
   UMD: window.TwoLightsPrograms in the page, require() in the gates. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TwoLightsPrograms = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SEATS = {
    A: { key: 'north', name: 'North Light', beam: 24, blasts: 2, rocks: 34, channel: 214, file: 'north_light.py' },
    B: { key: 'south', name: 'South Light', beam: 18, blasts: 3, rocks: 57, channel: 237, file: 'south_light.py' },
    C: { key: 'lightship', name: 'Lightship', beam: 12, blasts: 1, rocks: 12, channel: 192, file: 'lightship.py' }
  };
  var VARIANTS = [
    { S: 'S1', Q: ['Q1', 'Q2'] },
    { S: 'S2', Q: ['Q1', 'Q2'] }, { S: 'S2', Q: ['Q1', 'Q3'] }, { S: 'S2', Q: ['Q2', 'Q3'] },
    { S: 'S3', Q: ['Q1', 'Q2'] }, { S: 'S3', Q: ['Q1', 'Q3'] }, { S: 'S3', Q: ['Q2', 'Q3'] }
  ];
  function lines(arr) { return arr.join('\n'); }
  function lampDef(s, opts) {
    opts = opts || {};
    var pr = 'print(name + " lamp on, beam " + ' + (opts.noStr ? 'beam' : 'str(beam)') + ')';
    return ['def lamp_on():', (opts.unindent ? '' : '    ') + pr, '    light(beam)'];
  }
  function ch1(s, stage) {
    // stage 0 given · 1 after fix 1 · 2 fixed
    return lines(['# ' + s.name + ' · the lamp', 'name = "' + s.name + '"', 'beam = ' + s.beam, '',
      'def lamp_on():',
      '    print(name + " lamp on, beam " + ' + (stage >= 2 ? 'str(beam)' : 'beam') + ')',
      '    light(beam)', '', stage >= 1 ? 'lamp_on()' : 'lampp_on()']);
  }
  function ch2(s, fixed) {
    var l = ['# ' + s.name + ' · the horn', 'blasts = ' + s.blasts, '', 'def fog_horn():',
      '    print("Horn: " + str(blasts) + " blasts")', '    horn(blasts)'];
    if (fixed) l.push('fog_horn()');
    return lines(l);
  }
  // fix: null given · 'after' return channel after the print · 'replace' · 'paren' return(channel) · 'sum' return 180 + rocks
  function ch3(s, fix) {
    var body = ['    print("Bearing " + str(channel))'];
    if (fix === 'after') body.push('    return channel');
    if (fix === 'replace') body = ['    return channel'];
    if (fix === 'paren') body.push('    return(channel)');
    if (fix === 'sum') body.push('    return 180 + rocks');
    return lines(['# ' + s.name + ' · the bearing', 'rocks = ' + s.rocks, 'channel = 180 + rocks', '', 'def bearing():']
      .concat(body, ['', 'b = bearing()', 'radio(b)']));
  }
  // faults: array of fault ids present (S1 S2 S3 Q1 Q2 Q3); [] is the clean night
  function ch4(s, faults) {
    faults = faults || [];
    var has = function (f) { return faults.indexOf(f) >= 0; };
    var l = ['# ' + s.name + ' · the whole night', 'name = "' + s.name + '"', 'beam = ' + s.beam, 'blasts = ' + s.blasts,
      'rocks = ' + s.rocks, 'channel = 180 + rocks', ''];
    l = l.concat(lampDef(s, { noStr: has('S2'), unindent: has('S3') }));
    l = l.concat(['', 'def fog_horn():', '    print("Horn: " + str(blasts) + " blasts")', '    horn(blasts)', '',
      'def bearing():', '    print("Bearing " + str(channel))']);
    if (!has('Q2')) l.push('    return channel');
    l.push('');
    if (!has('Q3')) l.push(has('S1') ? 'lamp_oon()' : 'lamp_on()');
    if (!has('Q1')) l.push('fog_horn()');
    l.push('b = bearing()', 'radio(b)');
    return lines(l);
  }
  function variantFaults(v) { return [v.S].concat(v.Q); }
  function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  // seats in one room never share a variant: base + 2i over seven
  function seatVariant(room, seat) {
    var i = 'ABC'.indexOf(seat), base = hash(String(room || '')) % VARIANTS.length;
    return VARIANTS[(base + 2 * i) % VARIANTS.length];
  }
  return { SEATS: SEATS, VARIANTS: VARIANTS, ch1: ch1, ch2: ch2, ch3: ch3, ch4: ch4, variantFaults: variantFaults,
    seatVariant: seatVariant, hash: hash };
}));
