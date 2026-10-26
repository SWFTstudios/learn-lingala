// Simple multiple-choice quiz engine for Learn Lingala lesson pages.

const QUIZZES = {
  alphabet: [
    {
      q: 'How many vowels does Lingala have?',
      options: ['5', '6', '7', '9'],
      answer: 2,
      note: 'Seven: a, e, ɛ, i, o, ɔ, u.',
    },
    {
      q: 'How is the vowel "ɔ" pronounced?',
      options: ['Like "o" in go', 'Like "aw" in law', 'Like "oo" in food', 'Like "a" in father'],
      answer: 1,
      note: 'ɔ is the open "o" — as in "law". Plain o is closed, as in "go".',
    },
    {
      q: 'How do you pronounce the start of "mbote"?',
      options: [
        '"em-bo-te" — three syllables starting with "em"',
        '"bo-te" — the m is silent',
        '"mbo-te" — m and b together in one beat',
        '"om-bo-te"',
      ],
      answer: 2,
      note: 'Prenasalized pairs like mb count as a single sound: mbo-te.',
    },
    {
      q: 'What does "mbisi" mean?',
      options: ['Bread', 'Fish', 'Water', 'House'],
      answer: 1,
      note: 'mbisi = fish. Lipa = bread, mai = water, ndako = house.',
    },
    {
      q: 'Lingala spelling is…',
      options: [
        'Irregular — words often sound different from how they are written',
        'Phonetic — words are pronounced exactly as written',
        'Written only in a special script',
        'Different in every region',
      ],
      answer: 1,
      note: 'Once you know the sounds, you can read any Lingala word.',
    },
  ],

  sentences: [
    {
      q: 'What word order does Lingala use?',
      options: ['Verb – Subject – Object', 'Subject – Object – Verb', 'Subject – Verb – Object', 'Object – Verb – Subject'],
      answer: 2,
      note: 'Same as English: Nalingi lipa = I want bread.',
    },
    {
      q: 'Which prefix means "we"?',
      options: ['na-', 'ba-', 'bo-', 'to-'],
      answer: 3,
      note: 'to- = we: tolingi = we want. (na- I, o- you, a- he/she, bo- you all, ba- they)',
    },
    {
      q: 'How do you say "They speak Lingala"?',
      options: ['Nalobi Lingala', 'Balobi Lingala', 'Tolobi Lingala', 'Olobi Lingala'],
      answer: 1,
      note: 'ba- (they) + lob (speak) + -i → Balobi Lingala.',
    },
    {
      q: 'How do you turn "Nalingi lipa" (I want bread) into "I don\'t want bread"?',
      options: [
        'Te nalingi lipa',
        'Nalingi te lipa',
        'Nalingi lipa te',
        'Na te lingi lipa',
      ],
      answer: 2,
      note: 'Negation: put "te" at the very end of the sentence.',
    },
    {
      q: 'What does "Ozali malamu?" mean?',
      options: ['Where are you?', 'Are you well?', 'What do you want?', 'Do you speak Lingala?'],
      answer: 1,
      note: 'o- (you) + zali (are) + malamu (well) — the standard "how are you?"',
    },
    {
      q: 'Which pronoun means "they / them"?',
      options: ['biso', 'bino', 'bango', 'ngai'],
      answer: 2,
      note: 'bango = they/them. biso = we, bino = you all, ngai = I/me.',
    },
  ],
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initQuiz(root) {
  const questions = shuffle(QUIZZES[root.dataset.quiz] || []);
  if (!questions.length) return;

  let index = 0;
  let score = 0;

  function renderQuestion() {
    const q = questions[index];
    root.innerHTML = '';

    const progress = document.createElement('div');
    progress.className = 'quiz-progress';
    progress.textContent = `Question ${index + 1} of ${questions.length}`;

    const question = document.createElement('div');
    question.className = 'quiz-question';
    question.textContent = q.q;

    const options = document.createElement('div');
    options.className = 'quiz-options';

    const feedback = document.createElement('div');
    feedback.className = 'quiz-feedback';

    q.options.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        options.querySelectorAll('button').forEach((b) => (b.disabled = true));
        options.children[q.answer].classList.add('correct');
        if (i === q.answer) {
          score++;
          feedback.textContent = `Malamu! (Good!) ${q.note}`;
          feedback.classList.add('good');
        } else {
          btn.classList.add('wrong');
          feedback.textContent = q.note;
          feedback.classList.add('bad');
        }
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'quiz-next';
        next.textContent = index + 1 < questions.length ? 'Next →' : 'See score';
        next.addEventListener('click', () => {
          index++;
          index < questions.length ? renderQuestion() : renderScore();
        });
        root.appendChild(next);
        next.focus();
      });
      options.appendChild(btn);
    });

    root.append(progress, question, options, feedback);
  }

  function renderScore() {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'quiz-score';

    const big = document.createElement('div');
    big.className = 'big';
    big.textContent = `${score} / ${questions.length}`;

    const msg = document.createElement('p');
    msg.textContent =
      score === questions.length
        ? 'Malamu mingi! Perfect score!'
        : score >= questions.length / 2
          ? 'Malamu! Nice work — review the lesson and try again for a perfect score.'
          : 'Keep going! Re-read the lesson above and try again.';

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'quiz-next';
    retry.textContent = 'Try again';
    retry.addEventListener('click', () => {
      index = 0;
      score = 0;
      renderQuestion();
    });

    wrap.append(big, msg, retry);
    root.appendChild(wrap);
  }

  renderQuestion();
}

document.querySelectorAll('[data-quiz]').forEach(initQuiz);
