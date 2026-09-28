// Sensitive-data guard: decides whether a clip is a secret. Secrets are masked in
// the UI, auto-deleted after a short time, and NEVER uploaded to the cloud.

const OTP_TTL_MS = 60 * 1000;
const SECRET_TTL_MS = 120 * 1000;

const TOKEN_PATTERNS = [
  /\bAKIA[0-9A-Z]{16}\b/,                                        // AWS access key id
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,                              // GitHub tokens
  /\bsk-[A-Za-z0-9_-]{20,}\b/,                                   // OpenAI-style secret keys
  /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/,                         // Stripe
  /\brzp_(live|test)_[A-Za-z0-9]{10,}\b/,                        // Razorpay
  /\bAIza[0-9A-Za-z_-]{35}\b/,                                   // Google API key
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,                            // Slack
  /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/, // JWT
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}/i,
];

function luhn(digits) {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

/** Returns { kind, label, ttl } or null. */
function classify(text) {
  if (!text) return null;
  const t = String(text).trim();
  if (!t || t.length > 4000) return null;

  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t)) return { kind: 'key', label: 'Private key', ttl: SECRET_TTL_MS };
  if (TOKEN_PATTERNS.some((re) => re.test(t))) return { kind: 'token', label: 'API key / token', ttl: SECRET_TTL_MS };

  if (/^(?:\d[ -]?){13,19}$/.test(t)) {
    const d = t.replace(/[ -]/g, '');
    if (d.length >= 13 && d.length <= 19 && luhn(d)) return { kind: 'card', label: 'Card number', ttl: SECRET_TTL_MS };
  }
  if (/^[2-9]\d{3}\s?\d{4}\s?\d{4}$/.test(t)) return { kind: 'id', label: 'ID number', ttl: SECRET_TTL_MS };   // Aadhaar-shaped
  if (/^[A-Z]{5}\d{4}[A-Z]$/.test(t)) return { kind: 'id', label: 'PAN', ttl: SECRET_TTL_MS };

  // OTP: a bare 6-8 digit code, or a short message that talks about a code/OTP.
  if (/^\d{6,8}$/.test(t)) return { kind: 'otp', label: 'One-time code', ttl: OTP_TTL_MS };
  if (t.length <= 160 && /\b(otp|one[- ]time|verification code|passcode|security code|login code)\b/i.test(t) && /\b\d{4,8}\b/.test(t)) {
    return { kind: 'otp', label: 'One-time code', ttl: OTP_TTL_MS };
  }

  // Password-looking single token: 8-40 chars, no spaces, upper+lower+digit+symbol.
  if (/^\S{8,40}$/.test(t) && !/^(https?:|www\.)/i.test(t) && !/[\\/]{2}/.test(t)) {
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[!@#$%^&*()+={}[\]:;"'<>,.?~`|\\/]/].filter((re) => re.test(t)).length;
    if (classes === 4) return { kind: 'password', label: 'Password', ttl: SECRET_TTL_MS };
  }
  return null;
}

/** Mutates `item` with masking + expiry when its text is a secret. Returns the item. */
function mark(item, ttlOverride) {
  if (item.type === 'image') return item;
  const s = classify(item.content);
  if (!s) return item;
  item.sensitive = s.kind;
  item.sensitive_label = s.label;
  item.expires_at = Date.now() + (ttlOverride > 0 ? ttlOverride : s.ttl);
  item.preview = '•••••••• ' + s.label;
  return item;
}

/**
 * Password managers (1Password, Bitwarden, KeePass...) and Windows itself use these
 * clipboard formats to say "don't record this". Windows' own Win+V honours them; so do we.
 */
function excludedByApp(clipboard) {
  if (process.platform !== 'win32') return false;
  try {
    if (clipboard.readBuffer('ExcludeClipboardContentFromMonitorProcessing').length > 0) return true;
    const b = clipboard.readBuffer('CanIncludeInClipboardHistory');
    if (b.length >= 4 && b.readUInt32LE(0) === 0) return true;
  } catch { /* format not available */ }
  return false;
}

module.exports = { classify, mark, excludedByApp };