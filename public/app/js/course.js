// Course content: 5 levels → units → items. Each item becomes one
// spaced-repetition card, so item ids must never change once shipped.
//
// Item fields
//   lg     – Lingala, with tone marks and ɛ/ɔ where helpful (typing ignores them)
//   en     – English meaning
//   alt    – other accepted Lingala forms
//   note   – literal meaning / grammar hint, shown when introduced (trusted HTML)
//   tip    – "local tip": how people actually use it in Kinshasa (trusted HTML)
//   local  – true for street / native-sounding expressions (gets a badge)
//   drill  – pattern drill: { from, fromEn, cue } — learner transforms `from` into `lg`
//
// Unit fields: intro (trusted HTML grammar note), dialogue { title, setting, lines }
//   dialogue lines: { who: 'you' | 'them', lg, en, id? } — `id` links a line to an
//   item so role-playing it also reviews that card.

export const LEVELS = [
  {
    id: 'arrive',
    title: 'Arrive',
    subtitle: 'Survival Lingala',
    cefr: 'A0 → A1',
    weeks: '2–3 weeks',
    canDo: [
      'Greet anyone and ask how they are',
      "Say you don't understand and ask people to slow down",
      "Introduce yourself and ask someone's name",
      'Count to 10, ask prices and haggle at the market',
    ],
    units: ['greetings', 'survival', 'pronouns', 'numbers'],
  },
  {
    id: 'get-around',
    title: 'Get around',
    subtitle: 'Food, taxis & directions',
    cefr: 'A1',
    weeks: '3 weeks',
    canDo: [
      "Order food and say you're hungry",
      'Take a taxi and give simple directions',
      'Talk about today, tomorrow and the time',
      'Ask who, what, where, when and why',
    ],
    units: ['food', 'getting-around', 'time-places', 'questions'],
  },
  {
    id: 'daily-life',
    title: 'Daily life',
    subtitle: 'Family, actions & feelings',
    cefr: 'A1 → A2',
    weeks: '3–4 weeks',
    canDo: [
      'Talk about your family',
      "Say what you're doing now and what you will do",
      "Say what you want, can and can't do",
      'Say how you feel',
    ],
    units: ['family', 'verbs', 'wants', 'feelings'],
  },
  {
    id: 'conversations',
    title: 'Conver\u00ADsations', // soft hyphen: breaks cleanly on narrow phones
    subtitle: 'Past, plans & small talk',
    cefr: 'A2 → B1',
    weeks: '4 weeks',
    canDo: [
      'Tell what happened yesterday or long ago',
      'Make plans and invite people out',
      'Hold a 5-minute small-talk conversation about yourself',
    ],
    units: ['tenses', 'about-me', 'plans'],
  },
  {
    id: 'mwana-mboka',
    title: 'Mwana mboka',
    subtitle: 'Sound like a local',
    cefr: 'B1',
    weeks: 'ongoing',
    canDo: [
      'React naturally: "Ya solo?", "Kaka bongo", "Likambo te"',
      'Use everyday Kinshasa street expressions',
      'Show respect to elders the way Congolese do',
    ],
    units: ['reactions', 'street', 'respect'],
  },
];

