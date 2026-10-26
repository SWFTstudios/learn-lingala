// Word-by-word breakdowns for course phrases: a hand-written bilingual lexicon,
// verb forms split into their parts (na·ling·i = I · want · now), noun plurals,
// and the grammar patterns a phrase uses. Works offline; `npm test` checks that
// every word in every course phrase is covered.

import { normalize } from './answer.js';
import { getLang } from './i18n.js';

// Verb pieces. [English, French]
const PIECES = {
  na: ['I', 'je'],
  o: ['you', 'tu'],
  a: ['he / she', 'il / elle'],
  e: ['it', 'ça'],
  to: ['we', 'nous'],
  bo: ['you all (or respectful you)', 'vous'],
  ba: ['they', 'ils / elles'],
  inf: ['to … (infinitive)', 'infinitif'],
  fut: ['will (future)', 'futur'],
  an: ['each other', 'l’un l’autre'],
  i: ['done / now', 'accompli / état'],
  aki: ['past (earlier)', 'passé'],
  aka: ['usually', 'habituellement'],
  wish: ['let’s / may', 'que… (souhait)'],
  cmd: ['command', 'impératif'],
};
const SUBJECTS = new Set(['na', 'o', 'a', 'e', 'to', 'bo', 'ba']);

// Verbs by infinitive: [stem, English, French]
const VERBS = {
  kozala: ['zal', 'be', 'être'],
  kolinga: ['ling', 'want, love', 'vouloir, aimer'],
  kosala: ['sal', 'do, work', 'faire, travailler'],
  kokende: ['kend', 'go', 'aller'],
  koya: ['y', 'come', 'venir'],
  kolia: ['li', 'eat', 'manger'],
  komɛla: ['mɛl', 'drink', 'boire'],
  kolala: ['lal', 'sleep', 'dormir'],
  koloba: ['lob', 'speak, say', 'parler, dire'],
  koyeba: ['yeb', 'know', 'savoir'],
  kosomba: ['somb', 'buy', 'acheter'],
  koyekola: ['yekol', 'learn', 'apprendre'],
  kotala: ['tal', 'look at, visit', 'regarder, rendre visite'],
  kotambola: ['tambol', 'walk', 'marcher'],
  kobanga: ['bang', 'fear', 'avoir peur'],
  kobɛla: ['bɛl', 'be ill', 'être malade'],
  kosakana: ['sakan', 'play, joke', 'jouer, plaisanter'],
  kokoka: ['kok', 'be able, be enough', 'pouvoir, suffire'],
  kokoma: ['kom', 'arrive, become', 'arriver, devenir'],
  kofanda: ['fand', 'sit, live', 's’asseoir, habiter'],
  kouta: ['ut', 'come from', 'venir de'],
  kozonga: ['zong', 'return', 'revenir'],
  kolɛmba: ['lɛmb', 'get tired', 'se fatiguer'],
  kosepela: ['sepel', 'be happy', 'se réjouir'],
  kososola: ['sosol', 'understand', 'comprendre'],
  kosɛnga: ['sɛng', 'ask for', 'demander'],
  kobonga: ['bong', 'be fitting, be fine', 'convenir'],
  kosila: ['sil', 'end, run out', 'finir'],
  kosɛngela: ['sɛngel', 'be necessary', 'falloir'],
  komona: ['mon', 'see', 'voir'],
  kopambola: ['pambol', 'bless', 'bénir'],
  kozela: ['zel', 'wait', 'attendre'],
  kosunga: ['sung', 'help', 'aider'],
  kopesa: ['pes', 'give', 'donner'],
  kotika: ['tik', 'leave, let', 'laisser'],
  kotikala: ['tikal', 'stay', 'rester'],
  kotɛlɛma: ['tɛlɛm', 'stand, stop', 'se lever, s’arrêter'],
  kolimbisa: ['limbis', 'forgive', 'pardonner'],
  kokitisa: ['kitis', 'bring down, lower', 'baisser'],
};

