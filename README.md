# learn-lingala

Learn Lingala at any level — a free, open-source web platform for learning Lingala,
starting from the very basics.

## What's here so far

- **Home page** (`index.html`) — introduction and lesson index
- **Lesson 1: The Alphabet & Sounds** (`alphabet.html`) — the 7 vowels (including ɛ and ɔ),
  consonants, and prenasalized pairs (mb, mp, nd, ng, nk, ns, nt, nz, ny), each with
  pronunciation guides and example words, plus a practice quiz
- **Lesson 2: Basic Sentence Structure** (`sentences.html`) — SVO word order, pronouns,
  subject prefixes (na-, o-, a-, to-, bo-, ba-), the present tense, negation with *te*,
  and simple questions, plus a practice quiz

## Running locally

It's a plain static site — no build step, no dependencies. Either open `index.html`
directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying

Works as-is on GitHub Pages (Settings → Pages → deploy from branch), Netlify,
Vercel, or any static host.

## Roadmap

- Greetings & everyday phrases
- Numbers, days, and time
- Core vocabulary with spaced-repetition flashcards
- Audio recordings by native speakers
