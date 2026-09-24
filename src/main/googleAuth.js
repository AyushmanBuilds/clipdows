// Google sign-in for Electron using the system browser (OAuth 2.0 + PKCE,
// loopback redirect) — the flow recommended by Google (RFC 8252) and used by
// apps like Slack, VS Code and Spotify.
const http = require('http');
const crypto = require('crypto');
const { shell } = require('electron');
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = require('./googleConfig');

const TIMEOUT_MS = 3 * 60 * 1000;
let active = null;

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function resultPage(ok, message) {
  const icon = ok ? '✓' : '!';
  const title = ok ? "You're signed in" : 'Sign-in failed';
  const color = ok ? 'linear-gradient(135deg,#6EE7F9,#8B5CF6)' : '#EF4444';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ClipDows</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0E0F15;
       font-family:-apple-system,"Segoe UI",Inter,Roboto,sans-serif;color:#F1F2F6}
  .card{background:#171922;border:1px solid #2A2C38;border-radius:20px;padding:40px 44px;text-align:center;
        max-width:400px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
  .badge{width:64px;height:64px;border-radius:50%;background:${color};display:flex;align-items:center;
         justify-content:center;font-size:30px;font-weight:800;color:#fff;margin:0 auto 20px}
  h1{font-size:21px;margin:0 0 8px} p{margin:0;color:#A6A9B8;font-size:14px;line-height:1.5}
  .brand{margin-top:26px;font-size:12px;font-weight:800;letter-spacing:.02em;color:#6E7183}
</style></head><body><div class="card">
  <div class="badge">${icon}</div><h1>${title}</h1><p>${message}</p><div class="brand">ClipDows</div>
</div><script>${ok ? 'setTimeout(function(){window.close()},1800)' : ''}</script></body></html>`;
}

function cancel() {
  if (active) active.cancel();
}

function signIn() {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('PASTE')) {
    return Promise.resolve({ ok: false, error: 'Google sign-in is not configured yet (missing OAuth client ID).' });
  }
  if (active) active.cancel();

  return new Promise((resolve) => {
    const verifier = b64url(crypto.randomBytes(48));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));
    let settled = false;
    let timer;
    let redirectUri = '';

    const server = http.createServer(async (req, res) => {
      let url;
      try { url = new URL(req.url, 'http://127.0.0.1'); } catch { res.writeHead(400); res.end(); return; }
      if (url.pathname !== '/callback') { res.writeHead(404); res.end(); return; }

      const reply = (ok, msg) => {
        res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close' });
        res.end(resultPage(ok, msg));
      };

      const err = url.searchParams.get('error');
      if (err) {
        reply(false, err === 'access_denied' ? 'You cancelled the sign-in. You can close this tab.' : 'Google returned an error. You can close this tab.');
        return finish(err === 'access_denied' ? { ok: false, cancelled: true } : { ok: false, error: `Google error: ${err}` });
      }
      if (url.searchParams.get('state') !== state) {
        reply(false, 'Security check failed. Please try again from ClipDows.');
        return finish({ ok: false, error: 'Sign-in security check failed. Please try again.' });
      }
      const code = url.searchParams.get('code');
      if (!code) {
        reply(false, 'No authorization code received.');
        return finish({ ok: false, error: 'No authorization code received.' });
      }

      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            code_verifier: verifier,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
        const tokens = await tokenRes.json();
        if (!tokenRes.ok || !tokens.id_token) {
          reply(false, 'Could not complete sign-in with Google. Please try again.');
          return finish({ ok: false, error: tokens.error_description || tokens.error || 'Token exchange failed.' });
        }
        reply(true, 'You can close this tab and return to ClipDows.');
        finish({ ok: true, idToken: tokens.id_token, accessToken: tokens.access_token });
      } catch (e) {
        reply(false, 'Network error while signing in. Please try again.');
        finish({ ok: false, error: 'Network error while contacting Google.' });
      }
    });

    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      active = null;
      setTimeout(() => { server.close(); if (server.closeAllConnections) server.closeAllConnections(); }, 500);
      resolve(result);
    }

    active = { cancel: () => finish({ ok: false, cancelled: true }) };

    server.on('error', (e) => finish({ ok: false, error: `Could not start local sign-in listener: ${e.message}` }));
    server.listen(0, '127.0.0.1', () => {
      redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        prompt: 'select_account',
      });
      shell.openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params}`).catch((e) =>
        finish({ ok: false, error: `Could not open your browser: ${e.message}` })
      );
    });

    timer = setTimeout(() => finish({ ok: false, error: 'Sign-in timed out. Please try again.' }), TIMEOUT_MS);
  });
}

module.exports = { signIn, cancel };