// Irregular stems that already carry the "done" meaning.
const IRREGULAR = {
  lei: ['ate', 'mangé'],
  yei: ['came', 'venu'],
  kei: ['went off', 'parti'],
};

// Lexicon. Plain words: [English, French] (+ plural / singular).
// Verb forms: { v: infinitive, p: 'pieces-separated-by-dashes', en, fr }.
const w = (en, fr, extra) => ({ en, fr, ...extra });
const v = (verb, parts, en, fr) => ({ v: verb, p: parts, en, fr });

const WORDS = {
  // Greetings, small words
  mbote: w('hello', 'bonjour'),
  na: w('with / and / in / to', 'avec / et / à / dans', { many: true }),
  ya: w('of', 'de'),
  te: w('not / no', 'ne… pas / non'),
  ee: w('yes', 'oui'),
  iyo: w('yes', 'oui'),
  malamu: w('good, well', 'bien, bon'),
  mingi: w('a lot, very', 'beaucoup, très'),
  moke: w('a little, small', 'un peu, petit'),
  makasi: w('strong, hard, too much', 'fort, dur, trop'),
  mabe: w('bad', 'mauvais, mal'),
  kitoko: w('beautiful', 'beau, belle'),
  elengi: w('delicious, sweet', 'délicieux, doux'),
  lisusu: w('again, more', 'encore'),
  malembe: w('slowly, gently', 'doucement'),
  kaka: w('just, only', 'juste, seulement'),
  bongo: w('like that, so', 'comme ça, donc'),
  solo: w('truth', 'vérité'),
  elongo: w('together', 'ensemble'),
  nyonso: w('all, every', 'tout, chaque'),
  oyo: w('this', 'ce, ceci'),
  mpo: w('for, because', 'pour'),
  matondo: w('thank you', 'merci'),
  merci: w('thanks (French)', 'merci (du français)'),
  pardon: w('please, excuse me (French)', 'pardon (du français)'),
  ah: w('ah', 'ah'),
  bon: w('well (French)', 'bon (du français)'),

  // Pronouns
  ngai: w('I, me', 'je, moi'),
  yo: w('you (one person)', 'toi'),
  ye: w('he, she, him, her', 'il, elle, lui'),
  biso: w('we, us', 'nous'),
  bino: w('you all', 'vous'),
  bango: w('they, them', 'ils, elles, eux'),

  // Questions
  boni: w('how? how much?', 'comment ? combien ?'),
  nini: w('what', 'quoi'),
  nani: w('who', 'qui'),
  wapi: w('where', 'où'),
  ndenge: w('way, manner', 'manière, façon'),
  ntango: w('time, moment', 'temps, moment'),

  // Places and time
  awa: w('here', 'ici'),
  kuna: w('there', 'là-bas'),
  mosika: w('far', 'loin'),
  pene: w('near', 'près'),
  liboso: w('in front, first', 'devant, d’abord'),
  lelo: w('today', 'aujourd’hui'),
  lobi: w('yesterday / tomorrow', 'hier / demain'),
  sikoyo: w('now', 'maintenant'),
  sikawa: w('now', 'maintenant'),
  ntongo: w('morning', 'matin'),
  mpokwa: w('evening', 'soir'),
  butu: w('night', 'nuit'),
  mokolo: w('day', 'jour', { pl: 'mikolo' }),
  ngonga: w('hour, bell', 'heure, cloche'),
  mbula: w('year (also: rain)', 'année (aussi : pluie)'),
  ndako: w('house', 'maison', { pl: 'ndako' }),
  zando: w('market', 'marché'),
  mboka: w('country, hometown', 'pays, village'),
  mosala: w('work, job', 'travail', { pl: 'misala' }),
  motuka: w('car', 'voiture', { pl: 'mituka' }),
  kinshasa: w('Kinshasa', 'Kinshasa'),
  amerika: w('America', 'Amérique'),
  lingala: w('Lingala', 'lingala'),

  // People
  moto: w('person', 'personne', { pl: 'bato' }),
  bato: w('people', 'gens', { sg: 'moto' }),
  mwana: w('child', 'enfant', { pl: 'bana' }),
  bana: w('children', 'enfants', { sg: 'mwana' }),
  mama: w('mother, ma’am', 'mère, madame', { pl: 'bamama' }),
  tata: w('father, sir', 'père, monsieur', { pl: 'batata' }),
  papa: w('dad, sir', 'papa, monsieur'),
  ndeko: w('sibling, relative, “bro”', 'frère, sœur, proche', { pl: 'bandeko' }),
  yaya: w('older sibling', 'aîné(e)'),
  leki: w('younger sibling', 'cadet(te)'),
  moninga: w('friend', 'ami(e)', { pl: 'baninga' }),
  mobali: w('man, husband', 'homme, mari', { pl: 'babali' }),
  mwasi: w('woman, wife', 'femme', { pl: 'basi' }),
  nkoko: w('grandparent', 'grand-parent', { pl: 'bankoko' }),
  molakisi: w('teacher', 'enseignant(e)', { pl: 'balakisi' }),
  libota: w('family', 'famille', { pl: 'mabota' }),
  mundele: w('white person, foreigner', 'Blanc, étranger', { pl: 'mindele' }),
  nzambe: w('God', 'Dieu'),
  maria: w('Maria (a name)', 'Maria (prénom)'),
  nkombo: w('name', 'nom'),

  // Things, food, feelings
  likambo: w('matter, problem', 'affaire, problème', { pl: 'makambo' }),
  eloko: w('thing', 'chose', { pl: 'biloko' }),
  sango: w('news', 'nouvelles'),
  ntalo: w('price', 'prix'),
  mbongo: w('money', 'argent'),
  falanga: w('money (street word)', 'argent (argot)'),
  mai: w('water', 'eau'),
  lipa: w('bread', 'pain'),
  mbisi: w('fish', 'poisson'),
  nsoso: w('chicken', 'poulet'),
  nyama: w('meat, animal', 'viande, animal'),
  loso: w('rice', 'riz'),
  pondu: w('cassava leaves', 'feuilles de manioc'),
  madesu: w('beans', 'haricots'),
  makemba: w('plantains', 'bananes plantains'),
  nzala: w('hunger', 'faim'),
  esengo: w('joy', 'joie'),
  kiadi: w('sadness, pity', 'tristesse'),
  nkanda: w('anger (also: letter, book)', 'colère (aussi : lettre, livre)'),
  bolingo: w('love', 'amour'),
  motema: w('heart', 'cœur', { pl: 'mitema' }),

  // Numbers
  moko: w('one', 'un'),
  mibale: w('two', 'deux'),
  misato: w('three', 'trois'),
  minei: w('four', 'quatre'),
  mitano: w('five', 'cinq'),
  motoba: w('six', 'six'),
  nsambo: w('seven', 'sept'),
  mwambe: w('eight', 'huit'),
  libwa: w('nine', 'neuf'),
  zomi: w('ten', 'dix'),

  // Infinitives
  kolia: v('kolia', 'ko-li-a', 'to eat', 'manger'),
  komela: v('komɛla', 'ko-mɛl-a', 'to drink', 'boire'),
  kokende: v('kokende', 'ko-kend-e', 'to go', 'aller'),
  koya: v('koya', 'ko-y-a', 'to come', 'venir'),
  kosala: v('kosala', 'ko-sal-a', 'to do, to work', 'faire, travailler'),
  kolala: v('kolala', 'ko-lal-a', 'to sleep', 'dormir'),
  koloba: v('koloba', 'ko-lob-a', 'to speak', 'parler'),
  koyeba: v('koyeba', 'ko-yeb-a', 'to know', 'savoir'),
  kolinga: v('kolinga', 'ko-ling-a', 'to love, to want', 'aimer, vouloir'),
  kosomba: v('kosomba', 'ko-somb-a', 'to buy', 'acheter'),
  koyekola: v('koyekola', 'ko-yekol-a', 'to learn', 'apprendre'),
  kotala: v('kotala', 'ko-tal-a', 'to look at, to visit', 'regarder, rendre visite'),
  kotambola: v('kotambola', 'ko-tambol-a', 'to walk', 'marcher'),
  kobanga: v('kobanga', 'ko-bang-a', 'to be afraid', 'avoir peur'),
  kobela: v('kobɛla', 'ko-bɛl-a', 'to be ill', 'être malade'),
  kosakana: v('kosakana', 'ko-sakan-a', 'to play, to joke', 'jouer, plaisanter'),

  // kozala: to be
  nazali: v('kozala', 'na-zal-i', 'I am', 'je suis'),
  ozali: v('kozala', 'o-zal-i', 'you are', 'tu es'),
  azali: v('kozala', 'a-zal-i', 'he / she is', 'il / elle est'),
  ezali: v('kozala', 'e-zal-i', 'it is', 'c’est'),
  tozali: v('kozala', 'to-zal-i', 'we are', 'nous sommes'),
  bozali: v('kozala', 'bo-zal-i', 'you (all) are', 'vous êtes'),
  bazali: v('kozala', 'ba-zal-i', 'they are', 'ils / elles sont'),

  // Other verb forms
  nalingi: v('kolinga', 'na-ling-i', 'I want, I love', 'je veux, j’aime'),
  olingi: v('kolinga', 'o-ling-i', 'you want', 'tu veux'),
  tolingi: v('kolinga', 'to-ling-i', 'we want', 'nous voulons'),
  nalingaki: v('kolinga', 'na-ling-aki', 'I wanted', 'je voulais'),
  nasali: v('kosala', 'na-sal-i', 'I’ve done (it)', 'j’ai fait'),
  nasalaki: v('kosala', 'na-sal-aki', 'I did (earlier)', 'j’ai fait (avant)'),
  nakosala: v('kosala', 'na-ko-sal-a', 'I will do', 'je ferai'),
  nasalaka: v('kosala', 'na-sal-aka', 'I usually do', 'je fais d’habitude'),
  okosala: v('kosala', 'o-ko-sal-a', 'you will do', 'tu feras'),
  osalaki: v('kosala', 'o-sal-aki', 'you did', 'tu as fait'),
  tosalaki: v('kosala', 'to-sal-aki', 'we did, we worked', 'nous avons travaillé'),
  basalaka: v('kosala', 'ba-sal-aka', 'they usually work', 'ils travaillent d’habitude'),
  nakende: v('kokende', 'na-kend-e', '(that) I go', '(que) j’aille'),
  tokende: v('kokende', 'to-kend-e', 'let’s go', 'allons-y'),
  nakokende: v('kokende', 'na-ko-kend-e', 'I will go', 'j’irai'),
  nakendaki: v('kokende', 'na-kend-aki', 'I went', 'je suis allé(e)'),
  nakei: v('kokende', 'na-kei', 'I’m off', 'je m’en vais'),
  nakoya: v('koya', 'na-ko-y-a', 'I will come', 'je viendrai'),
  akoya: v('koya', 'a-ko-y-a', 'he / she will come', 'il / elle viendra'),
  nayei: v('koya', 'na-yei', 'I have come', 'je suis venu(e)'),
  oyei: v('koya', 'o-yei', 'you have come', 'tu es venu(e)'),
  boyei: v('koya', 'bo-yei', 'you (all) have come', 'vous êtes venus'),
  olei: v('kolia', 'o-lei', 'you have eaten', 'tu as mangé'),
  nalei: v('kolia', 'na-lei', 'I have eaten', 'j’ai mangé'),
  tokolia: v('kolia', 'to-ko-li-a', 'we will eat', 'nous mangerons'),
  tokomonana: v('komona', 'to-ko-mon-an-a', 'we will see each other', 'nous nous reverrons'),
  nalobi: v('koloba', 'na-lob-i', 'I speak, I said', 'je parle, j’ai dit'),
  olobi: v('koloba', 'o-lob-i', 'you speak, you said', 'tu parles, tu as dit'),
  nayebi: v('koyeba', 'na-yeb-i', 'I know', 'je sais'),
  nakoki: v('kokoka', 'na-kok-i', 'I can', 'je peux'),
  okoki: v('kokoka', 'o-kok-i', 'you can', 'tu peux'),
  ekoki: v('kokoka', 'e-kok-i', 'it’s enough', 'ça suffit'),
  nakomi: v('kokoma', 'na-kom-i', 'I’ve arrived', 'je suis arrivé(e)'),
  okomi: v('kokoma', 'o-kom-i', 'you’ve arrived', 'tu es arrivé(e)'),
  nafandi: v('kofanda', 'na-fand-i', 'I live', 'j’habite'),
  ofandi: v('kofanda', 'o-fand-i', 'you live', 'tu habites'),
  nauti: v('kouta', 'na-ut-i', 'I come from', 'je viens de'),
  outi: v('kouta', 'o-ut-i', 'you come from', 'tu viens de'),
  nakozonga: v('kozonga', 'na-ko-zong-a', 'I will come back', 'je reviendrai'),
  nalembi: v('kolɛmba', 'na-lɛmb-i', 'I’m tired', 'je suis fatigué(e)'),
  olembi: v('kolɛmba', 'o-lɛmb-i', 'you’re tired', 'tu es fatigué(e)'),
  nasepeli: v('kosepela', 'na-sepel-i', 'I’m happy', 'je suis content(e)'),
  nasosoli: v('kososola', 'na-sosol-i', 'I understand', 'je comprends'),
  nasengi: v('kosɛnga', 'na-sɛng-i', 'I ask (please)', 'je demande (s’il te plaît)'),
  nabangi: v('kobanga', 'na-bang-i', 'I’m scared', 'j’ai peur'),
  nayekolaka: v('koyekola', 'na-yekol-aka', 'I usually study', 'j’étudie d’habitude'),
  ebongi: v('kobonga', 'e-bong-i', 'it’s fine, that works', 'ça va, ça convient'),
  esili: v('kosila', 'e-sil-i', 'it’s finished', 'c’est fini'),
  esengeli: v('kosɛngela', 'e-sɛngel-i', 'it is necessary', 'il faut'),
  apambola: v('kopambola', 'a-pambol-a', 'may (he) bless', 'qu’il bénisse'),

  // Commands
  kende: v('kokende', 'kend-e', 'go!', 'va !'),
  tikala: v('kotikala', 'tikal-a', 'stay!', 'reste !'),
  limbisa: v('kolimbisa', 'limbis-a', 'forgive!', 'pardonne !'),
  loba: v('koloba', 'lob-a', 'speak! say!', 'parle ! dis !'),
  zela: v('kozela', 'zel-a', 'wait!', 'attends !'),
  sunga: v('kosunga', 'sung-a', 'help!', 'aide !'),
  kitisa: v('kokitisa', 'kitis-a', 'lower!', 'baisse !'),
  pesa: v('kopesa', 'pes-a', 'give!', 'donne !'),
  telema: v('kotɛlɛma', 'tɛlɛm-a', 'stop! stand!', 'arrête-toi ! lève-toi !'),
  tika: v('kotika', 'tik-a', 'leave! let!', 'laisse !'),
  yaka: w('come! (command form of koya)', 'viens ! (impératif de koya)'),
};

