// Course content. Each item becomes one spaced-repetition card.
//   lg   – Lingala, written with tone marks and ɛ/ɔ where helpful (typing ignores them)
//   en   – English meaning shown to the learner
//   alt  – other accepted Lingala spellings / forms
//   note – optional tip shown when the item is introduced
// Unit `intro` text is trusted static HTML.

export const UNITS = [
  {
    id: 'greetings',
    emoji: '👋',
    title: 'Greetings',
    lg: 'Mbote!',
    intro: `
      <p>Lingala speakers greet warmly and often. <strong>Mbote</strong> works for any time of day
      and anyone — start every conversation with it.</p>
      <p>Two goodbyes depend on who is leaving: say <strong>kende malamu</strong> ("go well") to the
      person leaving, and <strong>tikala malamu</strong> ("stay well") to the person staying.</p>
      <p class="tip">You never need to type tone marks or the special letters ɛ and ɔ —
      plain <em>e</em> and <em>o</em> are always accepted.</p>`,
    items: [
      { id: 'g-mbote', lg: 'Mbote', en: 'Hello' },
      { id: 'g-ozali-malamu', lg: 'Ozali malamu?', en: 'How are you?', note: 'Literally "Are you well?"' },
      { id: 'g-nazali-malamu', lg: 'Nazali malamu', en: "I'm fine", note: 'Literally "I am well."' },
      { id: 'g-sango-nini', lg: 'Sango nini?', en: "What's up?", note: 'Literally "What news?"' },
      { id: 'g-sango-te', lg: 'Sango te', en: 'Nothing much', note: 'Literally "No news."' },
      { id: 'g-matondo', lg: 'Matɔ́ndɔ', en: 'Thank you' },
      { id: 'g-matondo-mingi', lg: 'Matɔ́ndɔ mingi', en: 'Thank you very much', note: '<em>mingi</em> = a lot, very' },
      { id: 'g-ee', lg: 'Ɛɛ', en: 'Yes', alt: ['Iyo'], note: 'You will also hear <em>iyo</em>.' },
      { id: 'g-te', lg: 'Te', en: 'No' },
      { id: 'g-kende-malamu', lg: 'Kende malamu', en: 'Goodbye (to someone leaving)', note: 'Literally "Go well."' },
      { id: 'g-tikala-malamu', lg: 'Tikala malamu', en: 'Goodbye (to someone staying)', note: 'Literally "Stay well."' },
      { id: 'g-tokomonana', lg: 'Tokomonana', en: 'See you later', note: 'Literally "We will see each other."' },
      { id: 'g-limbisa', lg: 'Limbisa ngai', en: 'Sorry / Excuse me', note: 'Literally "Forgive me."' },
    ],
  },
  {
    id: 'pronouns',
    emoji: '🧑🏾‍🤝‍🧑🏾',
    title: 'Me & you',
    lg: 'Ngai na yo',
    intro: `
      <p>Lingala has six pronouns: <strong>ngai</strong> (I), <strong>yo</strong> (you),
      <strong>ye</strong> (he/she), <strong>biso</strong> (we), <strong>bino</strong> (you all),
      <strong>bango</strong> (they).</p>
      <p>Verbs carry the subject as a prefix: <strong>na-</strong> I, <strong>o-</strong> you,
      <strong>a-</strong> he/she, <strong>to-</strong> we, <strong>bo-</strong> you all,
      <strong>ba-</strong> they. So <em>kozala</em> (to be) becomes <strong>nazali</strong> (I am),
      <strong>ozali</strong> (you are), and so on.</p>
      <p><strong>na</strong> also links words like "of": <em>nkómbó na ngai</em> = name of me = my name.</p>`,
    items: [
      { id: 'p-ngai', lg: 'ngai', en: 'I / me' },
      { id: 'p-yo', lg: 'yo', en: 'you (one person)' },
      { id: 'p-ye', lg: 'ye', en: 'he / she' },
      { id: 'p-biso', lg: 'biso', en: 'we / us' },
      { id: 'p-bino', lg: 'bino', en: 'you (several people)' },
      { id: 'p-bango', lg: 'bango', en: 'they / them' },
      { id: 'p-nazali', lg: 'nazali', en: 'I am' },
      { id: 'p-ozali', lg: 'ozali', en: 'you are' },
      { id: 'p-azali', lg: 'azali', en: 'he / she is' },
      { id: 'p-tozali', lg: 'tozali', en: 'we are' },
      { id: 'p-bazali', lg: 'bazali', en: 'they are' },
      { id: 'p-nkombo-yo', lg: 'Nkómbó na yo nani?', en: 'What is your name?', note: 'Literally "Name of you, who?"' },
      { id: 'p-nkombo-ngai', lg: 'Nkómbó na ngai Maria', en: 'My name is Maria' },
      { id: 'p-nazali-awa', lg: 'Nazali awa', en: 'I am here', note: '<em>awa</em> = here' },
    ],
  },
  {
    id: 'family',
    emoji: '👨‍👩‍👧',
    title: 'Family & people',
    lg: 'Libota',
    intro: `
      <p>Many people-words start with <strong>mo-</strong> or <strong>mw-</strong> and make their
      plural with <strong>ba-</strong>: <em>moto → bato</em> (person → people),
      <em>mwana → bana</em> (child → children).</p>
      <p>"To have" is <strong>kozala na</strong> — literally "to be with":
      <em>Nazali na mwana</em> = I have a child.</p>`,
    items: [
      { id: 'f-mama', lg: 'mama', en: 'mother' },
      { id: 'f-tata', lg: 'tata', en: 'father', alt: ['papa'] },
      { id: 'f-mwana', lg: 'mwana', en: 'child' },
      { id: 'f-bana', lg: 'bana', en: 'children' },
      { id: 'f-ndeko', lg: 'ndeko', en: 'sibling / relative' },
      { id: 'f-mobali', lg: 'mobali', en: 'man / husband' },
      { id: 'f-mwasi', lg: 'mwasi', en: 'woman / wife' },
      { id: 'f-moto', lg: 'moto', en: 'person' },
      { id: 'f-bato', lg: 'bato', en: 'people' },
      { id: 'f-nkoko', lg: 'nkoko', en: 'grandparent' },
      { id: 'f-mama-na-ngai', lg: 'mama na ngai', en: 'my mother' },
      { id: 'f-nazali-na-mwana', lg: 'Nazali na mwana', en: 'I have a child' },
      { id: 'f-kitoko', lg: 'kitoko', en: 'beautiful' },
    ],
  },
  {
    id: 'numbers',
    emoji: '🔢',
    title: 'Numbers 1–10',
    lg: 'Moko, mibale, misato…',
    intro: `
      <p>Numbers come <em>after</em> the noun: <strong>bana misato</strong> = three children.</p>
      <p>To ask a price, say <strong>Ntalo boni?</strong> — "price how much?" You'll use it at every market.</p>`,
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
    ],
  },
  {
    id: 'food',
    emoji: '🍲',
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
      { id: 'fd-pesa-ngai-mai', lg: 'Pesá ngai mai', en: 'Give me water' },
      { id: 'fd-ezali-elengi', lg: 'Ezali elɛngi', en: "It's delicious" },
    ],
  },
  {
    id: 'verbs',
    emoji: '⚡',
    title: 'Action verbs',
    lg: 'Nazali kosala',
    intro: `
      <p>Every verb's dictionary form starts with <strong>ko-</strong>: <em>kolia</em> = to eat.</p>
      <p>The most useful pattern in Lingala: <strong>nazali + verb</strong> = "I am ___ing".
      <em>Nazali kolia</em> = I am eating. Swap the prefix for other people: <em>tozali kolia</em> = we are eating.</p>
      <p>Future: put <strong>ko</strong> after the subject prefix. <em>na + ko + ya</em> →
      <strong>nakoya</strong> = I will come.</p>`,
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
      { id: 'v-nazali-kolia', lg: 'Nazali kolia', en: 'I am eating' },
      { id: 'v-nazali-kokende', lg: 'Nazali kokende', en: 'I am leaving', note: 'Literally "I am going."' },
      { id: 'v-tozali-kosala', lg: 'Tozali kosala', en: 'We are working' },
      { id: 'v-nakoya', lg: 'Nakoya', en: 'I will come' },
      { id: 'v-nakozonga', lg: 'Nakozonga', en: 'I will come back', note: '<em>kozonga</em> = to return' },
    ],
  },
  {
    id: 'wants',
    emoji: '💬',
    title: 'Wants & "not"',
    lg: 'Nalingi',
    intro: `
      <p>Simple present: subject prefix + verb stem + <strong>-i</strong>.
      <em>kolinga</em> → <strong>nalingi</strong> = I want / I love.</p>
      <p>To say "not", put <strong>te</strong> at the very end — nothing else changes:
      <em>Nayebi</em> (I know) → <strong>Nayebi te</strong> (I don't know).</p>`,
    items: [
      { id: 'w-nalingi-mai', lg: 'Nalingi mai', en: 'I want water' },
      { id: 'w-nalingi-yo', lg: 'Nalingi yo', en: 'I love you' },
      { id: 'w-nalingi-te', lg: 'Nalingi te', en: "I don't want (to)" },
      { id: 'w-nayebi', lg: 'Nayebi', en: 'I know' },
      { id: 'w-nayebi-te', lg: 'Nayebi te', en: "I don't know" },
      { id: 'w-nasosoli-te', lg: 'Nasosoli te', en: "I don't understand", note: '<em>kososola</em> = to understand' },
      { id: 'w-olobi-lingala', lg: 'Olobi Lingála?', en: 'Do you speak Lingala?' },
      { id: 'w-nalobi-moke', lg: 'Nalobi Lingála moke', en: 'I speak a little Lingala', note: '<em>moke</em> = a little, small' },
      { id: 'w-loba-malembe', lg: 'Loba malɛmbɛ', en: 'Speak slowly', note: '<em>malɛmbɛ</em> = slowly, gently' },
      { id: 'w-nazali-kolia-te', lg: 'Nazali kolia te', en: 'I am not eating' },
      { id: 'w-nasepeli', lg: 'Nasepeli', en: "I'm happy", note: '<em>kosepela</em> = to be happy' },
    ],
  },
  {
    id: 'questions',
    emoji: '❓',
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
  },
  {
    id: 'time-places',
    emoji: '🗺️',
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
      { id: 't-ndako', lg: 'ndako', en: 'house' },
      { id: 't-zando', lg: 'zándo', en: 'market' },
      { id: 't-mboka', lg: 'mboka', en: 'country / hometown' },
      { id: 't-mosala', lg: 'mosala', en: 'work / job' },
      { id: 't-awa', lg: 'awa', en: 'here' },
      { id: 't-kuna', lg: 'kuna', en: 'there' },
      { id: 't-zando-lobi', lg: 'Nakokende na zándo lóbi', en: 'I will go to the market tomorrow' },
    ],
  },
];

export const ITEMS = UNITS.flatMap((u) => u.items.map((item) => ({ ...item, unit: u.id })));
export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));
