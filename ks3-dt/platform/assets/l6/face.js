/* THE OPERATION · the patient's face (309b), shared by the operation, the ward round and the letter. */
(function () {
  var FACE_CSS = '<style>.pup{transition:transform .3s}.m-drive .pup{animation:dart 1.1s infinite}@keyframes dart{0%,100%{transform:translateX(-14px)}50%{transform:translateX(14px)}}.m-fan .drop{animation:drip 1.2s infinite}@keyframes drip{0%{opacity:0;transform:translateY(-6px)}50%{opacity:1}100%{opacity:0;transform:translateY(16px)}}.m-mem .q{animation:floatq 1.8s infinite}@keyframes floatq{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}.m-cpu .spin{transform-origin:270px 60px;animation:none}.shake{animation:fshake .5s}@keyframes fshake{0%,100%{transform:none}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}</style>';
  function face(mood) {
    var screenFill = mood === 'gpu' ? '#07090c' : mood === 'psu' ? '#2c3134' : mood === 'fan' ? '#ff9a7a' : mood === 'cpu' ? '#cfe6ff' : '#f6f1e6';
    var led = mood === 'psu' ? '#3a3f42' : '#5fd48a';
    var inner = '';
    if (mood !== 'gpu' && mood !== 'psu') {
      var eyes = mood === 'cpu' ? '<ellipse cx="120" cy="95" rx="22" ry="12" fill="#1a1a1a"/><ellipse cx="200" cy="95" rx="22" ry="12" fill="#1a1a1a"/>'
        : mood === 'fan' ? '<path d="M98 92 q22 -16 44 0" stroke="#1a1a1a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M178 92 q22 -16 44 0" stroke="#1a1a1a" stroke-width="7" fill="none" stroke-linecap="round"/>'
        : '<ellipse cx="120" cy="92" rx="24" ry="' + (mood === 'mem' ? 30 : 24) + '" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><ellipse cx="200" cy="92" rx="24" ry="' + (mood === 'mem' ? 30 : 24) + '" fill="#fff" stroke="#1a1a1a" stroke-width="4"/>'
          + '<g class="pup"><circle cx="' + (mood === 'mem' ? 112 : 120) + '" cy="' + (mood === 'mem' ? 80 : 92) + '" r="10" fill="#1a1a1a"/><circle cx="' + (mood === 'mem' ? 192 : 200) + '" cy="' + (mood === 'mem' ? 80 : 92) + '" r="10" fill="#1a1a1a"/></g>';
      var mouth = mood === 'happy' || mood === 'nothing' ? '<path d="M120 150 q40 34 80 0" stroke="#1a1a1a" stroke-width="7" fill="none" stroke-linecap="round"/>'
        : mood === 'mem' ? '<ellipse cx="160" cy="152" rx="12" ry="14" fill="#1a1a1a"/>'
        : mood === 'drive' ? '<path d="M118 152 q14 -10 28 0 t28 0 t28 0" stroke="#1a1a1a" stroke-width="7" fill="none" stroke-linecap="round"/>'
        : mood === 'cpu' ? '<ellipse cx="160" cy="152" rx="20" ry="12" fill="#1a1a1a"/><text x="196" y="160" font-size="34" font-family="Space Grotesk,sans-serif" font-weight="700" fill="#1a1a1a">…</text>'
        : mood === 'fan' ? '<ellipse cx="160" cy="154" rx="26" ry="18" fill="#1a1a1a"/><ellipse cx="160" cy="160" rx="14" ry="8" fill="#ff6b8a"/>' : '';
      var extra = mood === 'mem' ? '<g class="q" font-family="Space Grotesk,sans-serif" font-weight="700" fill="#5a4a9e"><text x="54" y="60" font-size="34">?</text><text x="246" y="56" font-size="40">?</text><text x="150" y="40" font-size="28">?</text></g>'
        : mood === 'fan' ? '<g class="drop" fill="#4aa3ff"><ellipse cx="70" cy="70" rx="7" ry="11"/><ellipse cx="250" cy="110" rx="7" ry="11"/></g><g stroke="#ff3b3b" stroke-width="4" fill="none" opacity=".7"><path d="M40 190 q10 -10 20 0 t20 0"/><path d="M240 190 q10 -10 20 0 t20 0"/></g>'
        : mood === 'cpu' ? '<g class="spin" stroke="#2a66c4" stroke-width="6" fill="none"><circle cx="270" cy="60" r="16" stroke-dasharray="60 40"/></g><g fill="#2a66c4" font-size="26"><text x="40" y="60">✻</text><text x="60" y="200">✻</text></g>'
        : mood === 'drive' ? '<g fill="#1a1a1a" opacity=".8"><rect x="36" y="44" width="40" height="30" rx="4" fill="none" stroke="#1a1a1a" stroke-width="3"/><text x="44" y="67" font-size="18" font-family="Space Grotesk,sans-serif" font-weight="700">0</text></g>' : '';
      inner = eyes + mouth + extra;
    } else if (mood === 'gpu') { inner = ''; }
    return '<svg viewBox="0 0 320 250" class="m-' + mood + '" xmlns="http://www.w3.org/2000/svg">' + FACE_CSS
      + '<rect x="6" y="6" width="308" height="214" rx="18" fill="#30383d"/><rect x="20" y="20" width="280" height="186" rx="10" fill="' + screenFill + '"/>'
      + '<g>' + inner + '</g><circle cx="290" cy="212" r="4" fill="' + led + '"/><rect x="130" y="222" width="60" height="10" rx="3" fill="#30383d"/><rect x="100" y="232" width="120" height="12" rx="5" fill="#30383d"/></svg>';
  }
  window.OPFACE = face;
})();