const PRONOUNS = new Set(['ngai', 'yo', 'ye', 'biso', 'bino', 'bango']);
const BE = 'kozala';

const pick = (pair) => (getLang() === 'fr' ? pair[1] : pair[0]);

// Look a word up in the lexicon (accents optional, ɛ/ɔ or e/o both fine).
export const lookup = (word) => WORDS[normalize(word)] ?? null;

// The pieces of a verb form, each with a short gloss.
function pieces(entry) {
  const parts = entry.p.split('-');
  const stem = VERBS[entry.v]?.[0];
  const out = [];
  let hasSubject = false;
  parts.forEach((part, i) => {
    let key = null;
    if (i === 0 && SUBJECTS.has(part) && parts.length > 1 && part !== stem) {
      key = part;
      hasSubject = true;
    } else if (part === 'ko' && i === 0) key = 'inf';
    else if (part === 'ko') key = 'fut';
    else if (part === 'an') key = 'an';
    else if (IRREGULAR[part]) return out.push({ m: part, g: pick(IRREGULAR[part]), kind: 'stem' });
    else if (part === stem) return out.push({ m: part, g: pick(VERBS[entry.v].slice(1)), kind: 'stem' });
    else if (i === parts.length - 1) {
      const infinitive = parts[0] === 'ko';
      const future = parts.includes('ko') && !infinitive;
      if (part === 'i') key = 'i';
      else if (part === 'aki') key = 'aki';
      else if (part === 'aka') key = 'aka';
      else if (infinitive || future) return out.push({ m: part, g: '', kind: 'end' });
      else key = hasSubject ? 'wish' : 'cmd';
    }
    out.push({ m: part, g: key ? pick(PIECES[key]) : '', kind: key && SUBJECTS.has(key) ? 'subject' : 'piece' });
  });
  return out;
}

