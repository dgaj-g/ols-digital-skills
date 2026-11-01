/* The walker's right answers (spec V2 §7 to §10), where typing the card is not the answer. Per step id, in order asked.
   type: the whole box. q: the card with its ? replaced. */
module.exports = {
  w2: [{ q: '4' }],
  w3: [{ q: '6' }],
  w4: [{ q: '3' }],
  h2: [{ type: 'for i in range(6):\n    forward(100)\n    look()' }],
  h3: [{ type: 'for i in range(4):\n    forward(100)\n    left(90)' }],
  h4: [{ type: 'for i in range(6):\n    forward(10)\n    look()' }]
};
