# learn-lingala

Learn Lingala at any level: a free, mobile-first learning app built on Cloudflare.

- **`/app/`** is the learning app: bite-sized lessons, spaced-repetition reviews, streaks, accounts and progress sync.
- **`/`** is the marketing landing page ([`index.html`](public/index.html), `landing.css`, `landing.js`): who it's for, how it works, features, the 5-level path, a comparison, FAQ and a live sentence builder. Every call to action opens the app (returning learners see "Continue learning").
- **`/alphabet`** and **`/sentences`** are free reference guides.

## The path to conversational

Five levels, loosely mapped to the CEFR scale, each with "can-do" goals. The course is built for someone heading to Kinshasa who wants to hold real conversations, then sound local.

| Level | Focus | CEFR | Units |
| --- | --- | --- | --- |
| 1 · **Arrive** | Survival Lingala | A0 → A1 | Greetings · Survival phrases · Me & you · Numbers & money |
| 2 · **Get around** | Food, taxis & directions | A1 | Food & drink · Getting around · Time & places · Questions |
| 3 · **Daily life** | Family, actions & feelings | A1 → A2 | Family & people · Action verbs · Wants, can & "not" · Feelings |
| 4 · **Conversations** | Past, plans & small talk | A2 → B1 | Past, present & future · About you · Plans & invitations |
| 5 · **Mwana mboka** | Sound like a local | B1 | Reactions & fillers · Kinshasa street talk · Respect & blessings |

18 units, 227 phrases, 11 real-life dialogues (neighbour, market, taxi, a meal, the phone, a wedding, catching up with a friend, greeting an elder…), 30 pattern drills, and 34 expressions marked **Sounds local**.

- **Level checkpoints:** a mixed test with no hints. Score 80% to earn the level, or to *test out* of a level you already know (its phrases are added to your reviews).
- **Pace estimate:** the home screen shows when you'll finish Level 4 at your daily goal.
- **Phrasebook:** every phrase, searchable in English or Lingala, with a "Sounds local" filter. Handy on a trip.
- **Live chat practice:** text in real time with Claude-powered Lingala speakers (see below).
- **Translate & dictionary:** type, or speak in your own language, to get the Lingala. Course matches show instantly (verified, works offline); an AI translation adds alternatives, a word-by-word breakdown and an example.
- **Your language:** onboarding asks which language you speak. The whole app (interface, all 227 meanings, grammar notes, dialogues, chat feedback, translations) works in **English** or **French**, and you can switch any time in your profile.

## Design

A premium, app-like interface on every screen size:

