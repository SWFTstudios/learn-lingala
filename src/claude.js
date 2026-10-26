// Shared Claude API call for the AI features (chat practice, translation):
// structured JSON output, refusal fallbacks, friendly errors, per-user daily quotas.

import Anthropic from '@anthropic-ai/sdk';
import { HttpError } from './http.js';

// Chat practice runs on Sonnet (a reply every few seconds, so cost per message
// matters most there); translation stays on Opus.
export const CHAT_MODEL = 'claude-sonnet-5-5';
export const TRANSLATE_MODEL = 'claude-opus-5-5';

const today = () => new Date().toISOString().slice(0, 10);

// Quota tables are fixed names from this file, never user input.
const QUOTA_TABLES = new Set(['chat_usage', 'translate_usage', 'hook_usage']);

// Counts today's use of a feature and refuses once the daily cap is reached.
export async function takeDailyQuota(db, table, userId, cap, message) {
  if (!QUOTA_TABLES.has(table)) throw new Error(`Unknown quota table ${table}`);
  const row = await db
    .prepare(
      `INSERT INTO ${table} (user_id, day, count) VALUES (?, ?, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(userId, today())
    .first();
  if (row.count > cap) throw new HttpError(429, message);
  return {
    remaining: cap - row.count,
    // A failed call shouldn't use up the learner's daily allowance.
    refund: () => db.prepare(`UPDATE ${table} SET count = count - 1 WHERE user_id = ? AND day = ?`).bind(userId, today()).run(),
  };
}

export const BASE_LANGUAGE_NAMES = { en: 'English', fr: 'French' };

// One Claude call that must return JSON matching `schema`.
export async function claudeJson(env, { model, system, messages, schema, refund }) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined });
  let response;
  try {
    response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      // Re-run on Anthropic's recommended model if a safety classifier declines a benign request.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      cache_control: { type: 'ephemeral' },
      system,
      // These features are latency-sensitive: low effort keeps responses quick.
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      messages,
    });
  } catch (err) {
    await refund?.();
    if (err instanceof Anthropic.RateLimitError) throw new HttpError(429, 'busy');
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic API key rejected');
      throw new HttpError(503, 'unavailable');
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error', err.status, err.message);
      throw new HttpError(502, 'connection');
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') throw new HttpError(422, 'refused');
  const text = response.content.find((b) => b.type === 'text')?.text;
  try {
    return JSON.parse(text);
  } catch {
    console.error('Unparseable Claude reply', response.stop_reason);
    throw new HttpError(502, 'muddled');
  }
}
