/* Clár Ama Beo — verified content pack
 * Issue dgaj-g/ols-digital-skills-inbox#33 (J3 Irish — Ábhair Scoile / School Subjects)
 *
 * 21 subjects, each: Irish name (Ulster-proofread) + English + a colourful picture
 * (national FLAG for the five languages, OpenMoji icon for the rest) + R. Morgan's
 * spoken-Irish audio. Days / periods / UI strings all Ulster-proofread.
 *  - Flags: public-domain Wikimedia SVGs (reused from the verified ceart-no-micheart set).
 *  - Icons: OpenMoji (CC BY-SA 4.0), codepoints chosen so the near-synonym/umbrella
 *    clusters (the two PE, the two RE, Science-vs-Bio/Chem/Phys, Tech-vs-Digital) are
 *    each visually distinct. See assets/CREDITS.md.
 */
window.AUDIO_DIR = 'assets/audio/';

/* dept = grouping used only for the colourful lock-in on "go live" (never a pre-answer hint) */
window.DEPT_COLOURS = {
  lang: '#0E7C7B', maths: '#3F51B5', science: '#1F9D55', tech: '#0288A7',
  arts: '#B5179E', home: '#E07A1F', humanities: '#A86523', re: '#6A4C93', pe: '#C8102E'
};

window.SUBJECTS = [
  { slug: 'gaeilge',         irish: 'Gaeilge',                   english: 'Irish',              kind: 'flag', asset: 'assets/flags/ireland.svg', dept: 'lang' },
  { slug: 'bearla',          irish: 'Béarla',                    english: 'English',            kind: 'flag', asset: 'assets/flags/england.svg', dept: 'lang' },
  { slug: 'fraincis',        irish: 'Fraincis',                  english: 'French',             kind: 'flag', asset: 'assets/flags/france.svg',  dept: 'lang' },
  { slug: 'spainnis',        irish: 'Spáinnis',                  english: 'Spanish',            kind: 'flag', asset: 'assets/flags/spain.svg',   dept: 'lang' },
  { slug: 'gearmainis',      irish: 'Gearmáinis',                english: 'German',             kind: 'flag', asset: 'assets/flags/germany.svg', dept: 'lang' },
  { slug: 'mata',            irish: 'Mata',                      english: 'Maths',              kind: 'icon', asset: 'assets/icons/mata.svg',            dept: 'maths' },
  { slug: 'eolaiocht',       irish: 'Eolaíocht',                 english: 'Science',            kind: 'icon', asset: 'assets/icons/eolaiocht.svg',       dept: 'science' },
  { slug: 'bitheolaiocht',   irish: 'Bitheolaíocht',             english: 'Biology',            kind: 'icon', asset: 'assets/icons/bitheolaiocht.svg',   dept: 'science' },
  { slug: 'ceimic',          irish: 'Ceimic',                    english: 'Chemistry',          kind: 'icon', asset: 'assets/icons/ceimic.svg',          dept: 'science' },
  { slug: 'fisic',           irish: 'Fisic',                     english: 'Physics',            kind: 'icon', asset: 'assets/icons/fisic.svg',           dept: 'science' },
  { slug: 'teicneolaiocht',  irish: 'Teicneolaíocht',            english: 'Technology',         kind: 'icon', asset: 'assets/icons/teicneolaiocht.svg',  dept: 'tech' },
  { slug: 'teic-dhigiteach', irish: 'Teicneolaíocht Dhigiteach', english: 'Digital Technology', kind: 'icon', asset: 'assets/icons/teic-dhigiteach.svg', dept: 'tech' },
  { slug: 'ceol',            irish: 'Ceol',                      english: 'Music',              kind: 'icon', asset: 'assets/icons/ceol.svg',            dept: 'arts' },
  { slug: 'ealain',          irish: 'Ealaín',                    english: 'Art',                kind: 'icon', asset: 'assets/icons/ealain.svg',          dept: 'arts' },
  { slug: 'dramaiocht',      irish: 'Drámaíocht',                english: 'Drama',              kind: 'icon', asset: 'assets/icons/dramaiocht.svg',      dept: 'arts' },
  { slug: 'eac-bhaile',      irish: 'Eacnamaíocht Bhaile',       english: 'Home Economics',     kind: 'icon', asset: 'assets/icons/eac-bhaile.svg',      dept: 'home' },
  { slug: 'stair',           irish: 'Stair',                     english: 'History',            kind: 'icon', asset: 'assets/icons/stair.svg',           dept: 'humanities' },
  { slug: 'reiligiun',       irish: 'Reiligiún',                 english: 'Religion',           kind: 'icon', asset: 'assets/icons/reiligiun.svg',       dept: 're' },
  { slug: 'teagasc-criostai',irish: 'Teagasc Críostaí',          english: 'Christian Doctrine', kind: 'icon', asset: 'assets/icons/teagasc-criostai.svg', dept: 're' },
  { slug: 'corpoideachas',   irish: 'Corpoideachas',             english: 'PE',                 kind: 'icon', asset: 'assets/icons/corpoideachas.svg',   dept: 'pe' },
  { slug: 'corpoiliuint',    irish: 'Corpoiliúint',              english: 'Physical Training',  kind: 'icon', asset: 'assets/icons/corpoiliuint.svg',    dept: 'pe' }
];