- **Phones:** sticky top bar with streak and XP, bottom tab bar (Learn, Review, Chat, Translate, Profile), full-screen lessons with a thumb-reachable answer bar.
- **Desktop:** sidebar navigation, a centred content column, and a right panel with the daily-goal ring, streak week and the 5-level path.
- Type: **Unbounded** for headlines, numbers and the wordmark, **Onest** for everything else. Both are self-hosted variable fonts, and both include ɛ, ɔ and correctly placed tone marks (few fonts do: check any replacement with the Lingala test phrase *Matɔ́ndɔ mingi*).
- Colour: crisp cool neutrals, an emerald brand colour, an electric-lime accent on deep-green "stage" panels (landing hero, the app's Continue card, chat), gold for streaks. A custom SVG icon set, light and dark modes, and reduced-motion support.
- **Onboarding:** pick your language, why you're learning, a daily goal, and whether to start from zero or test out of Level 1.

## Live chat practice

The **Chat** tab is a text conversation with a Lingala speaker in character: Mama Nzeba the neighbour, a market seller, a taxi driver, a cousin, a friend from Matonge, a respected elder, or open conversation. Most partners come with a **mission** ("get the plantain price down"), because practising real tasks builds conversation faster than open chat.

Each reply includes:

- the partner's next message in Lingala (tap it for the English);
- feedback on *your* last message: ✓ natural, 👍 a more natural phrasing, or 💡 a correction, with a one-line explanation;
- two or three suggested replies at your level, if you're stuck;
- a check on whether you've completed the mission (+10 XP; each message is +2 XP).

The partner is pitched at your level. The Worker reads the phrases you've learned from D1 and tells the model to build on them, adding at most one or two new words per message.

**How it works:** `POST /api/chat` ([`src/chat.js`](src/chat.js)) calls the Claude API (`claude-opus-5-5`, low effort for quick replies) with a JSON-schema output format, so every reply arrives in the same structure. Server-side refusal fallbacks are on (`fallbacks: "default"`). Scenarios live in [`public/app/js/chat-scenarios.js`](public/app/js/chat-scenarios.js).

**Translation** (`POST /api/translate`, [`src/translate.js`](src/translate.js)) uses the same model and safeguards, capped at 200 translations per learner per day.

**Cost controls:** chat requires an account, is limited to 12 messages a minute per learner, and caps each learner at 150 messages a day (`DAILY_MESSAGE_CAP`). Failed calls don't count. Conversations are stored only on the learner's device and are cleared on sign-out.

> Replies are AI-generated and can contain mistakes. The prompt tells the model to use only Lingala it is confident in and never to invent idioms, but learners should still check anything surprising with a native speaker.

## How the app teaches

Each part of a session follows a finding from language-learning research:

| Technique | In the app |
| --- | --- |
| **Chunks first** | Fluent speakers rely on ready-made phrases ("Likambo te", "Kaka bongo"). The course teaches whole phrases, not just single words. |
| **Pattern drills** | Change one sentence into another (*Nasali → Nakosala*, I → we, yesterday → tomorrow, friend → elder) so you learn the rule, not a list. |
| **Comprehensible input** | Each unit opens with its rule and a real conversation you can read (tap a line for the English). |
| **Role-play** | Choose what *you* would say at each turn of a dialogue, then say your lines out loud. |
| **Retrieval practice** | Every new phrase is tested minutes after it's introduced, never just shown. |
| **Desirable difficulty** | Recognise (multiple choice) → assemble (tiles or pattern drill) → recall (typing) → speak (say it aloud, then self-grade). |
| **Spaced repetition** | An SM-2-style scheduler times reviews for just before you'd forget (1 day → 3 → ~1 week → a month…). |
| **Interleaving** | Lessons mix new phrases, due reviews and production. |
| **Error correction** | A missed question comes back a few steps later in the same session. |
| **Cultural fluency** | "Local tips" cover French code-switching, respect forms for elders (*bo-*/*bino*), and Kinshasa slang. |
| **Habit** | Daily XP goal, streaks, a 7-day chart, and a nudge when reviews are due. |

Typing is forgiving: tone marks are optional, `e`/`o` are accepted for `ɛ`/`ɔ`, and one-letter slips count as right (the correct spelling is still shown).

Content lives in [`public/app/js/course.js`](public/app/js/course.js). An item added there automatically becomes lesson steps, review cards and phrasebook entries. **Never change an existing item `id`**: learners' progress is keyed by it (`npm test` checks the original ids are still there).

> **Content review:** have the Lingala in `course.js`, especially Level 5 (slang and respect forms) and the tone marks, checked by native speakers before promoting the app widely. Usage varies between Kinshasa and Brazzaville.

## Architecture

```
public/            Static assets (Workers Static Assets, served from the edge cache)
  app/             The learning app: vanilla JS modules, no build step
    js/course.js   Course content
    js/srs.js      Spaced-repetition scheduler
    js/lesson.js   Session builder: lessons, reviews, role-plays, checkpoints, pace
    js/player.js   Exercise UI
    js/store.js    Local state + server sync
    js/chat.js     Live chat practice UI
    js/chat-scenarios.js  Chat partners and missions (shared with the Worker)
    js/translate.js  Translate & dictionary page (course search, AI, voice input)
    js/i18n.js     Interface strings (English, French) and localized content helpers
    js/course-fr.js  French layer: meanings, notes, dialogues, levels, scenarios
    js/icons.js    SVG icon set
    fonts/         Self-hosted Onest + Unbounded (SIL Open Font License)
    sw.js          Service worker (offline support, installable PWA)
src/worker.js      API Worker: auth, sessions, progress sync
src/chat.js        Chat endpoint: prompt and conversation rules
src/translate.js   Translate endpoint
src/claude.js      Shared Claude API call: JSON output, refusal fallbacks, errors, daily quotas
migrations/        D1 schema
tests/             Unit tests for the learning logic
```

**Cloudflare features used**

- **Workers + Static Assets**: the site and app are served from Cloudflare's edge. Only `/api/*` requests run the Worker (`run_worker_first`).
- **D1** (`learn-lingala-db`): users, sessions, per-word review state, XP history.
- **Workers Rate Limiting**: 10 sign-in/sign-up attempts per minute per IP, 120 API calls per minute per IP, 12 chat messages and 20 AI translations per minute per learner.
- **Turnstile** (optional): bot protection on sign-up and sign-in (see below).
- **Workers Observability**: logs and traces in the dashboard.

**Accounts & progress**

- Email and password. Passwords are hashed with PBKDF2-SHA256 (100k iterations). Sessions use a random token in an `HttpOnly`, `SameSite=Lax` cookie; only the token's SHA-256 hash is stored.
- Progress is saved to the device first, so the app works offline and without an account. Signing up uploads that guest progress.
- Sync is conflict-safe: for each word the newest review wins, and XP is stored as idempotent events, so retries and multiple devices never double-count.
- CSRF protection: API writes must be JSON from the same origin.
- Users can delete their account and all data from the Account screen.

## Develop

```bash
npm install
npm run dev     # http://localhost:8787 (local D1 is created automatically)
npm test        # unit tests for the scheduler, answer checking, and lesson builder
```

To try chat locally, copy `.dev.vars.example` to `.dev.vars` and add a Claude API key.

## Deploy

The `learn-lingala` Worker deploys from GitHub: every push to `main` runs `npx wrangler deploy`. The database schema is created automatically on the first request; to apply it by hand, run `npm run db:migrate`.

### Turn on live chat

1. Create an API key in the [Claude Console](https://platform.claude.com/) (set a monthly spend limit there too).
2. Run `npx wrangler secret put ANTHROPIC_API_KEY` and paste the key, or add it in the Cloudflare dashboard under **Workers & Pages → learn-lingala → Settings → Variables and Secrets** as a *Secret*.

Chat stays switched off, with a notice in the app, until the key is set. Nothing else needs to change.

### Optional: turn on Turnstile

1. Cloudflare dashboard → **Turnstile** → **Add widget** for your domain.
2. Put the **site key** in `wrangler.jsonc` → `vars.TURNSTILE_SITE_KEY`.
3. Run `npx wrangler secret put TURNSTILE_SECRET_KEY` and paste the **secret key**.

Turnstile stays off until the secret is set.

## Roadmap

- Native-speaker audio for every phrase (stored in R2): listening exercises and shadowing (repeating right after the speaker)
- Record-and-compare speaking practice once reference audio exists
- Password reset by email
- More Level 4–5 content: storytelling, opinions, proverbs (*masese*), song lyrics
- More base languages (Spanish, Portuguese, Swahili…): add a string table to `i18n.js` and a content layer like `course-fr.js`
- Leaderboards and friend streaks
