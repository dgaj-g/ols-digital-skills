/* J1 Lesson 6 "Inside the Machine" — the film "Inside her head" (spec §3.5). Silent, captioned, one
   caption a beat. NOT a recorder take: there is no editor to film, so make-l6-film.js renders these
   beats as stills (Bernadette's face, the two real part photos, the step card) and ffmpeg joins them.
   The beats live HERE so the film's words have one home; qa-l6-film.js checks the finished file
   against them (length, pacing, every caption on screen for its whole hold).
   node make-l6-film.js      node qa-l6-film.js */
const FILMS_RECORDED = ['l6-inside.mp4'];
const BLOCKS_ON_CAMERA = [];
const BEATS = [
  { say: 'Bernadette wants to add two numbers.', show: 'sum' },
  { say: 'Her memory holds the next step.', show: 'mem' },
  { say: 'Her processor reads the step.', show: 'read' },
  { say: 'Her processor does the step.', show: 'do' },
  { say: 'The answer goes back into memory.', show: 'back' },
  { say: 'Next step. Round and round, millions of times a second.', show: 'loop' }
];
const scenes = [];
module.exports = { scenes, BLOCKS_ON_CAMERA, FILMS_RECORDED, BEATS };
