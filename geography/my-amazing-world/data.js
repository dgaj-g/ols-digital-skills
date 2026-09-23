/* data.js — My Amazing World: the facts the race is built on. One fact, one place. Source: Our Amazing World pupil booklet (J. Mason, 2026). */
window.MAW_DATA = {
  geoguessr: 'https://www.geoguessr.com/vgp/3188',
  legs: [
    { id: 'oceans',     n: 1, title: 'Oceans',              stamp: 'Oceans',              max: 17 },
    { id: 'continents', n: 2, title: 'Continents',          stamp: 'Continents',          max: 16 },
    { id: 'europe',     n: 3, title: 'Europe',              stamp: 'Europe',              max: 37 },
    { id: 'ni',         n: 4, title: 'Northern Ireland',    stamp: 'Northern Ireland',    max: 66 },
    { id: 'ireland',    n: 5, title: 'Ireland',             stamp: 'Ireland',             max: 44 },
    { id: 'types',      n: 6, title: 'Types of geography',  stamp: 'Geographer',          max: 22 },
    { id: 'final',      n: 7, title: 'Explorer Challenge',  stamp: 'Explorer',            max: 30 }
  ],
  /* Leg 1 — the five oceans (booklet word bank). view = where the globe flies on a reveal. */
  oceans: [
    { name: 'Pacific Ocean',  view: [-160, 0],  fact: 'The Pacific is the largest and deepest ocean. It is bigger than all the land on Earth put together.', hint: 'The Pacific lies between Asia and the Americas. Spin west from America.' },
    { name: 'Atlantic Ocean', view: [-30, 20],  fact: 'The Atlantic is the second largest ocean. It lies between the Americas and Europe and Africa. Ireland’s west coast faces it.', hint: 'The Atlantic is the water between the Americas and Europe.' },
    { name: 'Indian Ocean',   view: [75, -20],  fact: 'The Indian Ocean lies between Africa, Asia and Australia. It is the warmest ocean.', hint: 'The Indian Ocean is east of Africa and south of India.' },
    { name: 'Southern Ocean', view: [0, -90], zoom: 1.8,   fact: 'The Southern (or Antarctic) Ocean circles Antarctica. Its water is the coldest of all.', hint: 'The Southern Ocean circles Antarctica, right at the bottom of the globe.' },
    { name: 'Arctic Ocean',   view: [0, 90], zoom: 1.6,    fact: 'The Arctic Ocean is the smallest and shallowest ocean. Much of it is frozen sea ice around the North Pole.', hint: 'The Arctic Ocean sits around the North Pole, at the very top.' }
  ],
  /* Leg 2 — the seven continents (booklet word bank). anchor = where a placed tile sits (lon, lat), not a centroid (Russia straddles two). */
  continents: [
    { name: 'Africa',        anchor: [20, 5] },
    { name: 'Antarctica',    anchor: [20, -78] },
    { name: 'Asia',          anchor: [95, 45] },
    { name: 'Australia',     anchor: [134, -25] },
    { name: 'Europe',        anchor: [22, 53] },
    { name: 'North America', anchor: [-100, 45] },
    { name: 'South America', anchor: [-60, -15] }
  ],
  /* Booklet Lesson 2 Task 2, answered on the fact card after the jigsaw. */
  continentFacts: 'You live in Europe. Asia is the largest continent and Australia is the smallest. Greenland is not a continent — it is a huge island, part of North America. Antarctica and Australia are the two continents completely in the Southern Hemisphere.',

  /* Leg 3 — the ten countries from the booklet (names as Natural Earth spells them). fact = booklet Lesson 3 questions. */
  europe: {
    countries: [
      { name: 'United Kingdom', fact: 'The United Kingdom includes the cities of London, Edinburgh and Cardiff — and Belfast.' },
      { name: 'France',  fact: 'France is known for the Eiffel Tower. It is north of Spain and west of Germany.' },
      { name: 'Germany', fact: 'Berlin is the capital city of Germany.' },
      { name: 'Italy',   fact: 'Italy is shaped like a boot, in Southern Europe.' },
      { name: 'Spain',   fact: 'Spain shares a peninsula with Portugal, south of France.' },
      { name: 'Norway',  fact: 'Norway runs along the west side of the long Scandinavian peninsula.' },
      { name: 'Sweden',  fact: 'Sweden sits between Norway and Finland.' },
      { name: 'Finland', fact: 'Finland is in the far north-east of the European Union.' },
      { name: 'Poland',  fact: 'Poland is east of Germany.' },
      { name: 'Ukraine', fact: 'Ukraine is the largest country entirely in Europe.' }
    ],
    capitals: [
      { name: 'London', country: 'United Kingdom', at: [-0.128, 51.507] },
      { name: 'Paris',  country: 'France',         at: [2.352, 48.857] },
      { name: 'Berlin', country: 'Germany',        at: [13.405, 52.520] },
      { name: 'Madrid', country: 'Spain',          at: [-3.704, 40.417] },
      { name: 'Rome',   country: 'Italy',          at: [12.496, 41.903] }
    ]
  },

  /* Leg 4 — Northern Ireland. Boundaries: OpenStreetMap historic counties (data/ireland.topo.json).
     Points: lon/lat of the summit or town centre (OpenStreetMap). r = how close a tap must be, in km. */
  ni: {
    counties: ['Down', 'Armagh', 'Derry/Londonderry', 'Tyrone', 'Fermanagh', 'Antrim'],
    hills: [
      { name: 'Mourne Mountains', at: [-5.921, 54.180], r: 20, peak: 'Slieve Donard' },
      { name: 'Slieve Gullion',   at: [-6.431, 54.120], r: 20 },
      { name: 'Sperrin Mountains', at: [-7.034, 54.819], r: 20 },
      { name: 'Antrim Mountains', at: [-6.155, 55.045], r: 20 }
    ],
    rivers: ['River Bann', 'River Lagan', 'River Foyle'],
    loughs: ['Lough Neagh', 'Lower Lough Erne', 'Upper Lough Erne'],
    settlements: [
      { name: 'Newry',       at: [-6.340, 54.176] },
      { name: 'Armagh',      at: [-6.655, 54.350] },
      { name: 'Enniskillen', at: [-7.639, 54.344] },
      { name: 'Omagh',       at: [-7.300, 54.600] },
      { name: 'Derry',       at: [-7.309, 54.997] },
      { name: 'Antrim',      at: [-6.211, 54.716] },
      { name: 'Belfast',     at: [-5.930, 54.597] }
    ],
    decoys: [
      { name: 'Coleraine', at: [-6.668, 55.133] }, { name: 'Ballymena', at: [-6.276, 54.864] },
      { name: 'Lisburn', at: [-6.035, 54.512] }, { name: 'Dungannon', at: [-6.768, 54.503] }
    ],
    causeway: { name: "Giant's Causeway", at: [-6.505, 55.235] },  /* 700 m inland of the true stones (-6.512, 55.241) so the dot sits on the simplified coastline */
    /* Part B: 16 map features. Part C: the booklet's ten questions. */
    features: ['River Bann', 'River Lagan', 'River Foyle', 'Lough Neagh', 'Upper Lough Erne', 'Mourne Mountains', 'Slieve Gullion', 'Sperrin Mountains', 'Antrim Mountains',
      'Newry', 'Armagh', 'Enniskillen', 'Omagh', 'Derry', 'Antrim', 'Belfast'],
    questions: [
      { id: 'highest',  kind: 'feature', target: 'Mourne Mountains', answer: 'Slieve Donard', fact: 'Slieve Donard, in the Mourne Mountains, is the highest mountain in Northern Ireland (850 m).' },
      { id: 'range',    kind: 'choice', options: ['The Mourne Mountains', 'The Sperrin Mountains', 'The Antrim Mountains', 'Slieve Gullion'], answer: 'The Mourne Mountains', fact: 'Slieve Donard is part of the Mourne Mountains in County Down.' },
      { id: 'largest',  kind: 'feature', target: 'Lough Neagh', fact: 'Lough Neagh is the largest lake in Northern Ireland and in the whole UK.' },
      { id: 'longest',  kind: 'feature', target: 'River Bann', fact: 'The River Bann is the longest river in Northern Ireland.' },
      { id: 'basalt',   kind: 'feature', target: "Giant's Causeway", fact: "The Giant's Causeway is made of about 40,000 six-sided (hexagonal) basalt columns." },
      { id: 'plateau',  kind: 'choice', options: ['The Antrim Plateau', 'The Burren', 'The Fermanagh Lakelands', 'The Sperrin Valley'], answer: 'The Antrim Plateau', fact: 'The Antrim Plateau is a huge area of high, flat basalt land in County Antrim.' },
      { id: 'lakelands', kind: 'region', target: 'Fermanagh', fact: 'County Fermanagh is home to the Fermanagh Lakelands, around Enniskillen.' },
      { id: 'second',   kind: 'feature', target: 'Lower Lough Erne', fact: 'Lower Lough Erne is the second largest lake in Northern Ireland, after Lough Neagh.' },
      { id: 'west',     kind: 'feature', target: 'Sperrin Mountains', fact: 'The Sperrin Mountains are in the west of Northern Ireland, in Tyrone and Derry/Londonderry.' },
      { id: 'ocean',    kind: 'sea', target: 'Atlantic Ocean', fact: "The Atlantic Ocean borders Northern Ireland's north and west coast. The Irish Sea is to the east." }
    ]
  },

  /* Leg 5 — the island of Ireland. ROI counties: Natural Earth 10m (public domain). */
  ireland: {
    capitals: [
      { name: 'Belfast', of: 'Northern Ireland', at: [-5.930, 54.597] },
      { name: 'Dublin',  of: 'the Republic of Ireland', at: [-6.260, 53.350] }
    ],
    provinces: [
      { name: 'Ulster',   anchor: [-7.25, 54.65] },
      { name: 'Munster',  anchor: [-8.75, 52.35] },
      { name: 'Leinster', anchor: [-6.95, 53.05] },
      { name: 'Connacht', anchor: [-9.0, 53.7] }
    ],
    hills: [
      { name: 'Carrauntoohil', at: [-9.743, 51.999], r: 20, county: 'Kerry' },
      { name: 'Slieve Donard', at: [-5.921, 54.180], r: 20 },
      { name: 'Galtymore',     at: [-8.180, 52.366], r: 20 },
      { name: 'Lugnaquilla',   at: [-6.464, 52.967], r: 20 },
      { name: 'Mweelrea',      at: [-9.830, 53.640], r: 20 },
      { name: 'Errigal',       at: [-8.113, 55.034], r: 20 }
    ],
    rivers: ['River Shannon', 'River Bann', 'River Foyle', 'River Lagan'],
    cities: [
      { name: 'Cork', at: [-8.472, 51.898] }, { name: 'Galway', at: [-9.057, 53.271] }, { name: 'Limerick', at: [-8.630, 52.664] },
      { name: 'Derry', at: [-7.309, 54.997] }, { name: 'Waterford', at: [-7.110, 52.259] }
    ],
    decoys: [
      { name: 'Sligo', at: [-8.476, 54.277] }, { name: 'Kilkenny', at: [-7.254, 52.654] }, { name: 'Athlone', at: [-7.940, 53.423] },
      { name: 'Letterkenny', at: [-7.734, 54.950] }, { name: 'Tralee', at: [-9.702, 52.271] }
    ],
    facts: {
      north: 'Northern Ireland is part of the United Kingdom. Its capital is Belfast.',
      south: 'The Republic of Ireland is its own country. Its capital is Dublin.',
      carrauntoohil: "Carrauntoohil (1,039 m) is Ireland's highest mountain. It is in County Kerry.",
      shannon: "The River Shannon is Ireland's longest river (360 km). It flows south and west into the Atlantic past Limerick.",
      counties: 'There are 32 counties on the island of Ireland: 6 in Northern Ireland and 26 in the Republic.',
      causeway: "The Giant's Causeway is in County Antrim, on the north coast."
    },
    countQuestion: { options: ['32', '26', '6', '4'], answer: '32' }
  },

  /* Leg 6 — the booklet's 14 sorting words. zone = the booklet's answer; accept = also marked right (flagged for Mrs Mason). */
  types: {
    zones: ['Physical', 'Human', 'Environmental'],
    words: [
      { word: 'volcano', zone: 'Physical' }, { word: 'river', zone: 'Physical' }, { word: 'mountains', zone: 'Physical' },
      { word: 'earthquakes', zone: 'Physical' }, { word: 'flooding', zone: 'Physical', accept: ['Environmental'] },
      { word: 'climate', zone: 'Environmental', accept: ['Physical'] }, { word: 'pollution', zone: 'Environmental' }, { word: 'deforestation', zone: 'Environmental' },
      { word: 'city', zone: 'Human' }, { word: 'jobs', zone: 'Human' }, { word: 'people', zone: 'Human' },
      { word: 'farming', zone: 'Human' }, { word: 'tourism', zone: 'Human' }, { word: 'migration', zone: 'Human' }
    ],
    /* Real satellite photographs (NASA, public domain) — see assets/photos/CREDITS.md. hot = hotspot polygon in the image's own pixels. */
    photos: []
  },

  /* Leg 7 — five mystery places. Three clues each, vague to specific; none names the place. */
  mysteries: [
    { name: "Giant's Causeway", at: [-6.512, 55.241], clues: ['It is on the island of Ireland.', 'It is on the north coast of County Antrim.', 'About 40,000 six-sided stone columns step into the sea here.'] },
    { name: 'Sydney Opera House', at: [151.215, -33.857], clues: ['It is in the Southern Hemisphere.', 'It is on the east coast of Australia.', 'A famous building with white roofs shaped like sails stands in the harbour of this city.'] },
    { name: 'Mount Everest', at: [86.925, 27.988], clues: ['It is in Asia.', 'It is in the Himalayas, on the border of Nepal and China.', 'It is the highest mountain on Earth: 8,849 m.'] },
    { name: 'the mouth of the Amazon', at: [-50.0, -0.5], clues: ['It is in South America.', 'It is on the Equator, on the Atlantic coast of Brazil.', 'The river that carries more water than any other on Earth meets the sea here.'] },
    { name: 'New York', at: [-74.006, 40.713], clues: ['This city is in North America.', 'It is on the east coast, beside the Atlantic Ocean.', 'The Statue of Liberty stands in its harbour.'] }
  ],
  ruler: { from: { name: 'New York', at: [-74.006, 40.713] }, to: { name: 'Lisbon', at: [-9.139, 38.722] }, km: 5420 },

  expeditions: {
    oceans: {
      text: 'Open Google Earth over the Arctic Ocean. It shows the real sea photographed from space — something this globe cannot show you.',
      url: 'https://earth.google.com/web/@85,0,0a,9000000d,35y,0h,0t,0r', at: [0, 85],
      question: 'In the photo, what covers most of the Arctic Ocean?',
      options: ['White sea ice', 'Yellow sand', 'Green forest', 'Grey city'],
      answer: 'White sea ice',
      why: 'The Arctic Ocean is frozen for most of the year. The white you saw is floating sea ice.',
      points: 2
    },
    continents: {
      text: 'Open Google Earth over the north of Africa. Look at the colour of the land from space.',
      url: 'https://earth.google.com/web/@23,12,0a,6000000d,35y,0h,0t,0r', at: [12, 23],
      question: 'What colour is most of the land there, and why?',
      options: ['Sandy yellow — the Sahara Desert', 'Dark green — rainforest', 'White — ice', 'Grey — cities'],
      answer: 'Sandy yellow — the Sahara Desert',
      why: 'The north of Africa is the Sahara, the largest hot desert in the world.',
      points: 2
    },
    europe: {
      text: 'Open Google Earth over the Alps, tilted so you see the mountains in 3D. Country names show on the map.',
      url: 'https://earth.google.com/web/@46.5,10.5,0a,600000d,35y,0h,60t,0r', at: [10.5, 46.5],
      question: 'The Alps run through which of these?',
      options: ['Italy and Switzerland', 'Spain and Portugal', 'Norway and Sweden', 'Poland and Ukraine'],
      answer: 'Italy and Switzerland',
      why: 'The Alps curve across Switzerland, the north of Italy, Austria and the south-east of France.',
      points: 2
    },
    ni: {
      text: "Open Google Earth right over the Giant's Causeway. Zoom in as close as you can.",
      url: 'https://earth.google.com/web/@55.2408,-6.5116,0a,400d,35y,0h,0t,0r', at: [-6.5116, 55.2408],
      question: 'What shape are the stones?',
      options: ['Six-sided columns', 'Round pebbles', 'Flat sand', 'Square bricks'],
      answer: 'Six-sided columns',
      why: 'The stones are basalt columns, most with six sides, made when lava cooled and cracked.',
      points: 2
    },
    ireland: {
      text: 'Open Google Earth over the middle of Ireland. Ireland is called the Emerald Isle.',
      url: 'https://earth.google.com/web/@53.3,-7.8,0a,400000d,35y,0h,0t,0r', at: [-7.8, 53.3],
      question: 'From above, what colour is most of the land?',
      options: ['Green — fields and grass', 'Sandy — desert', 'White — ice', 'Dark — thick forest'],
      answer: 'Green — fields and grass',
      why: 'Most of Ireland is farmland and grass, kept green by plenty of rain.',
      points: 2
    },
    types: {
      text: 'Open Google Earth over Rondônia, a state in Brazil in the Amazon rainforest. Zoom in.',
      url: 'https://earth.google.com/web/@-10.5,-63,0a,300000d,35y,0h,0t,0r', at: [-63, -10.5],
      question: 'What pattern is cut into the forest?',
      options: ['Straight lines like a fishbone — roads with cleared farmland', 'Round lakes', 'One big city', 'Ice'],
      answer: 'Straight lines like a fishbone — roads with cleared farmland',
      why: 'Roads were cut into the rainforest and the land beside them was cleared for farms. That is deforestation.',
      points: 2
    },
    final: {
      text: 'Open Google Earth over Manhattan, in New York City.',
      url: 'https://earth.google.com/web/@40.78,-73.96,0a,12000d,35y,0h,0t,0r', at: [-73.96, 40.78],
      question: 'What is the big green rectangle in the middle of the city?',
      options: ['A park', 'A lake', 'A farm', 'An airport'],
      answer: 'A park',
      why: 'It is Central Park: 341 hectares of trees, grass and lakes in the middle of the city.',
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
