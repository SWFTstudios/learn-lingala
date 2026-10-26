// Landing page: sentence builder, hero chat demo, scroll reveals and CTAs.

document.documentElement.classList.add('js');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  SUBJECTS.forEach((s, i) => subjectSel.add(new Option(`${s.en} (${s.prefix}-)`, i)));
  VERBS.forEach((v, i) => verbSel.add(new Option(`${v.inf}: to ${v.en}`, i)));

  function fillObjects() {
    objectSel.innerHTML = '';
    VERBS[verbSel.value].objects.forEach((o, i) => objectSel.add(new Option(`${o.lg}: ${o.en}`, i)));
  }

  function render() {
    const s = SUBJECTS[subjectSel.value];
    const v = VERBS[verbSel.value];
    const o = v.objects[objectSel.value];

    const verbForm = s.prefix + v.stem + 'i';
    const sentence = `${verbForm[0].toUpperCase()}${verbForm.slice(1)} ${o.lg}${negated ? ' te' : ''}.`;

    document.getElementById('b-lingala').textContent = sentence;
    document.getElementById('b-breakdown').innerHTML =
      `<span class="chunk chunk-subject">${s.prefix}-</span>` +
      `<span class="chunk chunk-verb">${v.stem}</span>` +
      `<span class="chunk chunk-tense">-i</span>` +
      ` + <span class="chunk chunk-object">${o.lg}</span>` +
      (negated ? ` + <span class="chunk chunk-negate">te</span>` : '');
    document.getElementById('b-english').textContent = negated
      ? `${s.enNeg} ${v.en} ${o.en}.`
      : `${s.en} ${s.third ? v.en3 : v.en} ${o.en}.`;
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

// --- Hero chat demo: messages appear one by one, then loop -----------------------

function initDemo() {
  const log = document.getElementById('demo-log');
  if (!log || reduceMotion) return;
  const items = [...log.children];
  const typing = log.querySelector('.pc-typing');
  const steps = [700, 1400, 1100, 1600, 1500]; // delay before each item appears
  let timer;

  function play() {
    log.classList.add('play');
    items.forEach((el) => el.classList.remove('in', 'gone'));
    let i = 0;
    const next = () => {
      if (i >= items.length) {
        timer = setTimeout(play, 4500);
        return;
      }
      const el = items[i];
      // Show a typing indicator before each of Mama Nzeba's replies after the first.
      if (el.classList.contains('them') && i > 0) {
        typing.classList.add('in');
        log.append(typing);
        timer = setTimeout(() => {
          typing.classList.remove('in');
          el.classList.add('in');
          i++;
          timer = setTimeout(next, steps[i] ?? 1200);
        }, 1100);
        return;
      }
      if (el === typing) {
        // Leave the typing dots at the end, as if she's about to answer again.
        el.classList.add('in');
        log.append(el);
        i++;
        timer = setTimeout(next, 3000);
        return;
      }
      el.classList.add('in');
      i++;
      timer = setTimeout(next, steps[i] ?? 1200);
    };
    timer = setTimeout(next, steps[0]);
  }

  // Only animate while the phone is on screen.
  new IntersectionObserver(([entry]) => {
    clearTimeout(timer);
    if (entry.isIntersecting) play();
  }).observe(log);
}

// --- Scroll effects --------------------------------------------------------------

function initScroll() {
  const nav = document.getElementById('nav');
  const sticky = document.getElementById('sticky-cta');
  const hero = document.querySelector('.hero');
  const final = document.querySelector('.final');
  let heroVisible = true;
  let finalVisible = false;

  const update = () => sticky.classList.toggle('show', !heroVisible && !finalVisible);
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); }, { rootMargin: '-40% 0px 0px 0px' }).observe(hero);
  new IntersectionObserver(([e]) => { finalVisible = e.isIntersecting; update(); }).observe(final);

  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('seen'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      // Stagger siblings that come into view together.
      const siblings = [...e.target.parentElement.children].filter((c) => c.classList.contains('reveal'));
      e.target.style.transitionDelay = `${Math.min(siblings.indexOf(e.target), 5) * 60}ms`;
      e.target.classList.add('seen');
      io.unobserve(e.target);
    }),
    { rootMargin: '0px 0px -8% 0px' },
  );
  reveals.forEach((el) => io.observe(el));
}

// --- Returning learners: "Continue" instead of "Start" ---------------------------

function initReturning() {
  let state;
  try {
    state = JSON.parse(localStorage.getItem('ll-state-v1'));
  } catch {
    return;
  }
  if (!state || !(state.user || Object.keys(state.cards || {}).length)) return;
  document.querySelectorAll('[data-start]').forEach((a) => {
    const arrow = a.querySelector('[aria-hidden]');
    a.textContent = a.closest('.nav') ? 'Open app' : 'Continue learning ';
    if (arrow && !a.closest('.nav')) a.append(arrow);
  });
  if (state.user) document.querySelectorAll('.nav [data-signin]').forEach((a) => a.remove());
}

initBuilder();
initDemo();
initScroll();
initReturning();
