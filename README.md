# learn-lingala

Learn Lingala at any level — a free, open-source web platform for learning Lingala,
starting from the very basics.

## What's here so far

All pages live in `public/`:

- **Home page** (`index.html`) — introduction and lesson index
- **Lesson 1: The Alphabet & Sounds** (`alphabet.html`) — the 7 vowels (including ɛ and ɔ),
  consonants, and prenasalized pairs (mb, mp, nd, ng, nk, ns, nt, nz, ny), each with
  pronunciation guides and example words, plus a practice quiz
- **Lesson 2: Basic Sentence Structure** (`sentences.html`) — SVO word order, pronouns,
  subject prefixes (na-, o-, a-, to-, bo-, ba-), the present tense, negation with *te*,
  and simple questions, plus a practice quiz

## Running locally

It's a plain static site — no build step, no dependencies:

```bash
python3 -m http.server 8000 --directory public
# then visit http://localhost:8000
```

## Deploying

Deploys to Cloudflare Workers as a static site — `wrangler.jsonc` points at `public/`,
and the deploy command is just:

```bash
npx wrangler deploy
```

It also works on GitHub Pages, Netlify, Vercel, or any static host — serve the
`public/` folder.

## Roadmap

- Greetings & everyday phrases
- Numbers, days, and time
- Core vocabulary with spaced-repetition flashcards
- Audio recordings by native speakers
