/* The pupils' own cut: only the pupil chapters, numbered from 1, with their
   own opening and closing cards. node record.js pupils; node assemble.js pupils */
'use strict';
const C = require('./chapters');
const P = C.pupilChapters(1);
const scenes = [C.pupilOpening, P.shelf, P.pad, P.table, P.choose, P.graph, P.saving, C.pupilClosing];
module.exports = { scenes };
