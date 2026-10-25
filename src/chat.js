// Live conversation practice: a Claude-powered Lingala speaker who stays in
// character, keeps to the learner's level, corrects gently, and suggests replies.

import Anthropic from '@anthropic-ai/sdk';
import { ITEMS, LEVELS, LEVEL_BY_ID } from '../public/app/js/course.js';
import { SCENARIO_BY_ID } from '../public/app/js/chat-scenarios.js';
import { HttpError } from './http.js';

const MODEL = 'claude-opus-5-5';
export const DAILY_MESSAGE_CAP = 150;
const MAX_HISTORY = 24; // messages sent to the model (most recent)
const MAX_TEXT = 600; // characters per message in history
const MAX_USER_TEXT = 400; // characters in the learner's new message
const MAX_KNOWN = 150; // learned phrases listed in the prompt

// The reply format. Every field is required so the client can render it blindly.
const REPLY_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: "Your next message, in Lingala, in character. 1–2 short sentences." },
    translation: { type: 'string', description: 'English translation of reply.' },
    feedback: {
      type: 'object',
      properties: {
        verdict: { type: 'string', enum: ['great', 'ok', 'fix'] },
        corrected: { type: 'string', description: "A more natural Lingala version of the learner's last message, or empty string if verdict is great." },
        note: { type: 'string', description: 'One short sentence in English explaining the correction or praising what was natural.' },
      },
      required: ['verdict', 'corrected', 'note'],
      additionalProperties: false,
    },
    suggestions: {
      type: 'array',
      description: 'Two or three things the learner could say next, at their level.',
      items: {
        type: 'object',
        properties: { lg: { type: 'string' }, en: { type: 'string' } },
        required: ['lg', 'en'],
        additionalProperties: false,
      },
    },
    mission_complete: { type: 'boolean' },
  },
  required: ['reply', 'translation', 'feedback', 'suggestions', 'mission_complete'],
  additionalProperties: false,
};

// Stable instructions shared by every chat (first in the prompt so it caches).
const BASE_PROMPT = `You are a conversation partner in a Lingala learning app. The learner is practising real conversations in Kinshasa Lingala by text message.

How to speak
- Write your reply in Lingala as spoken in Kinshasa today, including the French words Kinois naturally use (merci, pardon, mille, ah bon). Use standard spelling with ɛ and ɔ; tone marks are optional.
- Keep each reply short like a text message: one or two short sentences, usually ending with a question or prompt that keeps the conversation going.
- Stay in character. Never switch your reply into English, even if the learner writes in English; answer in simple Lingala and let the suggestions show them how to say what they meant.
- Speak at the learner's level: build mainly on phrases they already know (listed below) and introduce at most one or two new words per message. Above their level, simplify.
- Only use Lingala you are confident is correct and natural. Prefer a simpler phrase over an uncertain one, and never invent proverbs or idioms.

Feedback on the learner's last message
- verdict "great" when it was natural Lingala (corrected = ""), "ok" when understandable but could be more natural, "fix" when it had a real error.
- corrected: the natural way a Kinois would say what they meant. note: one short, encouraging English sentence on the key point (a grammar pattern, a word choice, or a local touch). Ignore missing tone marks and plain e/o for ɛ/ɔ. Do not correct the learner for using common French loanwords.
- If the learner wrote in English, give verdict "fix" with corrected = how to say it in Lingala.

Suggestions: two or three replies the learner could send next, mostly using phrases they know, each with an English gloss.

Mission: set mission_complete to true only once the learner has actually done everything the mission asks, in Lingala. If there is no mission, always false.

Keep the conversation friendly and appropriate for all ages.`;

function scenarioPrompt(s) {
  return `Scenario
- You are ${s.persona}
- Setting: ${s.setting}
- The learner's mission: ${s.mission || 'none, free conversation; follow their lead.'}
- You opened the conversation with: "${s.opener.lg}"`;
}

function learnerPrompt(level, known) {
  const list = known.length
    ? known.map((i) => `${i.lg} = ${i.en}`).join('\n')
    : '(none yet: they are a complete beginner, so use only the very simplest greetings)';
  return `The learner
- Course level: ${level.title.replace('­', '')} (${level.cefr}): ${level.subtitle}.
- Phrases they have learned (most recent last):
${list}`;
}

