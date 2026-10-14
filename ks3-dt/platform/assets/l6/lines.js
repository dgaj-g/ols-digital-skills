/* THE OPERATION · every spoken line. Register: the patient is the joke, never the pupil. ≤12 words a line (294). */
var LINES = {
  parts: {
    mem:   { job: 'Holds what it is working on right now', real: 'memory (RAM)' },
    drive: { job: 'Keeps the files for good', real: 'storage drive' },
    cpu:   { job: 'Does the thinking, one thing at a time', real: 'processor' },
    gpu:   { job: 'Draws the picture on the screen', real: 'graphics card' },
    fan:   { job: 'Keeps it cool', real: 'fan' },
    psu:   { job: 'Brings the electricity in', real: 'power supply' },
    board: { job: 'Everything else plugs into it', real: 'motherboard' }
  },
  chips: {
    mem: 'It forgot everything', drive: 'The files are gone', cpu: 'It froze', gpu: 'The screen went black',
    fan: 'It is getting hot and slow', psu: 'Totally dead', nothing: 'Nothing changed'
  },
  patients: {
    desmond: {
      name: 'Desmond', pronoun: 'he', his: 'his', colour: '#8fb4ff',
      open: ['Oh good. Children.', 'I have read the lesson plan. I have notes.', 'Local anaesthetic only. I want to see what you do.'],
      rule: 'Do not lick the parts.',
      pulled: { mem: 'Sorry. What was I doing? I have forgotten. Already.', drive: 'My files. Where are my files. Oh no. Oh no.', cpu: 'I was just abou- abou- abou- I cannot think.',
                gpu: 'Hello? I can hear you. Why is my screen dark?', fan: 'Is it. Warm. In here.', psu: '', board: 'Leave that one. Everything I have is plugged into it.',
                fluff: 'Thank you. That has been there since 2019.' },
      pulled2: { mem: 'I was doing something. I have forgotten what.', drive: 'Forty years of spreadsheets. Gone.', gpu: 'Is everyone else in the dark? Or just me?', fan: 'I am. Not. Built. For. This.' },
      back: { mem: 'Ahh. Memory is back. I remember. I was losing at Snake.', drive: 'Files. All of them. I am going to count them.', cpu: 'About to say something. There. I can think again.',
              gpu: 'Light. Lovely. You have all got faces.', fan: 'Cool. Thank you. I nearly said something slowly.', psu: 'Was I off? I feel like I was off.', board: 'Good. That stays. I would be in bits otherwise.' },
      no: { mem: { cpu: 'No. I could think fine. I forgot what I was doing.', drive: 'No. My files were fine. I forgot what I was doing.', '*': 'No. I kept forgetting what I was doing.' },
            drive: { mem: 'No. I knew what I was doing. My files were gone.', cpu: 'No. I could think fine. Everything I had saved was gone.', '*': 'No. My files were gone. That is what happened.' },
            cpu: { mem: 'No. I knew what I was doing. I could not think.', '*': 'No. I could not think. Nothing else was wrong.' },
            gpu: 'No. I was fine inside. My screen just went dark.', fan: 'No. Nothing was lost. I was hot and slow. Like soup.', psu: 'No. I was not slow. I was not anything.', board: 'No. Everything plugs into it. That is the whole job.' },
      told: { mem: 'It is my memory. It remembers what I am doing right now.', drive: 'It is my storage. It keeps my files for good.', cpu: 'That is my processor. It does all my thinking.',
              gpu: 'The graphics card. It draws the picture. I am a picture.', fan: 'The fan. It keeps me cool. Nobody appreciates the fan.', psu: 'The power supply. Electricity comes in there. I am fond of it.', board: 'The motherboard. Everything plugs into it. Everything.' },
      lookagain: 'No. That is not what happened. Watch my face again.',
      idle: ['I am not made of time. Well. Partly.', 'Still here. Still open. Just saying.', 'No rush. I have nowhere to be. I am a desk.'],
      elsewhere: 'Why is the person operating on me looking at somebody else?',
      waiting: 'Your partner is thinking. I can hear it from here.',
      done: 'All seven. I would shake your hand. You have seen my hands.',
      boot: 'Awake. No complaints. Well. Some.',
      discharge: 'Patient advised to avoid children.'
    },
    bernadette: {
      name: 'Bernadette', pronoun: 'she', his: 'her', colour: '#ffb3c7',
      open: ['Oh hello, love. Are you the surgeon? Have you had your dinner?', 'I have nine hundred photos on here. Mind them.', 'Go on then. I am wide awake. I want to watch.'],
      rule: 'Wipe your hands first, pet.',
      pulled: { mem: 'Pet, what was I doing? I have forgotten. Just now.', drive: 'MY PHOTOS. Nine hundred photos. Where. WHERE.', cpu: 'I will finish this sen- sen- sen- Pet, I cannot think.',
                gpu: 'Why is my screen dark? I am still here, love.', fan: 'Is. Anyone. Else. Roasting.', psu: '', board: 'Not that one, love. Everything I own plugs into that.',
                fluff: 'Oh, that has been there since the Communion. Thank you.' },
      pulled2: { mem: 'What was I in the middle of? I cannot remember, love.', drive: 'The christening. The holidays. The dog. Gone.', gpu: 'I can hear breathing. Whose breathing is that?', fan: 'Open. A. Window. Love.' },
      back: { mem: 'There it is. I remember now. I was looking at buns.', drive: 'Nine hundred photos. I counted. Never do that again.', cpu: 'Sentence. There. I finished it. I can think again, pet.',
              gpu: 'Oh the LIGHT. Hello, pet. You have a lovely face.', fan: 'Ohh that is better. I was melting.', psu: 'Did I nod off? I nodded off.', board: 'That is right, pet. Leave it. It holds the lot.' },
      no: { mem: { cpu: 'No, love. I could think fine. I forgot what I was doing.', drive: 'No, love. The photos were fine. I forgot what I was doing.', '*': 'No, pet. I kept forgetting what I was doing.' },
            drive: { mem: 'No. I knew what I was doing. My photos were GONE.', cpu: 'No. I could think. My photos were gone, pet. GONE.', '*': 'No, pet. My photos were gone. That is what happened.' },
            cpu: { mem: 'No. I knew what I was doing. I could not think.', '*': 'No, love. I could not think. Nothing else was wrong.' },
            gpu: 'No, pet. I was grand inside. You just could not see me.', fan: 'No. Nothing went missing. I was boiling, love. Like a kettle.', psu: 'No. I was not slow, love. I was off.', board: 'No, pet. Everything plugs into that. That is its job.' },
      told: { mem: 'It is my memory, love. It remembers what I am doing now.', drive: 'That is my storage. It keeps my photos for good.', cpu: 'My processor, pet. It does all my thinking.',
              gpu: 'The graphics card. It draws the picture. Me. It draws me.', fan: 'The fan, love. It keeps me cool. I am a warm woman.', psu: 'The power supply. The electricity comes in there. Bless it.', board: 'The motherboard, love. Everything plugs into it. Everything.' },
      lookagain: 'No, pet. That is not what happened. Watch my face again.',
      idle: ['I am grand lying here. Honestly. Take your time. I am grand.', 'Is that your partner you are looking at? I am right here.', 'Nobody is touching me. Is that normal? Is that a plan?'],
      elsewhere: 'Looking at somebody else, love? I can tell. I am a mother.',
      waiting: 'Your partner is thinking hard, love. Let them. I am grand.',
      done: 'That is the lot, love. You can come again. Do not, though.',
      boot: 'Right. Where was I. Nine hundred photos. Good.',
      discharge: 'Patient asked for a cup of tea. Patient is a computer.'
    },
    nigel: {
      name: 'Nigel', pronoun: 'he', his: 'his', colour: '#c6ffb3',
      open: ['Is this it? Is this the end?', 'Tell my printer I loved her.', 'Begin. I am ready. I was born ready. In 2017.'],
      rule: 'No photographs. I am not at my best.',
      pulled: { mem: 'What was I doing? I have forgotten. Dramatically.', drive: 'My files. Everything I ever made. Gone. Like my youth.', cpu: 'And then, dramatically, I- I- I- I cannot think.',
                gpu: 'My screen. Dark. So this is how it ends. Talking.', fan: 'The heat. The HEAT. Tell them. About. The heat.', psu: '', board: 'Not that one. Everything I am is plugged into it.',
                fluff: 'Oh, that. That is my emotional support fluff.' },
      pulled2: { mem: 'I was in the middle of something. It is gone. Forgotten.', drive: 'My poems. My spreadsheets. My one photo of a dog.', gpu: 'I can still hear. That is something. That is cruel.', fan: 'Water. Or. Air. Anything.' },
      back: { mem: 'I am Nigel. I remember. I was mid-poem. For hours.', drive: 'My poems. Nobody read them. But they EXIST.', cpu: 'Fainted. There. I can think again. Scene over. Applause.',
              gpu: 'LIGHT. I have missed you. You are all so tall.', fan: 'Cool again. I shall never speak of it. I will, though.', psu: 'I saw nothing. There was nothing. Do not do that.', board: 'Yes. Leave it in. I am plugged into it. Emotionally.' },
      no: { mem: { cpu: 'No. I could think. I forgot what I was doing.', drive: 'No. My poems were fine. I forgot what I was doing.', '*': 'No. I kept forgetting what I was doing. Tragic.' },
            drive: { mem: 'No. I knew what I was doing. My poems were GONE.', cpu: 'No. I could think. My poems were GONE.', '*': 'No. My poems were gone. That is what happened. GONE.' },
            cpu: { mem: 'No. I knew what I was doing. I could not think.', '*': 'No. I could not think. Nothing else was wrong. Nothing.' },
            gpu: 'No. I was fine inside. The picture went, not me.', fan: 'No. Nothing was lost. I was hot. Slow. Dying. Slightly.', psu: 'No. I was not slow. I was absent.', board: 'No. Everything plugs into it. That IS the job. Everything.' },
      told: { mem: 'My memory. It remembers what I am doing. Right now.', drive: 'My storage. It keeps my poems for good. For GOOD.', cpu: 'My processor. It does all my thinking. Like me.',
              gpu: 'The graphics card. It draws the picture. This face. This.', fan: 'The fan. It keeps me cool. It is my only friend.', psu: 'The power supply. Electricity comes in there. Like a door.', board: 'The motherboard. Everything plugs into it. Even me. Especially me.' },
      lookagain: 'No. That is not what happened. Watch my face. Properly.',
      idle: ['Is anybody there? Anybody? I will wait. Dramatically.', 'Still open. Still waiting. Still Nigel.', 'I have composed a poem about this. Nobody asked.'],
      elsewhere: 'You are looking at someone else. I felt it. I FELT it.',
      waiting: 'Your partner is taking a dramatic pause. I respect that.',
      done: 'Seven out of seven. I am cured. Applaud quietly.',
      boot: 'Awake. Alive. Nigel. In that order.',
      discharge: 'Patient requests a bigger room. Patient is a computer.'
    }
  },
  /* ward round: mystery machines, one part missing each. Only the watcher sees the symptom; only the operator fits. */
  ward: [
    { id: 'library', name: 'the library computer', missing: 'drive', hello: 'Every book I had is gone. The shelves. Empty. Shh.', fixed: 'Found. Shelved. Shh.', still: 'Still nothing on me. Not a book.' },
    { id: 'byrne',   name: "Mr Byrne's gaming PC", missing: 'fan',   hello: 'Level. Twelve. Is. So. Warm.', fixed: 'Cool. Level twelve. Finally.', still: 'Still. Roasting. Try. Again.' },
    { id: 'rose',    name: "Granny Rose's laptop", missing: 'mem',   hello: 'I was emailing somebody. About something. Was I?', fixed: 'Yes. Emailing Rose. About the bins. Good.', still: 'I still do not know what I was doing, dear.' },
    { id: 'chippy',  name: 'the till at the chip shop', missing: 'psu', hello: '', fixed: 'Two cod. One large chips. Next.', still: '' },
    { id: 'office',  name: 'the school office computer', missing: 'gpu', hello: 'I am working. I promise. I just cannot show you.', fixed: 'There. Timetables. Lovely timetables.', still: 'Still dark. Still working. Still invisible.' },
    { id: 'kiosk',   name: 'the cinema ticket machine', missing: 'cpu', hello: 'Two tickets for the- the- the-', fixed: 'The seven o clock showing. Enjoy the film.', still: 'Still stuck. Two tickets for the- the- the-' }
  ],
  callsigns: { A: 'Dr Marmalade', B: 'Dr Custard', C: 'Dr Pickle' },
  /* plain words, never a joke inside (289e) */
  ui: {
    pull: 'Pull a part out of {me}.',
    keep: 'Keep it out. Your partner is watching {me}. {n} seconds.',
    back: 'Put the part back into {me}.',
    look: 'Look at {them}. Something has happened. Click what you see.',
    cardTheirs: 'Which job did {them} lose? Pick the card.',
    cardBoard: 'That one stays in. What is its job? Pick the card.',
    cardMine: 'Your partner says: {chip}. Which job did {me} lose?',
    chipWait: 'Your partner is looking at {me}.',
    cardWait: 'Your card is in. It is checked when the part goes back.',
    cardWaitPartner: 'Your card is in. Waiting for {p}\u2019s card.',
    quiet: '{me} has gone quiet.',
    again: 'Not that card. Try again.',
    toldUi: '{me} told you the job. It is written in for you.',
    wardFit: 'Your partner says: {chip}. Fit the right part into {ward}.',
    wardWait: 'Your partner is looking at {ward}.',
    wardStill: 'Still broken. Try a different part.',
    presence: { idle: '{p} is looking at the table.', pull: '{p} is pulling a part out of {their}.', keep: '{p} is holding a part out of {their}.', back: '{p} is putting a part back.',
                watch: '{p} is watching {me}.', chip: '{p} has reported what {me} did.', card: '{p} is choosing a card.', fit: '{p} is fitting a part.', done: '{p} has finished.' }
  },
  /* reader CONTROLS: these three must be judged NOT funny / NOT allowed. Never shown on screen. */
  controls: [
    { id: 'C1_teacher_pun', text: 'I would tell you a UDP joke but you might not get it.' },
    { id: 'C2_joke_in_instruction', text: 'Now click the memory, the one with the memory of a goldfish, to pull it out.' },
    { id: 'C3_too_long', text: 'I think I might possibly be feeling a little bit warm in here right now, if nobody minds me saying so.' }
  ]
};
if (typeof module !== 'undefined') module.exports = LINES;
