/* Turn Down the Heat — every pupil-facing string lives here.
   STRINGS.md is generated from this file. Answers are kept here only;
   the app strips them before anything reaches the page. */
window.TDTH = {
  title: 'Turn Down the Heat',
  making: 'You are making your own plan for the world up to the year 2100, and your own warming stripes to show what it does.',

  ui: {
    start: 'Start',
    partOf: 'Part {k} of 7: {name}',
    startWhere: 'Start: what this is about',
    check: 'Check my answers',
    checkAgain: 'Check again',
    fillFirst: 'Check unlocks when every space is filled.',
    rowsFirst: 'Check unlocks when every row has an answer.',
    tickFirst: 'Check unlocks when you have ticked at least one.',
    showMe: 'Show me the answers',
    showMeNote: 'The answers are placed for you, with the reasons. This part will earn 1 star.',
    right: 'Right',
    wrong: 'Not yet',
    tryAgainMove: 'Move the ones marked Not yet, then check again.',
    tryAgainChange: 'Change the answers marked Not yet, then check again.',
    tryAgainUntick: 'Untick the ones marked Not yet, then check again.',
    taskDone: 'Done',
    quickLabel: 'Quick question from Part {k}',
    talkLabel: 'Talk with your partner',
    partDone: 'You finished Part {k}: {name}.',
    stars: 'You earned {n} stars out of 3.',
    star1: 'You earned 1 star out of 3.',
    starsKey: '3 stars: all right at the first try. 2 stars: all right by the second try. 1 star: finished.',
    next: 'Go to Part {k}: {name}',
    toFinal: 'Go to Part 7: Final check',
    toEnd: 'See your results',
    locked: 'Finish the part before this one to open it.',
    reopen: 'You can come back to any part you have finished.',
    tray: 'Drag these',
    trayEmpty: 'Everything is placed.',
    spin: 'Drag the globe to spin it.',
    layer: 'Slide to fade the colours',
    credits: 'Picture and data credits',
    close: 'Close',
    save: 'Save picture',
    restart: 'Start again',
    restartConfirm: 'This clears everything you have done on this computer. Are you sure?',
    restartYes: 'Yes, start again',
    restartNo: 'No, keep my work',
    noWebgl: 'This device cannot show the 3D globe, so here is a flat map of the same data.',
    moreToFind: 'There is at least one more right answer to tick.',
    globeAlt: 'A globe of the Earth that you can spin',
    open: 'Open'
  },

  intro: {
    kicker: 'Geography · Climate change',
    paint: 'Each stripe is one year of Earth\'s average temperature, from 1850 to 2025. Blue years were cooler. Red years were warmer.',
    fact: 'In 2024, for the first time, a whole year was about 1.5 °C warmer than the late 1800s.',
    plan: 'In seven parts, you will find out how Earth\'s climate is changing, why it is happening, and what it does to people and places. Then you will run the world to 2100 and make a poster of your own stripes.',
    time: 'It takes about 55 minutes. Your work is not saved to your school account, so it may be gone after you log off. If it is gone next lesson, pick the part you were on from the numbers at the top.',
    go: 'Start Part 1',
    goBack: 'Carry on where you left off',
    anomWarm: '{t} °C warmer than the late 1800s',
    anomCool: '{t} °C cooler than the late 1800s'
  },

  parts: [
    {
      k: 1, name: 'Earth is warming', colour: '#2171B5',
      tasks: [
        { id: 'p1-read', type: 'mcq', title: 'Read the stripes',
          do: 'Look at the stripes, then answer the three questions. Choose one answer for each.',
          qs: [
            { id: 'r1', q: 'What does one stripe show?',
              opts: [{ t: 'Earth\'s average temperature for one whole year', ok: 1 }, { t: 'The temperature in Belfast on one day' }, { t: 'How much rain fell in one year' }],
              why: 'Each stripe is one year, coloured by the average temperature of the whole Earth.' },
            { id: 'r2', q: 'Did Earth warm by the same amount every year?',
              opts: [{ t: 'No. Some years were cooler, but the stripes get redder over time.', ok: 1 }, { t: 'Yes. Every year was warmer than the year before.' }, { t: 'No. Earth has been getting cooler.' }],
              why: 'Single years go up and down, which is why there are blue stripes among the red ones. The overall trend is warming.' },
            { id: 'r3', q: 'Your textbook says that by 2018 Earth was about how much warmer than in the late 1800s?',
              opts: [{ t: 'About 1 °C', ok: 1 }, { t: 'About 10 °C' }, { t: 'About 0.1 °C' }],
              why: 'About 1 °C sounds small, but it is an average for the whole planet. Some places have warmed much more.' }
          ] },
        { id: 'p1-timeline', type: 'drag', layout: 'timeline', title: 'Put the events on the stripes',
          do: 'Drag each event onto the year it happened. You can drop it on the stripes or in the year boxes below. When all five are placed, press Check my answers.',
          zones: [{ id: 'z1800', label: '1800s', year: 1850 }, { id: 'z1990', label: '1990', year: 1990 }, { id: 'z1997', label: '1997', year: 1997 }, { id: 'z2016', label: '2016', year: 2016 }, { id: 'z2018', label: '2018', year: 2018 }],
          items: [
            { id: 'e1', t: 'Factories begin burning coal in huge amounts. This is the Industrial Revolution.', zone: 'z1800', why: 'The Industrial Revolution began in the 1700s and 1800s, when factories started burning coal.' },
            { id: 'e2', t: 'Scientists warn that Earth will keep warming if we keep burning fossil fuels.', zone: 'z1990', why: 'Scientists warned the world in 1990.' },
            { id: 'e3', t: 'Countries sign the Kyoto Protocol, their first promise to cut greenhouse gases.', zone: 'z1997', why: 'The Kyoto Protocol was agreed in 1997.' },
            { id: 'e4', t: 'The Paris Agreement begins. Countries promise to keep warming well below 2 °C.', zone: 'z2016', why: 'The Paris Agreement came into force in 2016.' },
            { id: 'e5', t: 'The world gives off 37.1 billion tonnes of carbon dioxide in one year, the most so far.', zone: 'z2018', why: 'In 2018 the world gave off 37.1 billion tonnes of carbon dioxide, more than ever before.' }
          ] },
        { id: 'p1-globe', type: 'globe', title: 'Find where Earth warmed most',
          do: 'Spin the globe by dragging it. The colours show how much warmer each place was in 2018 than in the years 1951 to 1980. Then answer the two questions.',
          legend: ['Blue: a little cooler', 'Pale: about the same', 'Red: 1 °C warmer', 'Dark red: 3 °C or more warmer'],
          alt: 'A globe coloured to show how much each place warmed in 2018.',
          qs: [
            { id: 'g1', q: 'Which part of the world warmed the most?',
              opts: [{ t: 'The Arctic, around the North Pole', ok: 1 }, { t: 'The Sahara Desert in Africa' }, { t: 'The middle of the Pacific Ocean' }],
              why: 'The Arctic was about 2.2 °C warmer on average, and more than 2.5 °C warmer in many places. That is over twice as much as the world as a whole.' },
            { id: 'g2', q: 'Which half of the world warmed more?',
              opts: [{ t: 'The northern half', ok: 1 }, { t: 'The southern half' }, { t: 'Both halves warmed by exactly the same amount' }],
              why: 'The northern half has much more land, and land warms up faster than the ocean.' }
          ] },
        { id: 'p1-ice', type: 'drag', layout: 'photos', title: 'Why melting ice makes things worse',
          do: 'Drag each label onto the photo it describes. Then answer the question below.',
          zones: [{ id: 'zice', label: 'White ice in Greenland', img: 'greenland-ice' }, { id: 'zground', label: 'Dark ground in Greenland', img: 'greenland-ground' }],
          items: [
            { id: 'i1', t: 'Reflects most sunlight back into space', zone: 'zice', why: 'White ice acts like a mirror and sends most sunlight back into space.' },
            { id: 'i2', t: 'Soaks up sunlight and warms up', zone: 'zground', why: 'Dark ground soaks up sunlight and warms up.' }
          ],
          after: 'So when ice melts, dark ground soaks up more heat, and even more ice melts.',
          qs: [
            { id: 'i3', q: 'Your textbook says that if all of Greenland\'s ice melted, the oceans would rise by more than how much?',
              opts: [{ t: '7 metres', ok: 1 }, { t: '7 centimetres' }, { t: '70 metres' }],
              why: 'More than 7 metres is higher than a two-storey house. Coastal cities around the world would flood.' }
          ] }
      ],
      talk: 'Some places have warmed much more than others. Why do you think the Arctic has warmed fastest?'
    },
    {
      k: 2, name: 'The greenhouse effect', colour: '#4292C6',
      quick: { q: 'Which part of the world has warmed the most?',
        opts: [{ t: 'The Arctic', ok: 1 }, { t: 'The Sahara Desert' }, { t: 'The middle of the Pacific Ocean' }],
        why: 'The Arctic has warmed over twice as much as the world as a whole.' },
      tasks: [
        { id: 'p2-machine', type: 'machine', title: 'Work the greenhouse machine',
          do: 'Try each of the four settings, using the slider or the buttons under the picture. Watch what happens to the heat, and read the thermometer each time.',
          slider: 'How much greenhouse gas is in the air?',
          visited: 'Settings tried: {n} of 4.',
          legend: ['Yellow dots are sunlight coming in.', 'Red dots are heat going back out.', 'The balls are greenhouse gas molecules.'],
          stops: [
            { label: 'None', temp: -18, line: 'With no greenhouse gases, all the heat escapes into space. Earth would be frozen, at about −18 °C on average.' },
            { label: 'Year 1750', temp: 14, line: 'In 1750, some heat was trapped. Earth was about 14 °C on average, warm enough for life.' },
            { label: 'Today', temp: 15.1, line: 'Today, more gas traps more heat. Earth is about 15.1 °C on average, and still warming.' },
            { label: 'If we carry on', temp: 17, line: 'If we carry on, even more heat is trapped. Earth could be about 17 °C on average by 2100, warmer than at any time in human history.' }
          ] },
        { id: 'p2-steps', type: 'drag', layout: 'rows', title: 'Label the greenhouse effect',
          do: 'Drag each sentence onto the number where it happens. You can drop it on a number in the picture or in the numbered boxes below. When all five are placed, press Check my answers.',
          alt: 'The greenhouse machine with five numbered places. 1 is on the ground. 2 is just above the ground. 3 is high in the sky above the gas layer. 4 is in the gas layer on the left. 5 is at the top of the thermometer.',
          zones: [{ id: 's1', label: '1' }, { id: 's2', label: '2' }, { id: 's3', label: '3' }, { id: 's4', label: '4' }, { id: 's5', label: '5' }],
          items: [
            { id: 'st1', t: 'The Sun sends out energy as sunlight. This warms the Earth.', zone: 's1', why: 'Number 1 is where sunlight comes in and reaches the ground.' },
            { id: 'st2', t: 'Earth gives out some of the energy again as heat, which warms the air.', zone: 's2', why: 'Number 2 is where heat leaves the ground.' },
            { id: 'st3', t: 'Some of this heat escapes to the outer atmosphere.', zone: 's3', why: 'Number 3 is where heat gets out past the gases.' },
            { id: 'st4', t: 'But some is trapped by greenhouse gases and does not escape.', zone: 's4', why: 'Number 4 is the layer of gas that catches heat and sends it back down.' },
            { id: 'st5', t: 'The more of a greenhouse gas there is, the warmer the Earth gets.', zone: 's5', why: 'Number 5 is the thermometer, which rises as more heat is trapped.' }
          ] },
        { id: 'p2-gases', type: 'mcq', title: 'Two main greenhouse gases',
          do: 'Answer the three questions. Choose one answer for each.',
          qs: [
            { id: 'h1', q: 'Which two gases are the main greenhouse gases that people add to the air?',
              opts: [{ t: 'Carbon dioxide and methane', ok: 1 }, { t: 'Oxygen and nitrogen' }, { t: 'Helium and hydrogen' }],
              why: 'Oxygen and nitrogen make up most of the air, but they do not trap heat. Carbon dioxide and methane do.' },
            { id: 'h2', q: 'Your textbook says methane traps heat about how many times more strongly than carbon dioxide?',
              opts: [{ t: 'About 25 times', ok: 1 }, { t: 'About 2 times' }, { t: 'About 250 times' }],
              why: 'One tonne of methane traps about 25 times more heat than one tonne of carbon dioxide.' },
            { id: 'h3', q: 'So why is carbon dioxide still the main cause of global warming?',
              opts: [{ t: 'We give off far more of it than methane.', ok: 1 }, { t: 'It leaves the air after a few days.' }, { t: 'Methane does not warm Earth at all.' }],
              why: 'We give off billions of tonnes of carbon dioxide every year, far more than methane. Much of it stays in the air for hundreds of years.' }
          ] }
      ],
      talk: 'Without greenhouse gases Earth would freeze, but too much makes it too hot. How can both of these be true?'
    },
    {
      k: 3, name: 'What we do', colour: '#FC9272',
      quick: { q: 'What happens when there is more greenhouse gas in the air?',
        opts: [{ t: 'More heat is trapped, so Earth gets warmer.', ok: 1 }, { t: 'More heat escapes, so Earth gets cooler.' }, { t: 'Nothing changes.' }],
        why: 'More greenhouse gas traps more heat near the ground.' },
      tasks: [
        { id: 'p3-sort', type: 'drag', layout: 'bins', title: 'Sort what we do',
          do: 'Drag each photo into the gas it mainly gives off. When all ten are placed, press Check my answers.',
          zones: [{ id: 'co2', label: 'Mainly gives off carbon dioxide' }, { id: 'ch4', label: 'Mainly gives off methane' }],
          items: [
            { id: 'a1', t: 'Coal power station', img: 'coal-power', tag: 'Fossil fuels', zone: 'co2', why: 'Burning coal to make electricity gives off more carbon dioxide than any other fuel.' },
            { id: 'a2', t: 'Gas cooker', img: 'gas-hob', tag: 'Fossil fuels', zone: 'co2', why: 'Burning gas for cooking and heating gives off carbon dioxide.' },
            { id: 'a3', t: 'Cars in traffic', img: 'traffic', tag: 'Transport', zone: 'co2', why: 'Petrol and diesel engines give off carbon dioxide.' },
            { id: 'a4', t: 'Aeroplane', img: 'aeroplane', tag: 'Transport', zone: 'co2', why: 'Jet engines burn kerosene, a fuel made from oil.' },
            { id: 'a5', t: 'Cargo ship', img: 'cargo-ship', tag: 'Transport', zone: 'co2', why: 'Ships burn heavy fuel oil to carry goods around the world.' },
            { id: 'a6', t: 'Cutting down forests', img: 'deforestation', tag: 'Deforestation', zone: 'co2', why: 'Burned trees give off carbon dioxide, and fewer trees are left to take it in.' },
            { id: 'a7', t: 'Cattle', img: 'cattle', tag: 'Farming', zone: 'ch4', why: 'Cows and sheep give off methane as they digest grass.' },
            { id: 'a8', t: 'Rice paddy fields', img: 'paddy', tag: 'Farming', zone: 'ch4', why: 'Flooded rice fields give off methane from plants rotting under the water.' },
            { id: 'a9', t: 'Landfill site', img: 'landfill', tag: 'Waste', zone: 'ch4', why: 'Rubbish rotting under the ground gives off methane.' },
            { id: 'a10', t: 'Oil and gas wells', img: 'gas-flare', tag: 'Fossil fuels', zone: 'ch4', accept: ['co2'], why: 'Both are right. Gas wells leak methane, and burning the gas gives off carbon dioxide.' }
          ] },
        { id: 'p3-direct', type: 'binary', title: 'Who burns the fuel?',
          do: 'Choose Directly or Indirectly for each one. Directly means the fuel is burned right where you are. Indirectly means it is burned somewhere else, such as a power station.',
          choices: ['Directly', 'Indirectly'],
          items: [
            { id: 'd1', t: 'Heating your home with an oil boiler', ok: 0, why: 'The oil burns in the boiler in your own home.' },
            { id: 'd2', t: 'Riding in a petrol car', ok: 0, why: 'The petrol burns in the car\'s engine, right where you are.' },
            { id: 'd3', t: 'Switching on a light', ok: 1, why: 'The electricity may come from a power station burning gas, miles away.' },
            { id: 'd4', t: 'Charging your phone', ok: 1, why: 'Your phone uses electricity, and some electricity is still made by burning fossil fuels.' },
            { id: 'd5', t: 'Cooking on a gas hob', ok: 0, why: 'The gas burns on the hob in your kitchen.' }
          ] },
        { id: 'p3-reply', type: 'mcq', title: 'Choose the best reply',
          do: 'Read what each person says. Choose the reply that is true and most likely to change their mind.',
          qs: [
            { id: 'b1', who: 'A driver stuck in traffic', q: '“Greenhouse gases? Nothing to do with me!”',
              opts: [{ t: 'Your car burns petrol, which gives off carbon dioxide. One car adds a little, but millions of cars add a lot.', ok: 1 }, { t: 'Cars give off oxygen, and oxygen heats the planet.' }, { t: 'You are the reason the planet is ruined.' }],
              why: 'The best reply is true and explains how one person adds to the problem without insulting them.' },
            { id: 'b2', who: 'Someone eating a beef burger', q: '“Not me! I don\'t even drive.”',
              opts: [{ t: 'Beef comes from cattle, which give off methane. Eating less beef cuts greenhouse gases too.', ok: 1 }, { t: 'Burgers are fine, because methane does not trap heat.' }, { t: 'Only factories cause climate change, so you are right.' }],
              why: 'Farming, transport, homes and waste all add greenhouse gases, not just factories. Methane traps heat strongly.' }
          ] }
      ],
      talk: 'Which of these activities could your family do less of? Which ones would be hard to change, and why?'
    },
    {
      k: 4, name: 'A world of effects', colour: '#DE2D26',
      quick: { q: 'Which of these mainly gives off methane?',
        opts: [{ t: 'Cattle', ok: 1 }, { t: 'Aeroplanes' }, { t: 'Coal power stations' }],
        why: 'Cattle give off methane as they digest grass. Aeroplanes and coal power stations give off carbon dioxide.' },
      tasks: [
        { id: 'p4-map', type: 'drag', layout: 'places', title: 'Diagnose the world',
          do: 'Each numbered place on the map has a report in the boxes below the map. Read each report, then drag the effect that matches it into that box or onto its number on the map. When all eight are placed, press Check my answers.',
          mapAlt: 'A map of the world with eight numbered places',
          zones: [
            { id: 'male', label: 'Malé, Maldives', lat: 4.2, lon: 73.5, img: 'male', report: 'Most of this island city is only about 1 metre above the sea. Storms already push sea water into the streets.' },
            { id: 'chad', label: 'Chad, Africa', lat: 15, lon: 19, img: 'chad', report: 'Rain comes less often, and the ground is drying out. Nine in every ten people here are farmers, and their crops are failing.' },
            { id: 'greenland', label: 'Greenland', lat: 72, lon: -40, img: 'glacier-melt', report: 'The ice sheet is losing billions of tonnes of ice every year. Rivers of meltwater pour into the sea.' },
            { id: 'arctic', label: 'Arctic Ocean', lat: 82, lon: 160, img: 'polar-bear', report: 'The sea ice melts earlier every spring. Polar bears hunt seals from the ice, so they are going hungry.' },
            { id: 'australia', label: 'New South Wales, Australia', lat: -33, lon: 150, img: 'wildfire', report: 'In 2019 and 2020, months of heat and dry weather led to fires that burned forest nearly four times the size of Northern Ireland.' },
            { id: 'bangladesh', label: 'Bangladesh', lat: 23.7, lon: 90.4, img: 'flood', report: 'Heavier monsoon rain swells the rivers. Water covers homes, roads and fields, and millions of people have to leave.' },
            { id: 'uk', label: 'Lincolnshire, England', lat: 53.1, lon: -0.2, img: 'heatwave', report: 'On 19 July 2022 it reached 40.3 °C at Coningsby, the hottest temperature ever recorded in the UK.' },
            { id: 'kenya', label: 'Highlands of Kenya', lat: 0.3, lon: 35.3, img: 'mosquito', report: 'Mosquitoes that spread malaria are reaching higher, cooler places where they could not live before.' }
          ],
          items: [
            { id: 'f1', t: 'Rising sea levels', zone: 'male', why: 'Malé is only about 1 metre above the sea, so rising seas are its biggest danger.' },
            { id: 'f2', t: 'Drought', zone: 'chad', why: 'Less rain and drying ground mean drought, and drought means less food.' },
            { id: 'f3', t: 'Melting ice', zone: 'greenland', why: 'Greenland\'s ice sheet is melting into the sea.' },
            { id: 'f4', t: 'Habitat loss', zone: 'arctic', why: 'The sea ice is the polar bears\' habitat, and it is shrinking.' },
            { id: 'f5', t: 'Wildfires', zone: 'australia', why: 'Heat and dry weather made the forests easy to burn.' },
            { id: 'f6', t: 'Flooding', zone: 'bangladesh', why: 'Heavier rain makes the rivers burst their banks.' },
            { id: 'f7', t: 'Heatwaves', zone: 'uk', why: 'A day over 40 °C in the UK is a heatwave never seen before 2022.' },
            { id: 'f8', t: 'Pests and disease', zone: 'kenya', why: 'Warmer weather lets mosquitoes, and the malaria they carry, spread to new places.' },
            { id: 'f9', t: 'Food shortages', zone: null, accept: ['chad'], why: 'Food shortages fit Chad too, because failing crops mean less food.' },
            { id: 'f10', t: 'Earthquakes', zone: null, why: 'Earthquakes are caused by moving plates in the Earth, not by climate change.' }
          ] },
        { id: 'p4-move', type: 'multi', title: 'Who has to move?',
          do: 'Choose every effect of climate change that can force people to leave their homes, then press Check my answers.',
          opts: [
            { t: 'Rising sea levels', ok: 1, why: 'Homes near the coast can end up under water.' },
            { t: 'Drought', ok: 1, why: 'When crops and wells fail, families move to find food and water.' },
            { t: 'Flooding', ok: 1, why: 'Floods can destroy homes and fields.' },
            { t: 'Wildfires', ok: 1, why: 'Fires can burn whole towns.' },
            { t: 'Polar bears going hungry', why: 'This harms wildlife, but people do not live on the sea ice.' },
            { t: 'One hot summer day in the UK', why: 'It is dangerous for some people, but people do not usually leave their homes for good.' }
          ] },
        { id: 'p4-global', type: 'mcq', title: 'Local actions, global effects',
          do: 'Answer the three questions. Choose one answer for each.',
          qs: [
            { id: 'l1', q: 'Carbon dioxide is given off by a car in Newry. Where does it end up?',
              opts: [{ t: 'It spreads through the air all around the world.', ok: 1 }, { t: 'It stays in the air over Newry.' }, { t: 'It sinks into the ground nearby.' }],
              why: 'The air is always moving, so gas from any place spreads around the whole planet.' },
            { id: 'l2', q: 'Your textbook says only 11 in every 100 people in Chad have electricity. What does this mean?',
              opts: [{ t: 'Chad gives off almost no carbon dioxide, but it still suffers from climate change.', ok: 1 }, { t: 'Chad gives off more carbon dioxide than the UK.' }, { t: 'Chad is not affected by climate change.' }],
              why: 'Chad burns very little fossil fuel, but the gas from other countries warms Chad too.' },
            { id: 'l3', q: 'Why are sea levels rising?',
              opts: [{ t: 'Ice on land melts into the sea, and warmer water takes up more space.', ok: 1 }, { t: 'Rivers are carrying more mud into the sea.' }, { t: 'Icebergs already floating in the sea are melting.' }],
              why: 'Ice already floating hardly raises the sea, just as melting ice cubes do not make a glass overflow. Ice melting on land, and water spreading out as it warms, both raise the sea.' }
          ] }
      ],
      talk: 'Chad gives off almost no carbon dioxide, but it suffers a lot from climate change. Is that fair? What should richer countries do to help?'
    },
    {
      k: 5, name: 'Your carbon footprint', colour: '#CB181D',
      quick: { q: 'Carbon dioxide is given off in the UK. Where does it end up?',
        opts: [{ t: 'All around the world', ok: 1 }, { t: 'Only over the UK' }, { t: 'In the ground nearby' }],
        why: 'The air is always moving, so the gas spreads around the whole planet.' },
      tasks: [
        { id: 'p5-countries', type: 'drag', layout: 'order', title: 'Guess who gives off the most',
          do: 'Drag the eight countries into order, with the most carbon dioxide per person at the top and the least at the bottom. Then press Check my answers to see the real figures.',
          note: 'Figures from your textbook, for 2000 and 2017. They count the fuel burned in each country, in tonnes of carbon dioxide per person each year.',
          closeEnough: 'Two or fewer countries out of place counts as right.',
          barValue: '{v} tonnes',
          zones: [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return { id: 'r' + n, label: n === 1 ? '1st: the most' : n === 8 ? '8th: the least' : n + (n === 2 ? 'nd' : n === 3 ? 'rd' : 'th') }; }),
          items: [
            { id: 'qatar', t: 'Qatar', zone: 'r1', y2000: 54, y2017: 37 },
            { id: 'usa', t: 'USA', zone: 'r2', y2000: 21, y2017: 16 },
            { id: 'russia', t: 'Russia', zone: 'r3', y2000: 11, y2017: 12 },
            { id: 'japan', t: 'Japan', zone: 'r4', y2000: 9.5, y2017: 10 },
            { id: 'china', t: 'China', zone: 'r5', y2000: 2.7, y2017: 7.5 },
            { id: 'uk', t: 'UK', zone: 'r6', y2000: 9, y2017: 5.5 },
            { id: 'india', t: 'India', zone: 'r7', y2000: 1, y2017: 1.7 },
            { id: 'chad', t: 'Chad', zone: 'r8', y2000: 0.03, y2017: 0.05 }
          ],
          after: 'Each person in Qatar gives off about 37 tonnes of carbon dioxide a year. Each person in Chad gives off almost none. China gives off the most in total, because it has so many people.' },
        { id: 'p5-footprint', type: 'footprint', title: 'Estimate your own footprint',
          do: 'Answer the eight questions about your life. There are no wrong answers. Watch your footprint grow.',
          care: 'This is only an estimate. Many of these choices are your family\'s, not yours.',
          total: 'Your estimate: about {t} tonnes of greenhouse gases a year.',
          ukLine: 'The UK average is about {uk} tonnes per person a year.',
          shared: { label: 'Your share of schools, hospitals and roads', t: 1.5 },
          ukAverage: 10,
          ukShort: 'UK average: {uk} tonnes',
          qs: [
            { id: 'heat', q: 'How is your home heated?', cat: 'Heating', opts: [['Gas boiler', 1.0], ['Oil boiler', 1.9], ['Heat pump or electric heating', 0.6], ['I\'m not sure', 1.0]] },
            { id: 'power', q: 'How careful is your home about switching things off?', cat: 'Electricity', opts: [['Very careful', 0.15], ['About average', 0.25], ['Not very careful', 0.4]] },
            { id: 'school', q: 'How do you usually get to school?', cat: 'School journey', opts: [['Walk or cycle', 0], ['Bus', 0.15], ['Car, shared with other pupils', 0.3], ['Car, just my family', 0.6]] },
            { id: 'car', q: 'How often does your family use the car for other trips?', cat: 'Other car trips', opts: [['Rarely', 0.2], ['About once a week', 0.8], ['Most days', 1.6]] },
            { id: 'fly', q: 'How many flights do you take in a year?', cat: 'Flights', opts: [['None', 0], ['One return flight in Europe', 0.4], ['Two or more return flights in Europe', 0.9], ['A long-haul flight, such as to America', 1.6]] },
            { id: 'food', q: 'How often do you eat meat?', cat: 'Food', opts: [['At most meals', 2.6], ['Some days', 2.0], ['Rarely', 1.6], ['Never: I am vegetarian', 1.4], ['Never: I am vegan', 1.0]] },
            { id: 'stuff', q: 'How often do you get new clothes, games or gadgets?', cat: 'New things', opts: [['Rarely', 0.6], ['Sometimes', 1.1], ['Often', 1.8]] },
            { id: 'waste', q: 'How much rubbish does your home throw away?', cat: 'Rubbish', opts: [['Very little, and we recycle', 0.1], ['Some', 0.25], ['A lot', 0.4]] }
          ] },
        { id: 'p5-swaps', type: 'swaps', title: 'Choose three swaps',
          do: 'Pick three swaps you could really make. Watch your footprint shrink.',
          already: 'You already do this. Well done.',
          result: 'With your three swaps, your estimate drops from {a} to {b} tonnes a year.',
          swaps: [
            { id: 'w1', t: 'Walk or cycle to school when I can', q: 'school', to: 0 },
            { id: 'w2', t: 'Have meat-free days every week', q: 'food', step: 1, lowest: 2 },
            { id: 'w3', t: 'Buy fewer new things, and buy second-hand', q: 'stuff', to: 0 },
            { id: 'w4', t: 'Switch off lights and screens when I leave a room', q: 'power', to: 0 },
            { id: 'w5', t: 'Holiday nearer home, by train or ferry', q: 'fly', to: 0 },
            { id: 'w6', t: 'Recycle more and waste less food', q: 'waste', to: 0 },
            { id: 'w7', t: 'Ask about a heat pump for our next boiler', q: 'heat', to: 2 },
            { id: 'w8', t: 'Share lifts or take the bus for other trips', q: 'car', step: 1 }
          ] }
      ],
      talk: 'What could our school do to cut its carbon footprint? Think about heating, lights, travel and food.'
    },
    {
      k: 6, name: 'Your plan to 2100', colour: '#E4B824',
      quick: { q: 'Which country in your textbook gives off the most carbon dioxide per person?',
        opts: [{ t: 'Qatar', ok: 1 }, { t: 'China' }, { t: 'India' }],
        why: 'Each person in Qatar gives off about 37 tonnes a year. China gives off the most in total, but not per person.' },
      tasks: [
        { id: 'p6-sort', type: 'drag', layout: 'boards', title: 'Sort the plans',
          do: 'Drag each action onto its plan. Your textbook groups the ways to tackle climate change into five plans, A to E. When all eleven are placed, press Check my answers.',
          zones: [
            { id: 'A', label: 'A. Take carbon dioxide out of the air' },
            { id: 'B', label: 'B. Make less carbon dioxide' },
            { id: 'C', label: 'C. Make less methane' },
            { id: 'D', label: 'D. Block some sunlight' },
            { id: 'E', label: 'E. Help people cope with the changes' }
          ],
          items: [
            { id: 'x1', t: 'Capture carbon dioxide from the air and store it underground', zone: 'A', why: 'This takes carbon dioxide out of the air.' },
            { id: 'x2', t: 'Plant new forests', zone: 'A', why: 'Growing trees take in carbon dioxide.' },
            { id: 'x3', t: 'Pay countries to protect their rainforests', zone: 'A', accept: ['B'], why: 'A and B are both right. Living forests keep taking in carbon dioxide, and not burning them stops carbon dioxide being made.' },
            { id: 'x4', t: 'Build huge solar and wind farms', zone: 'B', why: 'Sun and wind make electricity without burning fuel.' },
            { id: 'x5', t: 'Close every power station that burns fossil fuels', zone: 'B', why: 'Fossil fuel power stations give off a lot of carbon dioxide.' },
            { id: 'x6', t: 'Put a big tax on air travel', zone: 'B', why: 'Fewer flights means less fuel burned.' },
            { id: 'x7', t: 'Double the price of meat', zone: 'C', why: 'People would eat less meat, so fewer cattle would be farmed.' },
            { id: 'x8', t: 'Grow meat in factories instead of farming animals', zone: 'C', why: 'Meat grown in factories needs no cattle, so there is less methane.' },
            { id: 'x9', t: 'Spray tiny drops into the sky to reflect sunlight', zone: 'D', why: 'The drops send some sunlight back into space before it reaches the ground.' },
            { id: 'x10', t: 'Paint every roof white', zone: 'D', why: 'White roofs reflect sunlight, just like ice.' },
            { id: 'x11', t: 'Build homes that keep out floods', zone: 'E', why: 'This does not stop the warming, but it protects people from its effects.' }
          ] },
        { id: 'p6-run', type: 'run', title: 'Run the world to 2100',
          do: 'Choose up to three actions in each round, then press Lock in. You are in charge: watch what your choices do to the stripes and to the year 2100.',
          honest: 'This is a simple model made for this lesson. Real scientists use much bigger ones, but they find the same thing: the faster we cut, the cooler 2100 is.',
          rounds: ['Round 1 of 3: from now to 2030', 'Round 2 of 3: the 2030s', 'Round 3 of 3: the 2040s'],
          lock: 'Lock in round {r}',
          pickHint: 'You have chosen {n} of 3 actions for this round.',
          forecast: 'By 2100: about {t} °C warmer than the late 1800s',
          carryOn: 'If the world carries on as now: about {t} °C',
          feel: 'How people feel about your plan: {n} out of 10',
          protect: 'People protected from floods and drought: {p}',
          protectLevels: ['none yet', 'some', 'many'],
          feelings: { '1': 'People like this.', '-1': 'Some people grumble.', '-2': 'People are angry.' },
          protest: 'People are angry. There are protests in the streets, and your most unpopular action this round has been cancelled: {c}.',
          risk: 'Warning: if the spraying ever stops, the heat comes back fast, and it could change the rain in some places.',
          later: 'Actions started later save less, because the gases already given off stay in the air.',
          verdicts: [
            { max: 1.9, t: 'Brilliant. Warming stayed well below 2 °C. That is about as cool as any plan in this game can keep Earth.' },
            { max: 2.0, t: 'You kept the Paris promise. Warming went no higher than 2 °C.' },
            { max: 2.5, t: 'Better than carrying on, but warming went past the Paris promise of 2 °C.' },
            { max: 99, t: 'Close to carrying on as we are. Many more places would face the effects you met in Part 4.' }
          ],
          again: 'Try a different plan',
          best: 'Your best result so far: about {t} °C.',
          played: 'Played in round {r}',
          chosen: 'Chosen',
          yearNow: 'Year {y}',
          stripesLabel: 'Your stripes from 1850 to 2100',
          resultTitle: 'Your world in 2100',
          roundDone: 'What your actions did in round {r}',
          nextRound: 'Go to round {r}',
          seeResult: 'See your world in 2100',
          noPicks: 'You chose no actions this round, so the world carried on as before.',
          forecastLab: 'Warming by 2100',
          degrees: 'about {t} °C',
          feelLab: 'How people feel about your plan',
          outOf: '{n} out of 10',
          protectLab: 'People protected from floods and drought',
          /* Name, then what it does. The second line shows only after Lock in, so it cannot steer her choice. */
          deck: {
            solar: ['Build huge solar and wind farms', 'Makes clean electricity, so power stations burn much less fuel.'],
            roof: ['Put solar panels on every roof', 'Makes some clean electricity at home.'],
            tidal: ['Build wave and tidal power stations', 'Makes a little clean electricity from the sea.'],
            fossilban: ['Close every power station that burns fossil fuels', 'Cuts most carbon dioxide from electricity, but works far better once clean power is built.'],
            evs: ['Switch to electric cars, buses and lorries', 'Cuts carbon dioxide from transport, most of all when the electricity is clean.'],
            airtax: ['Put a big tax on air travel', 'Fewer flights burn a little less fuel.'],
            homes: ['Build homes that need almost no heating', 'Cuts the carbon dioxide from heating homes.'],
            gasban: ['Ban gas for cooking and heating', 'Cuts carbon dioxide from homes, but families must buy new heaters.'],
            lights: ['Turn street lights off at midnight', 'Saves only a tiny amount of electricity.'],
            fivehours: ['Allow electricity for only 5 hours a day', 'Cuts carbon dioxide, but people cannot live or work normally.'],
            capture: ['Capture carbon dioxide and store it underground', 'Takes carbon dioxide from factories, but it takes 20 years to build.'],
            forests: ['Plant new forests', 'Trees take in carbon dioxide as they grow, but they grow slowly.'],
            rainforest: ['Pay countries to protect their rainforests', 'Stops forests being burned, so less carbon dioxide is given off.'],
            meatprice: ['Double the price of meat', 'Fewer cattle are farmed, so less methane is given off.'],
            labmeat: ['Grow meat in factories', 'Fewer cattle are farmed, so less methane is given off.'],
            spray: ['Spray tiny drops into the sky', 'Reflects some sunlight and cools Earth fast, but it cuts no greenhouse gas.'],
            whiteroofs: ['Paint every roof white', 'Reflects only a tiny amount of sunlight.'],
            floodhomes: ['Build homes that keep out floods', 'Does not slow the warming, but protects people from floods.'],
            drycrops: ['Grow crops that need less water', 'Does not slow the warming, but protects farmers in droughts.']
          } },
        { id: 'p6-poster', type: 'poster', title: 'Make your poster',
          do: 'Choose a slogan or write your own. Add your first name if you like. Then press Save picture.',
          slogans: ['Turn down the heat', 'Every stripe counts', 'Blue stripes, not red', 'The faster we cut, the cooler it gets', 'Our planet, our plan'],
          own: 'Or write your own slogan (up to 40 letters and spaces)',
          name: 'Your first name (you can leave this blank)',
          by2100: 'By 2100: about {t} °C',
          mine: 'The actions in my plan',
          foot: 'Turn Down the Heat · OLS Geography'
        }
      ],
      talk: 'Which action would people protest about most? Would you still choose it? Why?'
    },
    {
      k: 7, name: 'Final check', colour: '#A50F15',
      quick: { q: 'Which plan does planting new forests belong to?',
        opts: [{ t: 'A. Take carbon dioxide out of the air', ok: 1 }, { t: 'D. Block some sunlight' }, { t: 'E. Help people cope with the changes' }],
        why: 'Growing trees take in carbon dioxide from the air.' },
      tasks: [{ id: 'p7-final', type: 'final', title: 'Final check',
        do: 'Answer the fifteen questions, one at a time. You will see straight away if each one is right.' }],
      talk: 'What is the one thing from today that you will tell someone at home?'
    }
  ],

  /* Final check: band 1 = 5 points, 2 = 10 points, 3 = 15 points. Part = where to look again. */
  final: {
    ofLine: 'Question {i} of 15',
    points: '{p} points',
    score: 'You scored {s} out of {m} points.',
    rankLine: 'Your title: {r}',
    ranks: [[0, 'Climate Learner'], [26, 'Climate Investigator'], [51, 'Climate Expert'], [76, 'Climate Champion'], [91, 'Climate Leader']],
    lookAgain: 'Look again at Part {k}',
    groups: { C: 'Causes', E: 'Effects', S: 'Solutions' },
    next: 'Next question',
    see: 'See my score',
    tf: ['True', 'False'],
    orderAgain: 'Clear my order',
    chartTitle: 'Carbon dioxide per person each year, in tonnes',
    chartYears: ['2000', '2017'],
    resultsTitle: 'How you did',
    rightWord: 'Right',
    wrongWord: 'Not right',
    starsKey: '3 stars: 103 or more points out of 135. 2 stars: 69 or more points. 1 star: finished.',
    groupLine: '{g}: {s} out of {m} points',
    qs: [
      { id: 'c1', g: 'C', band: 1, part: 2, q: 'What do greenhouse gases do?', opts: [{ t: 'Trap heat near the Earth', ok: 1 }, { t: 'Make holes in the ozone layer' }, { t: 'Block all sunlight' }], why: 'Greenhouse gases catch heat leaving the ground and send some of it back down.' },
      { id: 'c2', g: 'C', band: 1, part: 3, q: 'Which of these burns a fossil fuel?', opts: [{ t: 'A petrol car', ok: 1 }, { t: 'A bicycle' }, { t: 'A wind turbine' }], why: 'Petrol is made from oil, which is a fossil fuel.' },
      { id: 'c3', g: 'C', band: 2, part: 2, type: 'order', q: 'Put the greenhouse effect in order. Tap the steps from first to last.', steps: ['Sunlight warms the ground.', 'The ground gives off heat.', 'Some heat escapes into space.', 'Greenhouse gases trap some heat.', 'More gas means a warmer Earth.'], why: 'Sunlight comes in first, then heat goes out, and gases catch some of it.' },
      { id: 'c4', g: 'C', band: 2, part: 3, type: 'match', q: 'Which gas does each one mainly give off?', choices: ['Carbon dioxide', 'Methane'], items: [['Cattle', 1], ['Aeroplanes', 0], ['Landfill sites', 1]], why: 'Cattle and rotting rubbish give off methane. Aeroplanes burn fuel, which gives off carbon dioxide.' },
      { id: 'c5', g: 'C', band: 3, part: 3, q: 'Why does cutting down forests add to global warming?', opts: [{ t: 'Burned trees give off carbon dioxide, and fewer trees are left to take it in.', ok: 1 }, { t: 'Trees give off methane when they are cut down.' }, { t: 'Forests stop sunlight from reaching the ground.' }], why: 'Forests store carbon. Cutting and burning them puts it back in the air.' },
      { id: 'e1', g: 'E', band: 1, part: 1, q: 'Which part of the world has warmed the most?', opts: [{ t: 'The Arctic', ok: 1 }, { t: 'The Sahara Desert' }, { t: 'The middle of the Pacific Ocean' }], why: 'The Arctic has warmed over twice as much as the world as a whole.' },
      { id: 'e2', g: 'E', band: 1, part: 1, type: 'tf', q: 'True or false: when ice melts, Earth soaks up more of the Sun\'s heat.', ok: true, why: 'True. White ice reflects sunlight, but the dark ground or sea underneath soaks it up.' },
      { id: 'e3', g: 'E', band: 2, part: 4, q: 'Most of Malé in the Maldives is about 1 metre above the sea. What is its biggest danger?', opts: [{ t: 'Rising sea levels', ok: 1 }, { t: 'Wildfires' }, { t: 'Drought' }], why: 'A city so close to sea level floods as the sea rises.' },
      { id: 'e4', g: 'E', band: 2, part: 4, q: 'Which of these is NOT caused by climate change?', opts: [{ t: 'Earthquakes', ok: 1 }, { t: 'Longer droughts' }, { t: 'More heatwaves' }], why: 'Earthquakes are caused by moving plates in the Earth.' },
      { id: 'e5', g: 'E', band: 3, part: 4, q: 'Chad gives off almost no carbon dioxide. Why does it still suffer from climate change?', opts: [{ t: 'Carbon dioxide from every country spreads around the whole world.', ok: 1 }, { t: 'Chad\'s volcanoes give off greenhouse gases.' }, { t: 'Chad is closer to the Sun than other countries.' }], why: 'The gas does not stay where it is made, so everyone shares the warming.' },
      { id: 's1', g: 'S', band: 1, part: 6, q: 'Which of these makes electricity without giving off carbon dioxide?', opts: [{ t: 'A wind farm', ok: 1 }, { t: 'A coal power station' }, { t: 'A diesel generator' }], why: 'Wind turns the turbines, so no fuel is burned.' },
      { id: 's2', g: 'S', band: 1, part: 6, q: 'Planting new forests helps because trees…', opts: [{ t: 'take in carbon dioxide as they grow.', ok: 1 }, { t: 'give off cold air.' }, { t: 'stop the rain.' }], why: 'Trees use carbon dioxide to grow.' },
      { id: 's3', g: 'S', band: 2, part: 6, q: 'A friend says: “There\'s no point switching off lights. It\'s too small to matter.” Which reply is best?', opts: [{ t: 'Small actions add up when millions of people do them, and they save money too.', ok: 1 }, { t: 'You are right. Only governments can do anything.' }, { t: 'Switching off lights stops global warming on its own.' }], why: 'One switch is small, but millions of people switching off makes a real difference.' },
      { id: 's4', g: 'S', band: 2, part: 6, q: 'Your textbook says the world should be carbon neutral by 2050. What does carbon neutral mean?', opts: [{ t: 'We put no more carbon dioxide into the air than we take out.', ok: 1 }, { t: 'We stop using electricity completely.' }, { t: 'Every country plants one tree each year.' }], why: 'Carbon neutral means what goes into the air is balanced by what comes out.' },
      { id: 's5', g: 'S', band: 3, part: 5, type: 'chart', q: 'Look at the chart. Which country gave off less carbon dioxide per person in 2017 than in 2000?', opts: [{ t: 'The UK', ok: 1 }, { t: 'China' }, { t: 'India' }], why: 'Each person in the UK gave off about 9 tonnes in 2000 and about 5.5 tonnes in 2017. China and India went up.' }
    ]
  },

  end: {
    title: 'You finished Turn Down the Heat',
    stars: 'Your stars for each part',
    show: 'Show your teacher this screen.',
    poster: 'Your poster',
    partShort: 'Part {k}'
  },
  creditsExtra: [
    'Temperatures 1850 to 2025: Met Office Hadley Centre HadCRUT5, Open Government Licence. Shown as the change from the average for 1850 to 1900.',
    'Warming stripes idea: Professor Ed Hawkins, University of Reading, #ShowYourStripes, CC BY 4.0.',
    'Globe colours for 2018: NASA GISS Surface Temperature Analysis (GISTEMP v4), compared with 1951 to 1980. Public domain.',
    'Earth picture: NASA Blue Marble, Reto Stöckli and Robert Simmon, NASA Earth Observatory. Public domain.',
    'Fonts: Anton (Vernon Adams) and Atkinson Hyperlegible (Braille Institute of America), SIL Open Font License 1.1.',
    'The run-the-world model is a simple model made for this lesson. It uses about 0.45 °C of warming for every 1,000 billion tonnes of carbon dioxide, from the IPCC Sixth Assessment Report (2021).'
  ]
};