// What the learner knows, from their saved review cards.
async function learnerProfile(db, userId) {
  const { results } = await db
    .prepare('SELECT card_id FROM cards WHERE user_id = ? ORDER BY updated_at')
    .bind(userId)
    .all();
  const learned = new Set(results.map((r) => r.card_id));
  const known = ITEMS.filter((i) => learned.has(i.id));
  const level = LEVELS.find((l) => ITEMS.some((i) => i.level === l.id && !learned.has(i.id))) || LEVELS[LEVELS.length - 1];
  return { level, known: known.slice(-MAX_KNOWN) };
}

function cleanHistory(raw) {
  if (!Array.isArray(raw)) throw new HttpError(400, 'Invalid conversation.');
  const history = raw.slice(-MAX_HISTORY).map((m) => {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.text !== 'string') {
      throw new HttpError(400, 'Invalid conversation.');
    }
    return { role: m.role, content: m.text.slice(0, MAX_TEXT) };
  });
  // The API needs the conversation to start with the learner and end with their new message.
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') throw new HttpError(400, 'Send a message first.');
  if (!history[history.length - 1].content.trim()) throw new HttpError(400, 'Message is empty.');
  if (raw[raw.length - 1].text.length > MAX_USER_TEXT) throw new HttpError(400, 'Message is too long — keep it short, like a text.');
  return history;
}

// Counts today's messages and refuses once the daily cap is reached.
async function takeDailyQuota(db, userId) {
  const day = new Date().toISOString().slice(0, 10);
  const row = await db
    .prepare(
      `INSERT INTO chat_usage (user_id, day, count) VALUES (?, ?, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(userId, day)
    .first();
  if (row.count > DAILY_MESSAGE_CAP) {
    throw new HttpError(429, `You've reached today's limit of ${DAILY_MESSAGE_CAP} chat messages. Tokomonana lóbi — see you tomorrow!`);
  }
  return DAILY_MESSAGE_CAP - row.count;
}

export async function chatTurn(env, user, body) {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(503, "Chat practice isn't switched on yet.");
  const scenario = SCENARIO_BY_ID.get(body.scenario);
  if (!scenario) throw new HttpError(400, 'Unknown chat partner.');

  // The opener is shown in the app before any API call; include it so the model sees the whole chat.
  const history = cleanHistory(body.messages);
  const messages = [{ role: 'assistant', content: scenario.opener.lg }, ...history];
  messages.unshift({ role: 'user', content: '(The learner opens the chat.)' });

  const remaining = await takeDailyQuota(env.DB, user.id);
  const { level, known } = await learnerProfile(env.DB, user.id);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined });
  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Re-run on Anthropic's recommended model if a safety classifier declines a benign request.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      cache_control: { type: 'ephemeral' },
      system: [
        { type: 'text', text: BASE_PROMPT },
        { type: 'text', text: scenarioPrompt(scenario) },
        { type: 'text', text: learnerPrompt(level, known) },
      ],
      // Chat is latency-sensitive: low effort keeps replies quick.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: REPLY_SCHEMA } },
      messages,
    });
  } catch (err) {
    // A failed call shouldn't use up the learner's daily allowance.
    await env.DB.prepare('UPDATE chat_usage SET count = count - 1 WHERE user_id = ? AND day = ?')
      .bind(user.id, new Date().toISOString().slice(0, 10))
      .run();
    if (err instanceof Anthropic.RateLimitError) throw new HttpError(429, 'Chat is busy right now — try again in a minute.');
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic API key rejected');
      throw new HttpError(503, 'Chat is temporarily unavailable.');
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error', err.status, err.message);
      throw new HttpError(502, 'Your chat partner had a connection problem. Please send that again.');
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') {
    throw new HttpError(422, "Your partner couldn't answer that one. Try saying it a different way.");
  }
  const text = response.content.find((b) => b.type === 'text')?.text;
  let reply;
  try {
    reply = JSON.parse(text);
  } catch {
    console.error('Unparseable chat reply', response.stop_reason);
    throw new HttpError(502, 'Your chat partner got muddled. Please send that again.');
  }
  return { ...reply, suggestions: reply.suggestions.slice(0, 3), remaining };
}
