// Memory hooks for study cards, using the keyword method: a word in the
// learner's own language that sounds like the Lingala, tied to the meaning by
// a vivid image. Only course phrases can be sent, so prompts stay on topic.

import { HttpError } from './http.js';
import { claudeJson, takeDailyQuota, BASE_LANGUAGE_NAMES, CHAT_MODEL } from './claude.js';
import { cleanLang } from './chat.js';
import { ITEM_BY_ID } from '../public/app/js/course.js';

export const DAILY_HOOK_CAP = 30;

const SCHEMA = {
  type: 'object',
  properties: {
    keyword: {
      type: 'string',
      description: "A real word or short phrase in the learner's base language that sounds like (part of) the Lingala when said aloud.",
    },
    hook: {
      type: 'string',
      description: 'One or two short sentences (max 30 words) linking the keyword to the meaning with a vivid, memorable image.',
    },
  },
  required: ['keyword', 'hook'],
  additionalProperties: false,
};

const PROMPT = `You write memory hooks for a Lingala learning app, using the keyword method.

Given a Lingala word or phrase and its meaning, pick a keyword: a real word or short phrase in the learner's base language (named below) that sounds like the Lingala, or like its most distinctive part, when read aloud. Then write a hook: one or two short sentences that link the keyword to the meaning through a vivid, concrete, slightly funny image the learner can picture.

Rules
- Write the keyword and the hook in the learner's base language. Quote the Lingala exactly as given.
- The sound-alike must be genuinely close. If nothing sounds close, use the clearest part of the phrase.
- Keep it short (max 30 words), family-friendly and respectful. No stereotypes about Congo, Africa or any group.
- Do not teach other Lingala words or claim anything about grammar or etymology.`;

export async function memoryHook(env, user, body) {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(503, 'off');
  const item = ITEM_BY_ID.get(String(body.itemId || ''));
  if (!item) throw new HttpError(400, 'Unknown phrase.');
  const lang = cleanLang(body.lang);

  const quota = await takeDailyQuota(env.DB, 'hook_usage', user.id, DAILY_HOOK_CAP, 'quota');
  const result = await claudeJson(env, {
    model: CHAT_MODEL,
    system: [
      { type: 'text', text: PROMPT },
      { type: 'text', text: `The learner's base language is ${BASE_LANGUAGE_NAMES[lang]}.` },
    ],
    messages: [{ role: 'user', content: `Lingala: ${item.lg}\nMeaning (English): ${item.en}` }],
    schema: SCHEMA,
    refund: quota.refund,
  });
  return { keyword: result.keyword.slice(0, 80), hook: result.hook.slice(0, 400), remaining: quota.remaining };
}
