/* ============================================================
   Mothúcháin — Bóthar na Mothúchán / The Feelings Road
   J2 (Year 9) CCEA Irish.  Frame: "Cad é atá ort? — Tá ___ orm."

   A walk-and-talk road: at each stop a friend appears, clearly in
   the grip of a feeling (a big OpenMoji FACE + a disambiguating
   PROP), asks "Cad é atá ort?", and the teacher's recording plays.
   The pupil reads the scene, picks the right "Tá ___ orm" from five
   chips (the four decoys are the CONFUSABLE neighbours, so the prop
   must be read), and commits with "Abair é!".

   For each feeling:
   - face  : OpenMoji face image (assets/img/face-<slug>.png)
   - props : prop image layers that make the feeling unmistakable
             {n: file-stem, cls: position class}
   - tint  : the card's signature mood colour (palette teaches mood)
   - cap   : a short Irish situation caption + English (teacher to
             confirm the Irish — see PR notes)
   - decoys: the four confusable feelings offered as wrong chips
   All imagery is the OpenMoji bank (CC BY-SA 4.0) — never hand-drawn.
   ============================================================ */

const IMG = 'assets/img/';
const AUDIO_DIR = 'assets/audio/';
const FRAME_GA = 'Tá @ orm';            // @ replaced by the feeling word
const QUESTION = 'Cad é atá ort?';
const RESOLVED_FACE = 'face-resolved.png';

