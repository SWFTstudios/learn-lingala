// Quick translation between Lingala and the learner's base language, with a
// word-by-word breakdown and usage notes. The app shows course dictionary
// matches first; this is the AI layer on top.

import { HttpError } from './http.js';
import { claudeJson, takeDailyQuota, BASE_LANGUAGE_NAMES, TRANSLATE_MODEL } from './claude.js';
import { cleanLang } from './chat.js';

export const DAILY_TRANSLATE_CAP = 200;
const MAX_INPUT = 200;

const SCHEMA = {
  type: 'object',
  properties: {
    direction: { type: 'string', enum: ['to-lingala', 'from-lingala'], description: 'Which way you translated.' },
    translation: { type: 'string', description: 'The best, most natural translation.' },
    alternatives: {
      type: 'array',
      description: 'Up to three other natural ways to say it, each with a short note on when to use it.',
      items: {
        type: 'object',
        properties: { text: { type: 'string' }, note: { type: 'string' } },
        required: ['text', 'note'],
        additionalProperties: false,
      },
    },
    breakdown: {
      type: 'array',
      description: "Word-by-word breakdown of the Lingala side, each with its meaning in the learner's base language.",
      items: {
        type: 'object',
        properties: { word: { type: 'string' }, meaning: { type: 'string' } },
        required: ['word', 'meaning'],
        additionalProperties: false,
      },
    },
    example: {
      type: 'object',
      description: 'A short natural example sentence in Lingala using it, with a translation.',
      properties: { lg: { type: 'string' }, gloss: { type: 'string' } },
      required: ['lg', 'gloss'],
      additionalProperties: false,
    },
    note: { type: 'string', description: 'One or two sentences on usage, politeness or a Kinshasa nuance, or empty string.' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['direction', 'translation', 'alternatives', 'breakdown', 'example', 'note', 'confidence'],
  additionalProperties: false,
};

const PROMPT = `You are the translation feature of a Lingala learning app used by travellers and heritage learners heading to Kinshasa.

Translate the user's text between Lingala and their base language (named below). Detect the direction yourself: if the text is Lingala, translate it into the base language; otherwise translate it into Lingala.

Rules
- Use Lingala as spoken in Kinshasa today, including the French words Kinois naturally use. Standard spelling with ɛ and ɔ; tone marks are optional.
- Prefer the natural, everyday way people actually say it over a word-for-word rendering.
- breakdown covers the Lingala side only. The meanings, notes and example gloss are written in the base language.
- Be honest about uncertainty: set confidence "medium" or "low" when the meaning is ambiguous, very idiomatic, regional, or you are not sure the Lingala is natural, and say so in the note. Never invent words, proverbs or idioms.
- Single words: give the translation, and use alternatives for other common senses.
- If the text is not something to translate (for example a question about grammar), translate it anyway as best you can and use the note to point the user to the course.`;

export async function translate(env, user, body) {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(503, 'off');
  const text = String(body.text || '').trim();
  if (!text) throw new HttpError(400, 'Type something to translate.');
  if (text.length > MAX_INPUT) throw new HttpError(400, 'too-long');
  const lang = cleanLang(body.lang);

  const quota = await takeDailyQuota(env.DB, 'translate_usage', user.id, DAILY_TRANSLATE_CAP, 'quota');
  const result = await claudeJson(env, {
    model: TRANSLATE_MODEL,
    system: [
      { type: 'text', text: PROMPT },
      { type: 'text', text: `The user's base language is ${BASE_LANGUAGE_NAMES[lang]}.` },
    ],
    messages: [{ role: 'user', content: text }],
    schema: SCHEMA,
    refund: quota.refund,
  });
  return {
    ...result,
    alternatives: result.alternatives.slice(0, 3),
    breakdown: result.breakdown.slice(0, 12),
    remaining: quota.remaining,
  };
}