const tokens = (text) =>
  String(text)
    .split(/\s+/)
    .map((raw) => raw.replace(/^[^\p{L}]+|[^\p{L}́]+$/gu, ''))
    .filter(Boolean);

// Breakdown of a phrase: one entry per word, plus the grammar patterns it uses.
export function breakdown(text) {
  const words = tokens(text).map((raw) => {
    const e = lookup(raw);
    if (!e) return { word: raw, gloss: null };
    const word = { word: raw, gloss: getLang() === 'fr' ? e.fr : e.en, many: !!e.many };
    if (e.p) {
      word.pieces = pieces(e);
      word.verb = e.v;
      word.verbGloss = VERBS[e.v] ? pick(VERBS[e.v].slice(1)) : null;
    }
    if (e.pl) word.plural = e.pl;
    if (e.sg) word.singular = e.sg;
    return word;
  });
  return { words, patterns: patterns(words) };
}

// Grammar patterns worth pointing out (keys into the i18n strings bd.pat.*).
function patterns(words) {
  const keys = new Set();
  const n = words.map((w) => normalize(w.word));
  words.forEach((w, i) => {
    const next = words[i + 1];
    if (w.verb === BE && next?.verb && n[i + 1].startsWith('ko')) keys.add('prog');
    else if (w.verb && !n[i].startsWith('ko') && next?.verb && n[i + 1].startsWith('ko')) keys.add('chain');
    if (w.verb === BE && n[i + 1] === 'na') keys.add('have');
    if (n[i] === 'na' && i > 0 && PRONOUNS.has(n[i + 1]) && !words[i - 1].verb) keys.add('poss');
    if (i === 0 && n[i].startsWith('ko') && w.verb && n[i + 1] === 'te') keys.add('dont');
    if (w.pieces?.[0]?.m === 'bo' || n[i] === 'bino') keys.add('respect');
    if (w.pieces?.some((p) => p.m === 'an')) keys.add('each');
  });
  if (n.length > 1 && n.at(-1) === 'te' && !keys.has('dont')) keys.add('neg');
  return [...keys];
}

// Words of a phrase that the lexicon doesn't know (used by the tests).
export const unknownWords = (text) => tokens(text).filter((t) => !lookup(t));