const FEELINGS = [
  { slug: 'athas',  ga: 'áthas',   en: 'happy',        tint: '#F6B93B',
    face: 'face-athas.png',   props: [{ n: 'prop-balloon', cls: 'p-side' }, { n: 'scene-sun', cls: 'p-top' }],
    cap: { ga: 'Lá breá grianmhar!', en: 'A lovely sunny day!' },
    decoys: ['luchair', 'brod', 'iontas', 'bron'] },

  { slug: 'luchair', ga: 'lúchair', en: 'delighted',   tint: '#E0489E',
    face: 'face-luchair.png', props: [{ n: 'prop-party', cls: 'p-side' }, { n: 'prop-confetti', cls: 'p-top' }],
    cap: { ga: 'Hurá! Cóisir!', en: 'Hooray! A party!' },
    decoys: ['athas', 'brod', 'iontas', 'naire'] },

  { slug: 'brod',   ga: 'bród',    en: 'proud',         tint: '#E4B824',
    face: 'face-brod.png',    props: [{ n: 'prop-medal', cls: 'p-front' }, { n: 'prop-trophy', cls: 'p-top' }],
    cap: { ga: 'Bhuaigh mé!', en: 'I won!' },
    decoys: ['athas', 'luchair', 'iontas', 'naire'] },

  { slug: 'bron',   ga: 'brón',    en: 'sad',           tint: '#4A78B0',
    face: 'face-bron.png',    props: [{ n: 'prop-raincloud', cls: 'p-top' }, { n: 'prop-umbrella', cls: 'p-side' }],
    cap: { ga: 'Lá fliuch, uaigneach.', en: 'A wet, lonely day.' },
    decoys: ['dioma', 'ead', 'imni', 'naire'] },

  { slug: 'ocras',  ga: 'ocras',   en: 'hungry',        tint: '#F39C12',
    face: 'face-ocras.png',   props: [{ n: 'prop-burger', cls: 'p-side' }],
    cap: { ga: 'Níor ith mé fós!', en: "I haven't eaten yet!" },
    decoys: ['tart', 'tuirse', 'imni', 'bron'] },

  { slug: 'tart',   ga: 'tart',    en: 'thirsty',       tint: '#E08E2B',
    face: 'face-tart.png',    props: [{ n: 'prop-desert', cls: 'p-top' }, { n: 'prop-cup', cls: 'p-side' }],
    cap: { ga: 'Tá sé chomh te sin!', en: "It's so hot!" },
    decoys: ['ocras', 'tuirse', 'imni', 'dioma'] },

  { slug: 'tuirse', ga: 'tuirse',  en: 'tired',         tint: '#7E6BA8',
    face: 'face-tuirse.png',  props: [{ n: 'prop-zzz', cls: 'p-top' }, { n: 'prop-bed', cls: 'p-side' }],
    cap: { ga: 'Bhí lá fada agam.', en: 'I had a long day.' },
    decoys: ['ocras', 'tart', 'bron', 'imni'] },

  { slug: 'eagla',  ga: 'eagla',   en: 'afraid',        tint: '#5A8F69',
    face: 'face-eagla.png',   props: [{ n: 'prop-spider', cls: 'p-loom' }],
    cap: { ga: 'Damhán alla!', en: 'A spider!' },
    decoys: ['faitios', 'imni', 'iontas', 'naire'] },

  { slug: 'fearg',  ga: 'fearg',   en: 'angry',         tint: '#E0492F',
    face: 'face-fearg.png',   props: [{ n: 'prop-anger', cls: 'p-top' }],
    cap: { ga: 'Níl sé cothrom!', en: "It's not fair!" },
    decoys: ['ead', 'dioma', 'bron', 'imni'] },

  { slug: 'imni',   ga: 'imní',    en: 'worried',       tint: '#D9A21B',
    face: 'face-imni.png',    props: [{ n: 'prop-clock', cls: 'p-top' }, { n: 'prop-testpaper', cls: 'p-side' }],
    cap: { ga: 'Tá scrúdú agam!', en: 'I have a test!' },
    decoys: ['eagla', 'faitios', 'bron', 'dioma'] },

  { slug: 'dioma',  ga: 'díomá',   en: 'disappointed',  tint: '#6E7E8C',
    face: 'face-dioma.png',   props: [{ n: 'prop-brokenheart', cls: 'p-front' }],
    cap: { ga: 'Bhris sé!', en: 'It broke!' },
    decoys: ['bron', 'ead', 'fearg', 'naire'] },

  { slug: 'ead',    ga: 'éad',     en: 'jealous',       tint: '#4CAF50', layout: 'compare',
    face: 'face-ead.png',     props: [{ n: 'prop-icecream', cls: 'p-big' }, { n: 'prop-icecream', cls: 'p-small' }],
    cap: { ga: 'Tá ceann níos mó aici!', en: 'She has a bigger one!' },
    decoys: ['fearg', 'dioma', 'naire', 'bron'] },

  { slug: 'faitios', ga: 'faitíos', en: 'afraid / shy',  tint: '#E8839B',
    face: 'face-faitios.png', props: [{ n: 'prop-person', cls: 'p-side' }, { n: 'prop-wave', cls: 'p-top' }],
    cap: { ga: 'Strainséir ag an doras.', en: 'A stranger at the door.' },
    decoys: ['eagla', 'naire', 'imni', 'iontas'] },

  { slug: 'iontas', ga: 'iontas',  en: 'surprised',     tint: '#2BB5D0',
    face: 'face-iontas.png',  props: [{ n: 'prop-gift', cls: 'p-front' }],
    cap: { ga: 'Bronntanas dom?!', en: 'A present for me?!' },
    decoys: ['eagla', 'athas', 'luchair', 'faitios'] },

  { slug: 'naire',  ga: 'náire',   en: 'embarrassed',   tint: '#E0506E',
    face: 'face-naire.png',   props: [{ n: 'prop-mic', cls: 'p-side' }, { n: 'prop-sweat', cls: 'p-top' }],
    cap: { ga: 'Thit mé os comhair cách!', en: 'I fell in front of everyone!' },
    decoys: ['faitios', 'dioma', 'bron', 'ead'] },
];

const SCENERY = ['scene-tree', 'scene-house', 'scene-bridge', 'scene-school', 'scene-shop'];
const CHECKPOINT_EVERY = 5;
const START_HEARTS = 3;