window.DAYS = ['Dé Luain', 'Dé Máirt', 'Dé Céadaoin', 'Déardaoin', 'Dé hAoine'];

/* the day's rows top-to-bottom; p* are teaching periods (droppable), break/lunch are fixed */
window.PERIODS = [
  { key: 'p1', label: 'An Chéad Rang' },
  { key: 'p2', label: 'An Dara Rang' },
  { type: 'break', label: 'Sos' },
  { key: 'p3', label: 'An Tríú Rang' },
  { key: 'p4', label: 'An Ceathrú Rang' },
  { type: 'lunch', label: 'Am Lóin' },
  { key: 'p5', label: 'An Cúigiú Rang' },
  { key: 'p6', label: 'An Séú Rang' }
];

/* the correct timetable: day index -> [p1,p2,p3,p4,p5,p6] subject slugs.
 * Realistic J3 week; every one of the 21 subjects appears at least once; the
 * near-synonyms sit in different cells (Corpoideachas Mon vs Corpoiliúint Fri;
 * Reiligiún Wed vs Teagasc Críostaí Fri; Eolaíocht vs Bitheolaíocht/Ceimic/Fisic;
 * Teicneolaíocht Wed vs Teicneolaíocht Dhigiteach Thu) so each is learned by ear. */
window.TIMETABLE = {
  0: ['gaeilge', 'mata', 'bearla', 'eolaiocht', 'stair', 'corpoideachas'],          // Dé Luain
  1: ['fraincis', 'ceol', 'bitheolaiocht', 'mata', 'ealain', 'gaeilge'],            // Dé Máirt
  2: ['bearla', 'ceimic', 'reiligiun', 'spainnis', 'teicneolaiocht', 'mata'],       // Dé Céadaoin
  3: ['gaeilge', 'fisic', 'eac-bhaile', 'dramaiocht', 'gearmainis', 'teic-dhigiteach'], // Déardaoin
  4: ['mata', 'bearla', 'teagasc-criostai', 'corpoiliuint', 'eolaiocht', 'gaeilge'] // Dé hAoine
};

window.UI = {
  timetable: 'Clár Ama', makeLive: 'Cuir an Clár Ama Beo!', playAnnouncement: 'Seinn an Fógra',
  again: 'Arís', start: 'Tosaigh', score: 'Scór', wellDone: 'Maith thú!', wrong: 'Mícheart',
  day: 'Lá', subject: 'Ábhar'
};
