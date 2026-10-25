# learn-lingala

Learn Lingala at any level: a free, mobile-first learning app built on Cloudflare.

- **`/app/`** is the learning app: bite-sized lessons, spaced-repetition reviews, streaks, accounts and progress sync.
- **`/`** is the landing page, plus reference guides for the [alphabet](public/alphabet.html) and [sentence structure](public/sentences.html).

## How the app teaches

Each part of a session follows a finding from learning research:

| Technique | In the app |
| --- | --- |
| **Retrieval practice** | Every new word is tested minutes after it's introduced, never just shown. |
| **Desirable difficulty** | Each word moves from recognising it (multiple choice), to assembling it (word tiles), to recalling it (typing). |
| **Spaced repetition** | An SM-2-style scheduler times reviews for just before you'd forget (1 day → 3 → ~1 week → a month…). |
| **Interleaving** | Lessons mix new words, due reviews and production. |
| **Error correction** | A missed question comes back a few steps later in the same session. |
| **Explicit grammar** | Each unit opens with a short rule (subject prefixes, `te` negation, `nazali + verb`…) before practice. |
| **Habit** | Daily XP goal, streaks, and a nudge when reviews are due. |

Typing is forgiving: tone marks are optional, `e`/`o` are accepted for `ɛ`/`ɔ`, and one-letter slips count as right (the correct spelling is still shown).

The course has 9 units and about 110 words and phrases: greetings, pronouns & *kozala*, family, numbers, food, action verbs, wants & negation, questions, and time & places. Content lives in [`public/app/js/course.js`](public/app/js/course.js); add an item there and it automatically becomes a lesson step and a review card.

> **Content review:** have the Lingala in `course.js` checked by a native speaker before promoting the app widely. Usage varies between Kinshasa and Brazzaville, and tone marks especially should be verified.

## Architecture

```
public/            Static assets (Workers Static Assets, served from the edge cache)
  app/             The learning app: vanilla JS modules, no build step
    js/course.js   Course content
    js/srs.js      Spaced-repetition scheduler
    js/lesson.js   Session builder (what to teach, which exercise, ordering)
    js/player.js   Exercise UI
    js/store.js    Local state + server sync
    sw.js          Service worker (offline support, installable PWA)
src/worker.js      API Worker: auth, sessions, progress sync
migrations/        D1 schema
tests/             Unit tests for the learning logic
```

**Cloudflare features used**

- **Workers + Static Assets**: the site and app are served from Cloudflare's edge. Only `/api/*` requests run the Worker (`run_worker_first`).
- **D1** (`learn-lingala-db`): users, sessions, per-word review state, XP history.
- **Workers Rate Limiting**: 10 sign-in/sign-up attempts per minute per IP, and 120 API calls per minute per IP.
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

## Deploy

The `learn-lingala` Worker deploys from GitHub: every push to `main` runs `npx wrangler deploy`. The database schema is created automatically on the first request; to apply it by hand, run `npm run db:migrate`.

### Optional: turn on Turnstile

1. Cloudflare dashboard → **Turnstile** → **Add widget** for your domain.
2. Put the **site key** in `wrangler.jsonc` → `vars.TURNSTILE_SITE_KEY`.
3. Run `npx wrangler secret put TURNSTILE_SECRET_KEY` and paste the **secret key**.

Turnstile stays off until the secret is set.

## Roadmap

- Native-speaker audio for every word (stored in R2) and listening exercises
- Password reset by email
- More units: past tense, directions, shopping, conversation dialogues
- Leaderboards and friend streaks