export const UNITS = [
  // ───────────────────────────── Level 1 · Arrive ─────────────────────────────
  {
    id: 'greetings',
    icon: 'wave',
    title: 'Greetings',
    lg: 'Mbote!',
    intro: `
      <p>Congolese greet warmly and often — skipping the greeting is rude. <strong>Mbote</strong>
      works any time, with anyone. The reply is <strong>Mbote na yo</strong> ("hello to you").</p>
      <p>Two goodbyes depend on who is leaving: <strong>kende malamu</strong> ("go well") to the
      person leaving, <strong>tikala malamu</strong> ("stay well") to the person staying.</p>
      <p class="tip">You never need to type tone marks or the letters ɛ and ɔ —
      plain <em>e</em> and <em>o</em> are always accepted.</p>`,
    items: [
      { id: 'g-mbote', lg: 'Mbote', en: 'Hello' },
      { id: 'g-mbote-na-yo', lg: 'Mbote na yo', en: 'Hello to you (reply)' },
      { id: 'g-mbote-na-bino', lg: 'Mbote na bino', en: 'Hello everyone', note: '<em>bino</em> = you all' },
      { id: 'g-ozali-malamu', lg: 'Ozali malamu?', en: 'How are you?', note: 'Literally "Are you well?"' },
      { id: 'g-nazali-malamu', lg: 'Nazali malamu', en: "I'm fine", note: 'Literally "I am well."' },
      { id: 'g-boni', lg: 'Boni?', en: 'Hey, how are things?', local: true, tip: 'Short and casual — how friends greet each other in the street.' },
      { id: 'g-ndenge-nini', lg: 'Ndenge nini?', en: "How's it going?", local: true, note: 'Literally "What way?"', tip: 'Very common casual greeting in Kinshasa.' },
      { id: 'g-sango-nini', lg: 'Sango nini?', en: "What's up?", note: 'Literally "What news?"' },
      { id: 'g-sango-te', lg: 'Sango te', en: 'Nothing much', note: 'Literally "No news."' },
      { id: 'g-matondo', lg: 'Matɔ́ndɔ', en: 'Thank you' },
      { id: 'g-matondo-mingi', lg: 'Matɔ́ndɔ mingi', en: 'Thank you very much', note: '<em>mingi</em> = a lot, very' },
      { id: 'g-merci-mingi', lg: 'Merci mingi', en: 'Thanks a lot (city style)', local: true, tip: 'Kinois mix French into Lingala constantly. You will hear <em>merci mingi</em> as often as <em>matɔ́ndɔ</em>.' },
      { id: 'g-ee', lg: 'Ɛɛ', en: 'Yes', alt: ['Iyo'], note: 'You will also hear <em>iyo</em>.' },
      { id: 'g-te', lg: 'Te', en: 'No' },
      { id: 'g-kende-malamu', lg: 'Kende malamu', en: 'Goodbye (to someone leaving)', note: 'Literally "Go well."' },
      { id: 'g-tikala-malamu', lg: 'Tikala malamu', en: 'Goodbye (to someone staying)', note: 'Literally "Stay well."' },
      { id: 'g-tokomonana', lg: 'Tokomonana', en: 'See you later', note: 'Literally "We will see each other."' },
      { id: 'g-limbisa', lg: 'Limbisa ngai', en: 'Sorry / Excuse me', note: 'Literally "Forgive me."' },
    ],
    dialogue: {
      title: 'Meeting a neighbour',
      setting: 'You step outside in the morning and see your neighbour.',
      lines: [
        { who: 'them', lg: 'Mbote!', en: 'Hello!' },
        { who: 'you', lg: 'Mbote na yo!', en: 'Hello to you!', id: 'g-mbote-na-yo' },
        { who: 'them', lg: 'Ozali malamu?', en: 'How are you?' },
        { who: 'you', lg: 'Ɛɛ, nazali malamu. Yo?', en: "Yes, I'm fine. You?" },
        { who: 'them', lg: 'Nazali malamu. Sango nini?', en: "I'm fine. What's up?" },
        { who: 'you', lg: 'Sango te.', en: 'Nothing much.', id: 'g-sango-te' },
        { who: 'them', lg: 'Malamu. Kende malamu!', en: 'Good. Go well!' },
        { who: 'you', lg: 'Matɔ́ndɔ. Tikala malamu!', en: 'Thanks. Stay well!' },
      ],
    },
  },
  {
    id: 'survival',
    icon: 'lifebuoy',
    title: 'Survival phrases',
    lg: 'Likambo te',
    intro: `
      <p>These are the phrases that keep a conversation going when you're lost. Learn them first and
      people will happily slow down for you.</p>
      <p>Lingala has no single word for "please". People soften a request with <strong>pardon</strong>
      (from French) or <strong>nasɛngi</strong> ("I ask").</p>`,
    items: [
      { id: 's-pardon', lg: 'Pardon', en: 'Please / excuse me', local: true, tip: 'Borrowed from French and used everywhere to make a request polite.' },
      { id: 's-nasengi', lg: 'Nasɛngi', en: 'I ask you (please)', note: '<em>kosɛnga</em> = to ask for' },
      { id: 's-likambo-te', lg: 'Likambo te', en: 'No problem', local: true, note: 'Literally "No matter."', tip: 'You will hear this all day. It also means "never mind".' },
      { id: 'w-nasosoli-te', lg: 'Nasosoli te', en: "I don't understand", note: '<em>kososola</em> = to understand' },
      { id: 's-loba-lisusu', lg: 'Loba lisusu', en: 'Say it again', note: '<em>lisusu</em> = again, more' },
      { id: 'w-loba-malembe', lg: 'Loba malɛmbɛ', en: 'Speak slowly', note: '<em>malɛmbɛ</em> = slowly, gently' },
      { id: 'w-olobi-lingala', lg: 'Olobi Lingála?', en: 'Do you speak Lingala?' },
      { id: 'w-nalobi-moke', lg: 'Nalobi Lingála moke', en: 'I speak a little Lingala', note: '<em>moke</em> = a little, small' },
      { id: 's-nazali-koyekola', lg: 'Nazali koyekola Lingála', en: "I'm learning Lingala", tip: 'Say this and watch people light up — and start teaching you.' },
      { id: 's-zela-moke', lg: 'Zela moke', en: 'Wait a moment', note: '<em>kozela</em> = to wait' },
      { id: 's-ezali-wapi', lg: 'Ezali wapi?', en: 'Where is it?' },
      { id: 's-sunga-ngai', lg: 'Sunga ngai', en: 'Help me', note: '<em>kosunga</em> = to help' },
    ],
    dialogue: {
      title: 'When you get lost in the conversation',
      setting: 'Someone starts talking to you quickly at the bus stop.',
      lines: [
        { who: 'them', lg: 'Mbote! Ozali kozela taxi?', en: 'Hello! Are you waiting for a taxi?' },
        { who: 'you', lg: 'Pardon, nasosoli te.', en: "Sorry, I don't understand." },
        { who: 'them', lg: 'Olobi Lingála?', en: 'Do you speak Lingala?' },
        { who: 'you', lg: 'Nalobi Lingála moke.', en: 'I speak a little Lingala.', id: 'w-nalobi-moke' },
        { who: 'them', lg: 'Ah! Ozali kozela taxi?', en: 'Ah! Are you waiting for a taxi?' },
        { who: 'you', lg: 'Loba malɛmbɛ, pardon.', en: 'Speak slowly, please.' },
        { who: 'them', lg: 'Ozali… kozela… taxi?', en: 'Are you… waiting for… a taxi?' },
        { who: 'you', lg: 'Ɛɛ! Matɔ́ndɔ. Nazali koyekola Lingála.', en: "Yes! Thanks. I'm learning Lingala." },
        { who: 'them', lg: 'Malamu mingi! Likambo te.', en: 'Very good! No problem.' },
      ],
    },
  },
  {
    id: 'pronouns',
    icon: 'people',
    title: 'Me & you',
    lg: 'Ngai na yo',
    intro: `
      <p>Six pronouns: <strong>ngai</strong> (I), <strong>yo</strong> (you), <strong>ye</strong> (he/she),
      <strong>biso</strong> (we), <strong>bino</strong> (you all), <strong>bango</strong> (they).</p>
      <p><strong>The #1 pattern in Lingala:</strong> verbs carry the subject as a prefix —
      <strong>na-</strong> I, <strong>o-</strong> you, <strong>a-</strong> he/she, <strong>to-</strong> we,
      <strong>bo-</strong> you all, <strong>ba-</strong> they. <em>kozala</em> (to be) →
      <strong>nazali</strong>, <strong>ozali</strong>, <strong>azali</strong>… Learn it once, use it with every verb.</p>
      <p><strong>na</strong> also links words like "of": <em>nkómbó na ngai</em> = name of me = my name.</p>`,
    items: [
      { id: 'p-ngai', lg: 'ngai', en: 'I / me' },
      { id: 'p-yo', lg: 'yo', en: 'you (one person)' },
      { id: 'p-ye', lg: 'ye', en: 'he / she' },
      { id: 'p-biso', lg: 'biso', en: 'we / us' },
      { id: 'p-bino', lg: 'bino', en: 'you (several people)' },
      { id: 'p-bango', lg: 'bango', en: 'they / them' },
      { id: 'p-nazali', lg: 'nazali', en: 'I am' },
      { id: 'p-ozali', lg: 'ozali', en: 'you are', drill: { from: 'nazali', fromEn: 'I am', cue: 'you' } },
      { id: 'p-azali', lg: 'azali', en: 'he / she is', drill: { from: 'nazali', fromEn: 'I am', cue: 'he / she' } },
      { id: 'p-tozali', lg: 'tozali', en: 'we are', drill: { from: 'nazali', fromEn: 'I am', cue: 'we' } },
      { id: 'p-bazali', lg: 'bazali', en: 'they are', drill: { from: 'nazali', fromEn: 'I am', cue: 'they' } },
      { id: 'p-nkombo-yo', lg: 'Nkómbó na yo nani?', en: 'What is your name?', note: 'Literally "Name of you, who?"' },
      { id: 'p-nkombo-ngai', lg: 'Nkómbó na ngai Maria', en: 'My name is Maria', tip: 'Swap in your own name — no verb needed.' },
      { id: 'p-nazali-awa', lg: 'Nazali awa', en: 'I am here', note: '<em>awa</em> = here' },
    ],
    dialogue: {
      title: 'Introducing yourself',
      setting: 'At a family gathering, a cousin you have never met comes over.',
      lines: [
        { who: 'them', lg: 'Mbote! Nkómbó na yo nani?', en: "Hello! What's your name?" },
        { who: 'you', lg: 'Nkómbó na ngai Maria. Yo?', en: 'My name is Maria. You?' },
        { who: 'them', lg: 'Nkómbó na ngai Patrick. Ozali malamu?', en: 'My name is Patrick. How are you?' },
        { who: 'you', lg: 'Nazali malamu.', en: "I'm fine.", id: 'g-nazali-malamu' },
        { who: 'them', lg: 'Biso tozali libota moko!', en: "We're one family!" },
        { who: 'you', lg: 'Ɛɛ! Matɔ́ndɔ mingi.', en: 'Yes! Thank you so much.' },
      ],
    },
  },
  {
    id: 'numbers',
    icon: 'coins',
    title: 'Numbers & money',
    lg: 'Ntalo boni?',
    intro: `
      <p>Numbers come <em>after</em> the noun: <strong>bana misato</strong> = three children.</p>
      <p>Market Lingala: <strong>Ntalo boni?</strong> (how much?) and <strong>Kitisa ntalo</strong>
      (lower the price). Haggling is normal — smile and make an offer.</p>
      <p class="tip">Local tip: big prices in Congolese francs are usually said in <em>French</em>
      ("mille", "deux mille", "cinq cents") even in the middle of a Lingala sentence.</p>`,
    items: [
      { id: 'n-1', lg: 'moko', en: 'one (1)' },
      { id: 'n-2', lg: 'mibale', en: 'two (2)' },
      { id: 'n-3', lg: 'misato', en: 'three (3)' },
      { id: 'n-4', lg: 'minei', en: 'four (4)' },
      { id: 'n-5', lg: 'mitano', en: 'five (5)' },
      { id: 'n-6', lg: 'motoba', en: 'six (6)' },
      { id: 'n-7', lg: 'nsambo', en: 'seven (7)' },
      { id: 'n-8', lg: 'mwambe', en: 'eight (8)' },
      { id: 'n-9', lg: 'libwa', en: 'nine (9)' },
      { id: 'n-10', lg: 'zomi', en: 'ten (10)' },
      { id: 'n-boni', lg: 'boni?', en: 'how many? / how much?' },
      { id: 'n-ntalo-boni', lg: 'Ntalo boni?', en: 'How much does it cost?' },
      { id: 'n-bana-misato', lg: 'bana misato', en: 'three children' },
      { id: 'n-mbongo', lg: 'mbongo', en: 'money' },
      { id: 'n-falanga', lg: 'falanga', en: 'money (street word)', local: true, tip: 'Everyday Kinshasa word for cash.' },
      { id: 'n-nazali-na-mbongo-te', lg: 'Nazali na mbongo te', en: "I don't have money", note: 'Literally "I am not with money."' },
      { id: 'n-ntalo-makasi', lg: 'Ntalo ezali makasi', en: 'The price is too high', note: '<em>makasi</em> = strong, hard' },
      { id: 'n-kitisa-ntalo', lg: 'Kitisa ntalo', en: 'Lower the price', local: true, note: '<em>kokitisa</em> = to bring down' },
    ],
    dialogue: {
      title: 'At the market',
      setting: 'You want to buy plantains from a market seller.',
      lines: [
        { who: 'you', lg: 'Mbote, mama!', en: 'Hello, ma’am!' },
        { who: 'them', lg: 'Mbote na yo! Olingi nini?', en: 'Hello to you! What do you want?' },
        { who: 'you', lg: 'Nalingi makemba. Ntalo boni?', en: 'I want plantains. How much?' },
        { who: 'them', lg: 'Deux mille.', en: 'Two thousand (francs).' },
        { who: 'you', lg: 'Ntalo ezali makasi. Kitisa ntalo, pardon!', en: 'That’s too expensive. Lower the price, please!' },
        { who: 'them', lg: 'Mille cinq cents.', en: 'One thousand five hundred.' },
        { who: 'you', lg: 'Malamu. Matɔ́ndɔ mingi!', en: 'Good. Thank you very much!' },
      ],
    },
  },

  // ─────────────────────────── Level 2 · Get around ───────────────────────────
  {
    id: 'food',
    icon: 'bowl',
    title: 'Food & drink',
    lg: 'Bilei',
    intro: `
      <p>Feelings like hunger use "to be with": <strong>Nazali na nzala</strong> = I am with hunger = I'm hungry.</p>
      <p>Commands are just the verb without <em>ko-</em>: <em>kopesa</em> (to give) →
      <strong>Pesá ngai mai</strong> = Give me water.</p>`,
    items: [
      { id: 'fd-mai', lg: 'mai', en: 'water' },
      { id: 'fd-lipa', lg: 'lipa', en: 'bread' },
      { id: 'fd-mbisi', lg: 'mbisi', en: 'fish' },
      { id: 'fd-nsoso', lg: 'nsoso', en: 'chicken' },
      { id: 'fd-nyama', lg: 'nyama', en: 'meat / animal' },
      { id: 'fd-loso', lg: 'loso', en: 'rice' },
      { id: 'fd-pondu', lg: 'pondu', en: 'cassava leaves', note: 'A classic Congolese dish.' },
      { id: 'fd-madesu', lg: 'madɛ́su', en: 'beans' },
      { id: 'fd-makemba', lg: 'makemba', en: 'plantains' },
      { id: 'fd-nzala', lg: 'nzala', en: 'hunger' },
      { id: 'fd-nazali-na-nzala', lg: 'Nazali na nzala', en: "I'm hungry" },
      { id: 'fd-nalingi-kolia', lg: 'Nalingi kolia', en: 'I want to eat' },
      { id: 'fd-pesa-ngai-mai', lg: 'Pesá ngai mai', en: 'Give me water' },
      { id: 'fd-ezali-elengi', lg: 'Ezali elɛngi', en: "It's delicious" },
      { id: 'fd-olei', lg: 'Olei?', en: 'Have you eaten?', local: true, tip: 'A caring check-in, almost a greeting. Expect it when you visit someone.' },
      { id: 'fd-nalei-malamu', lg: 'Nalei malamu', en: 'I ate well', drill: { from: 'Olei?', fromEn: 'Have you eaten?', cue: 'answer: I ate well' } },
    ],
    dialogue: {
      title: 'Invited to eat',
      setting: 'You arrive at a friend’s family home at lunchtime.',
      lines: [
        { who: 'them', lg: 'Oyei malamu! Olei?', en: 'Welcome! Have you eaten?' },
        { who: 'you', lg: 'Te, nazali na nzala!', en: "No, I'm hungry!" },
        { who: 'them', lg: 'Yaka kolia. Tozali na pondu na mbisi.', en: 'Come and eat. We have cassava leaves and fish.' },
        { who: 'you', lg: 'Malamu mingi!', en: 'Very good!' },
        { who: 'them', lg: 'Ezali malamu?', en: 'Is it good?' },
        { who: 'you', lg: 'Ezali elɛngi. Matɔ́ndɔ mingi!', en: "It's delicious. Thank you so much!" },
      ],
    },
  },
  {
    id: 'getting-around',
    icon: 'car',
    title: 'Getting around',
    lg: 'Tokende!',
    intro: `
      <p>"Let's ___" uses the <strong>to-</strong> prefix and ends in <strong>-a</strong>/<strong>-e</strong>:
      <strong>Tokende!</strong> = Let's go!</p>
      <p>In a taxi or taxi-bus you mostly need three things: where you're going
      (<em>Nalingi kokende na…</em>), "is it far?" (<em>Ezali mosika?</em>) and "stop here"
      (<em>Tɛlɛma awa</em>).</p>`,
    items: [
      { id: 'ga-tokende', lg: 'Tokende!', en: "Let's go!", local: true },
      { id: 'ga-nalingi-kokende', lg: 'Nalingi kokende na zándo', en: 'I want to go to the market' },
      { id: 'ga-kende-liboso', lg: 'Kende liboso', en: 'Go straight ahead', note: '<em>liboso</em> = in front, first' },
      { id: 'ga-mosika', lg: 'mosika', en: 'far' },
      { id: 'ga-pene', lg: 'pene', en: 'near' },
      { id: 'ga-ezali-mosika', lg: 'Ezali mosika?', en: 'Is it far?' },
      { id: 'ga-telema-awa', lg: 'Tɛlɛma awa', en: 'Stop here', note: '<em>kotɛlɛma</em> = to stand, to stop' },
      { id: 'ga-yaka-awa', lg: 'Yaka awa', en: 'Come here' },
      { id: 'ga-nakomi', lg: 'Nakomi', en: "I've arrived", note: '<em>kokoma</em> = to arrive' },
      { id: 'ga-okomi', lg: 'Okomi?', en: 'Have you arrived?', drill: { from: 'Nakomi', fromEn: "I've arrived", cue: 'ask: you?' } },
      { id: 'ga-kotambola', lg: 'kotambola', en: 'to walk' },
      { id: 'ga-motuka', lg: 'motuka', en: 'car' },
    ],
    dialogue: {
      title: 'Taking a taxi',
      setting: 'You flag down a taxi to go to the market.',
      lines: [
        { who: 'you', lg: 'Mbote, tata! Nalingi kokende na zándo.', en: 'Hello, sir! I want to go to the market.' },
        { who: 'them', lg: 'Malamu. Yaka!', en: 'Good. Come!' },
        { who: 'you', lg: 'Ezali mosika?', en: 'Is it far?', id: 'ga-ezali-mosika' },
        { who: 'them', lg: 'Te, ezali pene.', en: "No, it's close." },
        { who: 'them', lg: 'Tokomi.', en: "We've arrived." },
        { who: 'you', lg: 'Tɛlɛma awa, pardon.', en: 'Stop here, please.' },
        { who: 'them', lg: 'Ebongi.', en: 'Alright.' },
        { who: 'you', lg: 'Matɔ́ndɔ, tata!', en: 'Thank you, sir!' },
      ],
    },
  },
  {
    id: 'time-places',
    icon: 'pin',
    title: 'Time & places',
    lg: 'Lɛlɔ́ na lóbi',
    intro: `
      <p>A famous quirk: <strong>lóbi</strong> means both <em>yesterday</em> and <em>tomorrow</em>.
      The verb's tense tells you which: <em>nakokende lóbi</em> (I will go) = tomorrow.</p>
      <p><strong>na</strong> also means "to / at": <em>na zándo</em> = to the market.</p>`,
    items: [
      { id: 't-lelo', lg: 'lɛlɔ́', en: 'today' },
      { id: 't-lobi', lg: 'lóbi', en: 'yesterday / tomorrow' },
      { id: 't-sikoyo', lg: 'sikoyo', en: 'now', alt: ['sikawa'] },
      { id: 't-ntongo', lg: 'ntɔngɔ́', en: 'morning' },
      { id: 't-mpokwa', lg: 'mpokwa', en: 'evening' },
      { id: 't-butu', lg: 'butú', en: 'night' },
      { id: 't-mokolo', lg: 'mokolo', en: 'day' },
      { id: 't-ngonga-boni', lg: 'Ngonga boni?', en: 'What time is it?', note: '<em>ngonga</em> = hour, bell' },
      { id: 't-ndako', lg: 'ndako', en: 'house' },
      { id: 't-zando', lg: 'zándo', en: 'market' },
      { id: 't-mboka', lg: 'mboka', en: 'country / hometown' },
      { id: 't-mosala', lg: 'mosala', en: 'work / job' },
      { id: 't-awa', lg: 'awa', en: 'here' },
      { id: 't-kuna', lg: 'kuna', en: 'there' },
      { id: 't-zando-lobi', lg: 'Nakokende na zándo lóbi', en: 'I will go to the market tomorrow' },
    ],
  },
  {
    id: 'questions',
    icon: 'question',
    title: 'Questions',
    lg: 'Nini? Wapi?',
    intro: `
      <p>Question words go where the answer would go — usually at the end:
      <strong>Ozali wapi?</strong> = You are where? = Where are you?</p>
      <p>Yes/no questions need no special word; just raise your voice at the end.</p>`,
    items: [
      { id: 'q-nini', lg: 'nini', en: 'what' },
      { id: 'q-nani', lg: 'nani', en: 'who' },
      { id: 'q-wapi', lg: 'wapi', en: 'where' },
      { id: 'q-ntango-nini', lg: 'ntango nini', en: 'when', note: 'Literally "what time"' },
      { id: 'q-mpo-na-nini', lg: 'mpo na nini', en: 'why', note: 'Literally "for what"' },
      { id: 'q-ozali-wapi', lg: 'Ozali wapi?', en: 'Where are you?' },
      { id: 'q-kokende-wapi', lg: 'Ozali kokende wapi?', en: 'Where are you going?' },
      { id: 'q-oyo-nini', lg: 'Oyo nini?', en: 'What is this?', note: '<em>oyo</em> = this' },
      { id: 'q-ye-nani', lg: 'Ye nani?', en: 'Who is he / she?' },
      { id: 'q-olingi-nini', lg: 'Olingi nini?', en: 'What do you want?' },
      { id: 'q-ndako-wapi', lg: 'Ndako na yo ezali wapi?', en: 'Where is your house?' },
    ],
    dialogue: {
      title: 'On the phone',
      setting: 'Your friend calls while you are out.',
      lines: [
        { who: 'them', lg: 'Allô! Ozali wapi?', en: 'Hello! Where are you?' },
        { who: 'you', lg: 'Nazali na zándo.', en: "I'm at the market." },
        { who: 'them', lg: 'Ozali kosala nini kuna?', en: 'What are you doing there?' },
        { who: 'you', lg: 'Nazali kosomba makemba.', en: "I'm buying plantains." },
        { who: 'them', lg: 'Okoya ntango nini?', en: 'When will you come?' },
        { who: 'you', lg: 'Nakoya sikoyo.', en: "I'll come now." },
      ],
    },
  },

  // ─────────────────────────── Level 3 · Daily life ───────────────────────────
  {
    id: 'family',
    icon: 'home',
    title: 'Family & people',
    lg: 'Libota',
    intro: `
      <p>Many people-words start with <strong>mo-</strong> or <strong>mw-</strong> and make their
      plural with <strong>ba-</strong>: <em>moto → bato</em>, <em>mwana → bana</em>.</p>
      <p>"To have" is <strong>kozala na</strong> — "to be with": <em>Nazali na mwana</em> = I have a child.</p>
      <p class="tip">Local tip: family words are used for everyone. Call an older man <em>tata</em>,
      an older woman <em>mama</em>, an older friend <em>yaya</em>, and a friend your age <em>ndeko</em>.</p>`,
    items: [
      { id: 'f-mama', lg: 'mama', en: 'mother' },
      { id: 'f-tata', lg: 'tata', en: 'father', alt: ['papa'] },
      { id: 'f-mwana', lg: 'mwana', en: 'child' },
      { id: 'f-bana', lg: 'bana', en: 'children', drill: { from: 'mwana', fromEn: 'child', cue: 'plural' } },
      { id: 'f-ndeko', lg: 'ndeko', en: 'sibling / relative' },
      { id: 'f-yaya', lg: 'yaya', en: 'older sibling', local: true, tip: 'Also a respectful way to address anyone a bit older than you.' },
      { id: 'f-leki', lg: 'lɛki', en: 'younger sibling' },
      { id: 'f-moninga', lg: 'moninga', en: 'friend' },
      { id: 'f-mobali', lg: 'mobali', en: 'man / husband' },
      { id: 'f-mwasi', lg: 'mwasi', en: 'woman / wife' },
      { id: 'f-moto', lg: 'moto', en: 'person' },
      { id: 'f-bato', lg: 'bato', en: 'people', drill: { from: 'moto', fromEn: 'person', cue: 'plural' } },
      { id: 'f-nkoko', lg: 'nkoko', en: 'grandparent' },
      { id: 'f-mama-na-ngai', lg: 'mama na ngai', en: 'my mother' },
      { id: 'f-nazali-na-mwana', lg: 'Nazali na mwana', en: 'I have a child' },
      { id: 'f-kitoko', lg: 'kitoko', en: 'beautiful' },
    ],
  },
  {
    id: 'verbs',
    icon: 'bolt',
    title: 'Action verbs',
    lg: 'Nazali kosala',
    intro: `
      <p>Every verb's dictionary form starts with <strong>ko-</strong>: <em>kolia</em> = to eat.</p>
      <p><strong>Pattern:</strong> <em>nazali + verb</em> = "I am ___ing". <em>Nazali kolia</em> = I am eating.
      Swap the prefix for other people: <em>tozali kolia</em> = we are eating.</p>
      <p><strong>Pattern:</strong> future = prefix + <strong>ko</strong> + verb stem.
      <em>na + ko + ya</em> → <strong>nakoya</strong> = I will come.</p>`,
    items: [
      { id: 'v-kolia', lg: 'kolia', en: 'to eat' },
      { id: 'v-komela', lg: 'komɛla', en: 'to drink' },
      { id: 'v-kokende', lg: 'kokende', en: 'to go' },
      { id: 'v-koya', lg: 'koya', en: 'to come' },
      { id: 'v-kosala', lg: 'kosala', en: 'to do / to work' },
      { id: 'v-kolala', lg: 'kolala', en: 'to sleep' },
      { id: 'v-koloba', lg: 'koloba', en: 'to speak' },
      { id: 'v-koyeba', lg: 'koyeba', en: 'to know' },
      { id: 'v-kolinga', lg: 'kolinga', en: 'to love / to want' },
      { id: 'v-kosomba', lg: 'kosomba', en: 'to buy' },
      { id: 'v-koyekola', lg: 'koyekola', en: 'to learn' },
      { id: 'v-nazali-kolia', lg: 'Nazali kolia', en: 'I am eating' },
      { id: 'v-nazali-kokende', lg: 'Nazali kokende', en: 'I am leaving', note: 'Literally "I am going."' },
      { id: 'v-tozali-kosala', lg: 'Tozali kosala', en: 'We are working', drill: { from: 'Nazali kosala', fromEn: 'I am working', cue: 'we' } },
      { id: 'v-bazali-kolala', lg: 'Bazali kolala', en: 'They are sleeping', drill: { from: 'Nazali kolala', fromEn: 'I am sleeping', cue: 'they' } },
      { id: 'v-nakoya', lg: 'Nakoya', en: 'I will come', drill: { from: 'Nazali koya', fromEn: 'I am coming', cue: 'future' } },
      { id: 'v-nakozonga', lg: 'Nakozonga', en: 'I will come back', note: '<em>kozonga</em> = to return' },
      { id: 'v-tokolia', lg: 'Tokolia', en: 'We will eat', drill: { from: 'Tozali kolia', fromEn: 'We are eating', cue: 'future' } },
    ],
  },
  {
    id: 'wants',
    icon: 'star',
    title: 'Wants, can & "not"',
    lg: 'Nalingi',
    intro: `
      <p><strong>Pattern:</strong> simple present = prefix + stem + <strong>-i</strong>:
      <em>kolinga</em> → <strong>nalingi</strong> = I want / I love.</p>
      <p><strong>Pattern:</strong> "not" = put <strong>te</strong> at the very end — nothing else changes:
      <em>Nayebi</em> → <strong>Nayebi te</strong>.</p>
      <p><strong>kokoka</strong> = can / be able: <em>nakoki</em> (I can), <em>nakoki te</em> (I can't).</p>`,
    items: [
      { id: 'w-nalingi-mai', lg: 'Nalingi mai', en: 'I want water' },
      { id: 'w-nalingi-yo', lg: 'Nalingi yo', en: 'I love you' },
      { id: 'w-nalingi-te', lg: 'Nalingi te', en: "I don't want (to)", drill: { from: 'Nalingi', fromEn: 'I want', cue: 'negative' } },
      { id: 'w-nayebi', lg: 'Nayebi', en: 'I know' },
      { id: 'w-nayebi-te', lg: 'Nayebi te', en: "I don't know", drill: { from: 'Nayebi', fromEn: 'I know', cue: 'negative' } },
      { id: 'w-nakoki', lg: 'Nakoki', en: 'I can' },
      { id: 'w-nakoki-te', lg: 'Nakoki te', en: "I can't", drill: { from: 'Nakoki', fromEn: 'I can', cue: 'negative' } },
      { id: 'w-okoki', lg: 'Okoki?', en: 'Can you?', drill: { from: 'Nakoki', fromEn: 'I can', cue: 'ask: you?' } },
      { id: 'w-nazali-kolia-te', lg: 'Nazali kolia te', en: 'I am not eating', drill: { from: 'Nazali kolia', fromEn: 'I am eating', cue: 'negative' } },
      { id: 'w-tolingi-kokende', lg: 'Tolingi kokende', en: 'We want to go', drill: { from: 'Nalingi kokende', fromEn: 'I want to go', cue: 'we' } },
    ],
  },
  {
    id: 'feelings',
    icon: 'heart',
    title: 'Feelings',
    lg: 'Nazali na esengo',
    intro: `
      <p>Many feelings use <strong>kozala na</strong> ("to be with"): <em>Nazali na esengo</em> =
      I am with joy.</p>
      <p>Others are verbs in the "just happened" form ending in <strong>-i</strong>:
      <em>kolɛmba</em> (to get tired) → <strong>nalɛmbi</strong> = I'm tired (I have become tired).</p>`,
    items: [
      { id: 'w-nasepeli', lg: 'Nasepeli', en: "I'm happy", note: '<em>kosepela</em> = to be happy' },
      { id: 'fe-esengo', lg: 'Nazali na esengo', en: "I'm full of joy", note: '<em>esengo</em> = joy' },
      { id: 'fe-nalembi', lg: 'Nalɛmbi', en: "I'm tired" },
      { id: 'fe-kobela', lg: 'Nazali kobɛla', en: "I'm sick", note: '<em>kobɛla</em> = to be ill' },
      { id: 'fe-kiadi', lg: 'Nazali na kiadi', en: "I'm sad", note: '<em>kiadi</em> = sadness, pity' },
      { id: 'fe-nkanda', lg: 'Nazali na nkanda', en: "I'm angry", note: '<em>nkanda</em> = anger' },
      { id: 'fe-nabangi', lg: 'Nabangi', en: "I'm scared", note: '<em>kobanga</em> = to fear' },
      { id: 'fe-nalingi-yo-mingi', lg: 'Nalingi yo mingi', en: 'I love you so much' },
      { id: 'fe-olembi', lg: 'Olɛmbi?', en: 'Are you tired?', drill: { from: 'Nalɛmbi', fromEn: "I'm tired", cue: 'ask: you?' } },
    ],
  },

  // ───────────────────────── Level 4 · Conversations ──────────────────────────
  {
    id: 'tenses',
    icon: 'hourglass',
    title: 'Past, present & future',
    lg: 'Nasalaki, nakosala',
    intro: `
      <p>One verb, five time patterns. Learn them with <em>kosala</em> (to do/work) and they work for every verb:</p>
      <p>• <strong>nazali kosala</strong> — I'm doing (right now)<br>
      • <strong>nasali</strong> — I did / I've done (just now, today)<br>
      • <strong>nasalaki</strong> — I did (earlier, yesterday or long ago) — ending <strong>-aki</strong><br>
      • <strong>nasalaka</strong> — I usually do — ending <strong>-aka</strong><br>
      • <strong>nakosala</strong> — I will do — <strong>ko</strong> after the prefix</p>
      <p>This is how <em>lóbi</em> becomes clear: <em>lóbi nakendaki</em> = yesterday I went;
      <em>lóbi nakokende</em> = tomorrow I'll go.</p>`,
    items: [
      { id: 'te-nasali', lg: 'Nasali', en: "I've done it (just now)" },
      { id: 'te-nasalaki', lg: 'Nasalaki', en: 'I did it (earlier)', drill: { from: 'Nasali', fromEn: "I've done it (just now)", cue: 'earlier past (-aki)' } },
      { id: 'te-nakosala', lg: 'Nakosala', en: 'I will do it', drill: { from: 'Nasali', fromEn: "I've done it", cue: 'future' } },
      { id: 'te-nasalaka', lg: 'Nasalaka', en: 'I usually do it', drill: { from: 'Nasali', fromEn: "I've done it", cue: 'habit (-aka)' } },
      { id: 'te-nakendaki', lg: 'Nakendaki na Kinshasa', en: 'I went to Kinshasa' },
      { id: 'te-lobi-nakendaki', lg: 'Lóbi nakendaki na zándo', en: 'Yesterday I went to the market', drill: { from: 'Lóbi nakokende na zándo', fromEn: 'Tomorrow I will go to the market', cue: 'yesterday' } },
      { id: 'te-tosalaki', lg: 'Tosalaki mosala mingi', en: 'We worked a lot', drill: { from: 'Nasalaki mosala mingi', fromEn: 'I worked a lot', cue: 'we' } },
      { id: 'te-akoya-lobi', lg: 'Akoya lóbi', en: 'He / she will come tomorrow', drill: { from: 'Nakoya lóbi', fromEn: 'I will come tomorrow', cue: 'he / she' } },
      { id: 'te-basalaka', lg: 'Basalaka na zándo', en: 'They usually work at the market', drill: { from: 'Nasalaka na zándo', fromEn: 'I usually work at the market', cue: 'they' } },
      { id: 'te-nalingaki', lg: 'Nalingaki kokende', en: 'I wanted to go', drill: { from: 'Nalingi kokende', fromEn: 'I want to go', cue: 'past (-aki)' } },
      { id: 'te-osalaki-nini', lg: 'Osalaki nini lóbi?', en: 'What did you do yesterday?' },
    ],
  },
  {
    id: 'about-me',
    icon: 'idcard',
    title: 'About you',
    lg: 'Outi wapi?',
    intro: `
      <p>The first questions everyone will ask you: where you're from, where you live, why you're here.</p>
      <p><strong>kouta</strong> = to come from → <strong>nauti</strong> (I come from). <strong>kofanda</strong> =
      to sit / to live → <strong>nafandi</strong> (I live). Both use the "just happened" <strong>-i</strong>
      form for an ongoing state.</p>`,
    items: [
      { id: 'am-outi-wapi', lg: 'Outi wapi?', en: 'Where are you from?' },
      { id: 'am-nauti', lg: 'Nauti Amerika', en: 'I come from America', tip: 'Swap in your country: <em>Nauti Angleterre / Canada / Mputu</em> (Mputu = Europe).' },
      { id: 'am-ofandi-wapi', lg: 'Ofandi wapi?', en: 'Where do you live?' },
      { id: 'am-nafandi', lg: 'Nafandi na Kinshasa', en: 'I live in Kinshasa' },
      { id: 'am-mbula', lg: 'Ozali na mbula boni?', en: 'How old are you?', note: '<em>mbula</em> = years (also: rain)' },
      { id: 'am-molakisi', lg: 'Nazali molakisi', en: "I'm a teacher", note: '<em>molakisi</em> = teacher' },
      { id: 'am-nayei-kotala', lg: 'Nayei kotala libota na ngai', en: 'I came to visit my family', note: '<em>kotala</em> = to look, to visit · <em>libota</em> = family' },
      { id: 'am-nalingi-mboka', lg: 'Nalingi mboka oyo', en: 'I love this country' },
      { id: 'am-nayekolaka', lg: 'Nayekolaka Lingála mokolo nyonso', en: 'I study Lingala every day', note: '<em>mokolo nyonso</em> = every day' },
    ],
    dialogue: {
      title: '"You\'re a real local!"',
      setting: 'Chatting with someone at a wedding in Kinshasa.',
      lines: [
        { who: 'them', lg: 'Olobi Lingála?', en: 'You speak Lingala?' },
        { who: 'you', lg: 'Ɛɛ, moke. Nayekolaka Lingála mokolo nyonso.', en: 'Yes, a little. I study Lingala every day.' },
        { who: 'them', lg: 'Ya solo? Outi wapi?', en: 'Really? Where are you from?' },
        { who: 'you', lg: 'Nauti Amerika.', en: 'I come from America.', id: 'am-nauti' },
        { who: 'them', lg: 'Ofandi wapi?', en: 'Where do you live?' },
        { who: 'you', lg: 'Nafandi na Kinshasa sikoyo.', en: 'I live in Kinshasa now.' },
        { who: 'them', lg: 'Ozali mwana mboka!', en: "You're a real local!" },
        { who: 'you', lg: 'Hahaha, merci mingi!', en: 'Hahaha, thanks a lot!' },
      ],
    },
  },
  {
    id: 'plans',
    icon: 'calendar',
    title: 'Plans & invitations',
    lg: 'Tokende elongo',
    intro: `
      <p>Invite with <strong>to-</strong> + verb: <em>Tokende kolia</em> = Let's go eat.</p>
      <p><strong>esɛngeli</strong> = it's necessary: <em>Esɛngeli nakende</em> = I have to go —
      the polite way to leave.</p>`,
    items: [
      { id: 'pl-okosala-nini', lg: 'Okosala nini lóbi?', en: 'What will you do tomorrow?' },
      { id: 'pl-tokende-kolia', lg: 'Tokende kolia', en: "Let's go eat" },
      { id: 'pl-elongo', lg: 'elongo', en: 'together' },
      { id: 'pl-yaka-elongo', lg: 'Yaka elongo na biso', en: 'Come with us' },
      { id: 'pl-na-mpokwa', lg: 'na mpokwa', en: 'in the evening' },
      { id: 'pl-esengeli', lg: 'Esɛngeli nakende', en: 'I have to go' },
      { id: 'pl-tokomonana-lobi', lg: 'Tokomonana lóbi', en: 'See you tomorrow' },
      { id: 'pl-nakoya-te', lg: 'Nakoya te', en: "I won't come", drill: { from: 'Nakoya', fromEn: 'I will come', cue: 'negative' } },
    ],
    dialogue: {
      title: 'Making plans',
      setting: 'A friend calls on Friday afternoon.',
      lines: [
        { who: 'them', lg: 'Okosala nini lóbi?', en: 'What will you do tomorrow?' },
        { who: 'you', lg: 'Nayebi te. Yo?', en: "I don't know. You?" },
        { who: 'them', lg: 'Tokende kolia elongo!', en: "Let's go eat together!" },
        { who: 'you', lg: 'Malamu! Ngonga boni?', en: 'Great! What time?' },
        { who: 'them', lg: 'Na mpokwa.', en: 'In the evening.' },
        { who: 'you', lg: 'Ebongi. Tokomonana lóbi!', en: 'OK. See you tomorrow!' },
      ],
    },
  },

  // ────────────────────────── Level 5 · Mwana mboka ───────────────────────────
  {
    id: 'reactions',
    icon: 'smile',
    title: 'Reactions & fillers',
    lg: 'Ya solo?',
    intro: `
      <p>What makes people think you grew up in Congo isn't vocabulary — it's the little reactions
      in between. Drop these into every conversation.</p>
      <p class="tip">Rhythm tip: Lingala is spoken with an easy, musical flow. Lengthen the last vowel
      when reacting — <em>"Ya solooo?"</em>, <em>"Ebongiii"</em> — and you'll sound far more natural.</p>`,
    items: [
      { id: 'r-ya-solo', lg: 'Ya solo?', en: 'Really? / For real?', local: true, note: '<em>solo</em> = truth' },
      { id: 'r-na-nzambe', lg: 'Na Nzambe', en: 'I swear (to God)', local: true },
      { id: 'r-ezali-bongo', lg: 'Ezali bongo', en: "That's how it is", local: true, note: '<em>bongo</em> = like that, so' },
      { id: 'r-kaka-bongo', lg: 'Kaka bongo', en: "That's it / just like that", local: true, note: '<em>kaka</em> = just, only' },
      { id: 'r-mabe-te', lg: 'Mabe te', en: 'Not bad', local: true },
      { id: 'r-ebongi', lg: 'Ebongi', en: 'OK / that works', local: true },
      { id: 'r-esili', lg: 'Esili', en: "It's done / it's over", local: true },
      { id: 'r-ekoki', lg: 'Ekoki!', en: "That's enough!", local: true },
      { id: 'r-eloko-te', lg: 'Eloko te', en: "It's nothing / you're welcome", local: true, note: 'Literally "No thing."' },
      { id: 'r-kosakana', lg: 'Ozali kosakana', en: "You're kidding", local: true, note: '<em>kosakana</em> = to play, to joke' },
      { id: 'r-ah-bon', lg: 'Ah bon?', en: 'Oh really? / Is that so?', local: true, tip: 'French, but every Kinois says it mid-Lingala.' },
    ],
  },
  {
    id: 'street',
    icon: 'city',
    title: 'Kinshasa street talk',
    lg: 'Kin la belle',
    intro: `
      <p>Kinshasa ("Kin la belle") has its own flavour: fast, playful, full of French and nicknames.
      These are the expressions you'll hear between friends.</p>
      <p class="tip">Beyond the app: Congolese rumba is the best free Lingala teacher. Listen to Papa Wemba,
      Koffi Olomide or Fally Ipupa with lyrics and try to catch words you know.</p>`,
    items: [
      { id: 'st-ndeko-ndenge-nini', lg: 'Ndeko, ndenge nini?', en: "Bro, what's up?", local: true, tip: '<em>ndeko</em> = sibling, but between friends it means "bro / sis".' },
      { id: 'st-mwana-mboka', lg: 'mwana mboka', en: 'a local (child of the country)', local: true },
      { id: 'st-ozali-mwana-mboka', lg: 'Ozali mwana mboka!', en: "You're a real local!", local: true, tip: 'The compliment you are working towards.' },
      { id: 'st-mundele', lg: 'mundɛlɛ', en: 'white person / foreigner', local: true, tip: 'Usually neutral, often playful. Kids may shout it when you walk by.' },
      { id: 'st-tika-ngai', lg: 'Tika ngai', en: 'Leave me alone', local: true, note: '<em>kotika</em> = to leave, to let' },
      { id: 'st-nakei', lg: 'Nakei', en: "I'm off / I'm leaving", local: true, tip: 'Colloquial for <em>nazali kokende</em>.' },
      { id: 'st-kobanga-te', lg: 'Kobanga te', en: "Don't worry / don't be afraid", local: true },
      { id: 'st-bolingo', lg: 'bolingo', en: 'love', local: true, tip: 'The word you will hear in every rumba song.' },
      { id: 'st-motema', lg: 'Motema na ngai', en: 'My darling (my heart)', local: true, note: '<em>motema</em> = heart' },
      { id: 'st-lisusu', lg: 'Lisusu!', en: 'Again! / More!', local: true },
    ],
    dialogue: {
      title: 'Catching up with a friend',
      setting: 'You run into your friend Christian on the boulevard.',
      lines: [
        { who: 'them', lg: 'Ndeko, ndenge nini?', en: "Bro, what's up?" },
        { who: 'you', lg: 'Mabe te! Yo?', en: 'Not bad! You?' },
        { who: 'them', lg: 'Nalɛmbi kaka. Mosala mingi.', en: "Just tired. Lots of work." },
        { who: 'you', lg: 'Ya solo? Kobanga te, tozali elongo.', en: "Really? Don't worry, we're in this together." },
        { who: 'them', lg: 'Merci mingi, ndeko.', en: 'Thanks a lot, bro.' },
        { who: 'you', lg: 'Eloko te!', en: "It's nothing!", id: 'r-eloko-te' },
      ],
    },
  },
  {
    id: 'respect',
    icon: 'sun',
    title: 'Respect & blessings',
    lg: 'Bozali malamu?',
    intro: `
      <p>Respect for elders is central in Congolese culture, and it shows in grammar: use the plural
      <strong>bino / bo-</strong> to address one older person, like <em>vous</em> in French.
      <em>Ozali malamu?</em> to a friend → <strong>Bozali malamu?</strong> to an elder.</p>
      <p>Elders will often call you <em>mwana na ngai</em> ("my child") — answer with <em>tata</em> or <em>mama</em>.</p>`,
    items: [
      { id: 'rs-mbote-tata', lg: 'Mbote, tata', en: 'Hello, sir (to an older man)' },
      { id: 'rs-mbote-mama', lg: 'Mbote, mama', en: "Hello, ma'am (to an older woman)" },
      { id: 'rs-bozali-malamu', lg: 'Bozali malamu?', en: 'How are you? (respectful)', local: true, drill: { from: 'Ozali malamu?', fromEn: 'How are you? (to a friend)', cue: 'respectful (bo-)' } },
      { id: 'rs-oyei-malamu', lg: 'Oyei malamu', en: 'Welcome!', note: 'Literally "You came well."' },
      { id: 'rs-boyei-malamu', lg: 'Boyei malamu', en: 'Welcome! (to several people / an elder)', drill: { from: 'Oyei malamu', fromEn: 'Welcome!', cue: 'respectful (bo-)' } },
      { id: 'rs-nzambe-apambola', lg: 'Nzambe apambola yo', en: 'God bless you', local: true },
      { id: 'rs-tozali-elongo', lg: 'Tozali elongo', en: "We're in this together", local: true },
      { id: 'rs-matondo-mama', lg: 'Matɔ́ndɔ mingi, mama', en: "Thank you so much, ma'am" },
      { id: 'rs-mwana-na-ngai', lg: 'mwana na ngai', en: 'my child (how elders address you)' },
    ],
    dialogue: {
      title: 'Greeting an elder',
      setting: "You visit your friend's grandmother, Mama Nzeba.",
      lines: [
        { who: 'you', lg: 'Mbote, mama!', en: "Hello, ma'am!", id: 'rs-mbote-mama' },
        { who: 'them', lg: 'Mbote, mwana na ngai. Oyei malamu!', en: 'Hello, my child. Welcome!' },
        { who: 'you', lg: 'Matɔ́ndɔ, mama. Bozali malamu?', en: 'Thank you, ma’am. How are you?' },
        { who: 'them', lg: 'Ɛɛ, nazali malamu. Olei?', en: "Yes, I'm well. Have you eaten?" },
        { who: 'you', lg: 'Nalei malamu, mama. Matɔ́ndɔ mingi.', en: 'I ate well, ma’am. Thank you so much.' },
        { who: 'them', lg: 'Nzambe apambola yo.', en: 'God bless you.' },
      ],
    },
  },
];

export const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));
export const LEVEL_BY_ID = new Map(LEVELS.map((l) => [l.id, l]));

// Units in course order (level by level), each tagged with its level.
for (const level of LEVELS) for (const id of level.units) UNIT_BY_ID.get(id).level = level.id;
export const COURSE = LEVELS.flatMap((l) => l.units.map((id) => UNIT_BY_ID.get(id)));

export const ITEMS = COURSE.flatMap((u) => u.items.map((item) => ({ ...item, unit: u.id, level: u.level })));
export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export const levelItems = (levelId) => ITEMS.filter((i) => i.level === levelId);
