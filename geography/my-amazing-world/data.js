/* data.js — My Amazing World: the facts the race is built on. One fact, one place. Source: Our Amazing World pupil booklet (J. Mason, 2026). */
window.MAW_DATA = {
  legs: [
    { id: 'oceans',     n: 1, title: 'Oceans',              stamp: 'Oceans',              max: 17 },
    { id: 'continents', n: 2, title: 'Continents',          stamp: 'Continents',          max: 0 },
    { id: 'europe',     n: 3, title: 'Europe',              stamp: 'Europe',              max: 0 },
    { id: 'ni',         n: 4, title: 'Northern Ireland',    stamp: 'Northern Ireland',    max: 0 },
    { id: 'ireland',    n: 5, title: 'Ireland',             stamp: 'Ireland',             max: 0 },
    { id: 'types',      n: 6, title: 'Types of geography',  stamp: 'Geographer',          max: 0 },
    { id: 'final',      n: 7, title: 'Explorer Challenge',  stamp: 'Explorer',            max: 0 }
  ],
  oceans: [
    { name: 'Pacific Ocean',  view: [-160, 0],  fact: 'The Pacific is the largest and deepest ocean. It is bigger than all the land on Earth put together.', hint: 'The Pacific lies between Asia and the Americas. Spin west from America.' },
    { name: 'Atlantic Ocean', view: [-30, 20],  fact: 'The Atlantic is the second largest ocean. It lies between the Americas and Europe and Africa. Ireland’s west coast faces it.', hint: 'The Atlantic is the water between the Americas and Europe.' },
    { name: 'Indian Ocean',   view: [75, -20],  fact: 'The Indian Ocean lies between Africa, Asia and Australia. It is the warmest ocean.', hint: 'The Indian Ocean is east of Africa and south of India.' },
    { name: 'Southern Ocean', view: [0, -90], zoom: 1.8,   fact: 'The Southern (or Antarctic) Ocean circles Antarctica. Its water is the coldest of all.', hint: 'The Southern Ocean circles Antarctica, right at the bottom of the globe.' },
    { name: 'Arctic Ocean',   view: [0, 90], zoom: 1.6,    fact: 'The Arctic Ocean is the smallest and shallowest ocean. Much of it is frozen sea ice around the North Pole.', hint: 'The Arctic Ocean sits around the North Pole, at the very top.' }
  ],
  expeditions: {
    oceans: {
      text: 'Open Google Earth over the Pacific and look at how much of the Earth is water.',
      url: 'https://earth.google.com/web/@0,-160,0a,25000000d,35y,0h,0t,0r',
      question: 'Which is the largest ocean?',
      options: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Southern Ocean', 'Arctic Ocean'],
      answer: 'Pacific Ocean',
      why: 'The Pacific is bigger than all the land on Earth put together.',
      points: 2
    }
  },
  ranks: [
    { min: 0,    name: 'Trainee Explorer' },
    { min: 0.35, name: 'Deckhand' },
    { min: 0.55, name: 'Pathfinder' },
    { min: 0.75, name: 'Chief Navigator' },
    { min: 0.9,  name: 'Master Explorer' }
  ]
};
