require('dotenv').config();

async function verifyRecaptchaV3(token, { action = 'login', minScore = 0.5, remoteIp = '' } = {}) {
  if (!token) {
    return { ok: false, reason: 'missing_token' };
  }
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    // If no secret configured, treat as fail in production; allow in dev if explicitly opted-in
    return { ok: false, reason: 'missing_secret' };
  }

  try {
    const params = new URLSearchParams({
      secret,
      response: token,
    });
    if (remoteIp) params.append('remoteip', remoteIp);

    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const data = await res.json();

    const ok = data.success === true
      && (data.action ? data.action === action : true)
      && (typeof data.score === 'number' ? data.score >= minScore : true);

    return { ok, data };
  } catch (error) {
    return { ok: false, reason: 'request_failed', error: String(error) };
  }
}

module.exports = {
  verifyRecaptchaV3,
};


