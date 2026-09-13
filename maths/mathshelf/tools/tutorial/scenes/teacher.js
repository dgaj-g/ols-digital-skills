/* The teacher's film: the whole of MathShelf, teacher side, pupil side, and
   back to the markbook. node record.js teacher [id]; node assemble.js teacher */
'use strict';
const C = require('./chapters');
const P = C.pupilChapters(3);
const scenes = [C.opening, C.ch1, C.ch2, P.shelf, P.pad, P.table, P.choose, P.graph, P.saving, C.ch9, C.closing];
module.exports = { scenes };
