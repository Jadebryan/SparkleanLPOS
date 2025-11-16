require('dotenv').config();

// Works for both v2 and v3 tokens
async function verifyRecaptchaV3(token, { action = 'login', minScore = 0.5, remoteIp = '' } = {}) {
  if (!token) {
    return { ok: false, reason: 'missing_token' };
  }
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
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

    // v2 tokens only have success, no action/score
    // v3 tokens have success, action, and score
    const ok = data.success === true
      && (data.action ? data.action === action : true) // v2: no action, so passes
      && (typeof data.score === 'number' ? data.score >= minScore : true); // v2: no score, so passes

    return { ok, data };
  } catch (error) {
    return { ok: false, reason: 'request_failed', error: String(error) };
  }
}

module.exports = {
  verifyRecaptchaV3,
};


