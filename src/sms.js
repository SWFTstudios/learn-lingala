// Text messages through Twilio's REST API. Optional: set the secrets
// TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN, and TWILIO_FROM (a Twilio phone
// number in +E.164 form, or a Messaging Service SID starting with "MG").

import { HttpError } from './http.js';

export const smsEnabled = (env) => !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM);

// Phone numbers are stored in E.164: +, country code, number.
export function cleanPhone(value) {
  const phone = String(value || '').replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new HttpError(400, 'phone-invalid');
  return phone;
}

export async function sendSms(env, to, body) {
  if (!smsEnabled(env)) throw new HttpError(503, 'sms-off');
  const form = new URLSearchParams({ To: to, Body: body });
  if (env.TWILIO_FROM.startsWith('MG')) form.set('MessagingServiceSid', env.TWILIO_FROM);
  else form.set('From', env.TWILIO_FROM);

  const base = env.TWILIO_API_BASE || 'https://api.twilio.com'; // overridable for local testing
  const res = await fetch(`${base}/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('Twilio error', res.status, data.code, data.message);
    // 21211: invalid number. 21610: the number replied STOP. 21614: not a mobile number.
    if ([21211, 21610, 21614].includes(data.code)) throw new HttpError(400, 'phone-invalid');
    throw new HttpError(502, 'sms-failed');
  }
}
