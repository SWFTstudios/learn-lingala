// Interactive homepage: live sentence builder + flip flashcards.

// --- Sentence builder -------------------------------------------------------

const SUBJECTS = [
  { prefix: 'na', en: 'I', enNeg: "I don't", third: false },
  { prefix: 'o', en: 'You', enNeg: "You don't", third: false },
  { prefix: 'a', en: 'He/She', enNeg: "He/She doesn't", third: true },
  { prefix: 'to', en: 'We', enNeg: "We don't", third: false },
  { prefix: 'bo', en: 'You all', enNeg: "You all don't", third: false },
  { prefix: 'ba', en: 'They', enNeg: "They don't", third: true },
];

// Each verb: infinitive, stem, base English, 3rd-person-singular English,
// and the objects that make sense with it.
const VERBS = [
  {
    inf: 'kolinga', stem: 'ling', en: 'want', en3: 'wants',
    objects: [
      { lg: 'lipa', en: 'bread' },
      { lg: 'mai', en: 'water' },
      { lg: 'mbisi', en: 'fish' },
      { lg: 'yo', en: 'you' },
    ],
  },
  {
    inf: 'koloba', stem: 'lob', en: 'speak', en3: 'speaks',
    objects: [
      { lg: 'Lingála', en: 'Lingala' },
      { lg: 'Falansé', en: 'French' },
    ],
  },
  {
    inf: 'koyeba', stem: 'yeb', en: 'know', en3: 'knows',
    objects: [
      { lg: 'Lingála', en: 'Lingala' },
      { lg: 'nzela', en: 'the way' },
      { lg: 'ye', en: 'him/her' },
    ],
  },
  {
    inf: 'komona', stem: 'mon', en: 'see', en3: 'sees',
    objects: [
      { lg: 'ndako', en: 'the house' },
      { lg: 'mwana', en: 'the child' },
      { lg: 'ye', en: 'him/her' },
    ],
  },
  {
    inf: 'komɛla', stem: 'mɛl', en: 'drink', en3: 'drinks',
    objects: [
      { lg: 'mai', en: 'water' },
      { lg: 'kafe', en: 'coffee' },
    ],
  },
];

function initBuilder() {
  const subjectSel = document.getElementById('b-subject');
  const verbSel = document.getElementById('b-verb');
  const objectSel = document.getElementById('b-object');
  const negateBtn = document.getElementById('b-negate');
  if (!subjectSel) return;

  let negated = false;

  SUBJECTS.forEach((s, i) => {
    subjectSel.add(new Option(`${s.en} (${s.prefix}-)`, i));
  });
  VERBS.forEach((v, i) => {
    verbSel.add(new Option(`${v.inf} — to ${v.en}`, i));
  });

  function fillObjects() {
    const verb = VERBS[verbSel.value];
    objectSel.innerHTML = '';
    verb.objects.forEach((o, i) => {
      objectSel.add(new Option(`${o.lg} — ${o.en}`, i));
    });
  }

  function render() {
    const s = SUBJECTS[subjectSel.value];
    const v = VERBS[verbSel.value];
    const o = v.objects[objectSel.value];

    const verbForm = s.prefix + v.stem + 'i';
    const capitalized = verbForm.charAt(0).toUpperCase() + verbForm.slice(1);
    const sentence = `${capitalized} ${o.lg}${negated ? ' te' : ''}.`;

    document.getElementById('b-lingala').textContent = sentence;
    document.getElementById('b-breakdown').innerHTML =
      `<span class="chunk chunk-subject">${s.prefix}-</span>` +
      `<span class="chunk chunk-verb">${v.stem}</span>` +
      `<span class="chunk chunk-tense">-i</span>` +
      ` + <span class="chunk chunk-object">${o.lg}</span>` +
      (negated ? ` + <span class="chunk chunk-negate">te</span>` : '');

    const english = negated
      ? `${s.enNeg} ${v.en} ${o.en}.`
      : `${s.en} ${s.third ? v.en3 : v.en} ${o.en}.`;
    document.getElementById('b-english').textContent = english;
  }

  subjectSel.addEventListener('change', render);
  verbSel.addEventListener('change', () => { fillObjects(); render(); });
  objectSel.addEventListener('change', render);
  negateBtn.addEventListener('click', () => {
    negated = !negated;
    negateBtn.classList.toggle('on', negated);
    negateBtn.setAttribute('aria-pressed', String(negated));
    render();
  });

  fillObjects();
  render();
}

// --- Flashcards --------------------------------------------------------------

const CARDS = [
  { lg: 'Mbote', en: 'Hello' },
  { lg: 'Malamu', en: 'Good / well' },
  { lg: 'Matɔ́ndɔ', en: 'Thank you' },
  { lg: 'Ndako', en: 'House' },
  { lg: 'Mai', en: 'Water' },
  { lg: 'Lipa', en: 'Bread' },
  { lg: 'Moto', en: 'Person' },
  { lg: 'Mwana', en: 'Child' },
  { lg: 'Mbisi', en: 'Fish' },
  { lg: 'Nzala', en: 'Hunger' },
  { lg: 'Butú', en: 'Night' },
  { lg: 'Nalingi yo', en: 'I love you' },
];

function initFlashcards() {
  const wrap = document.getElementById('flashcards');
  if (!wrap) return;

  CARDS.forEach((c) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'flashcard';
    card.setAttribute('aria-label', `Flashcard: ${c.lg}. Activate to reveal the translation.`);
    card.innerHTML =
      `<span class="flashcard-inner">` +
      `<span class="flashcard-face flashcard-front">${c.lg}</span>` +
      `<span class="flashcard-face flashcard-back">${c.en}</span>` +
      `</span>`;
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    wrap.appendChild(card);
  });
}

initBuilder();
initFlashcards();
