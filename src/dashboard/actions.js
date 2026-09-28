// Instant actions: one-click transforms shown under a clip in the detail panel.
// Each action: { id, label, full, run(text) -> string, swatch? }. `full` = Pro/Max only (Free gets JSON prettify/minify).
(function () {
  const TRACKING = /^(utm_[a-z]+|fbclid|gclid|dclid|msclkid|igshid|mc_eid|mc_cid|_hsenc|_hsmi|yclid|ref_src|si)$/i;

  function parseJson(t) {
    const s = t.trim();
    if (!/^[\[{]/.test(s)) return null;
    try { return JSON.parse(s); } catch { return null; }
  }

  // ---- colours ----
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  function parseColor(t) {
    const s = t.trim();
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
    if (m) {
      let h = m[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), kind: 'hex' };
    }
    m = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i.exec(s);
    if (m) return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255), kind: 'rgb' };
    m = /^hsla?\(\s*(\d{1,3}(?:\.\d+)?)\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i.exec(s);
    if (m) {
      const h = (+m[1] % 360) / 360, sat = clamp(+m[2], 0, 100) / 100, l = clamp(+m[3], 0, 100) / 100;
      const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, p = 2 * l - q;
      const f = (t0) => { let t = t0; if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
      return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255), kind: 'hsl' };
    }
    return null;
  }
  const toHex = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  const toRgb = (c) => `rgb(${c.r}, ${c.g}, ${c.b})`;
  function toHsl(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }

  // ---- base64 / url ----
  const utf8 = new TextEncoder(), utf8d = new TextDecoder('utf-8', { fatal: true });
  function b64encode(t) { const bytes = utf8.encode(t); let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin); }
  function b64decode(t) {
    const bin = atob(t.trim()); const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const out = utf8d.decode(bytes);
    if (/[\u0000-\u0008\u000E-\u001F]/.test(out)) throw new Error('binary');
    return out;
  }
  const looksB64 = (t) => /^[A-Za-z0-9+/]{8,}={0,2}$/.test(t.trim()) && t.trim().length % 4 === 0;
  function stripTracking(t) {
    const u = new URL(t.trim().startsWith('www.') ? 'https://' + t.trim() : t.trim());
    [...u.searchParams.keys()].forEach((k) => { if (TRACKING.test(k)) u.searchParams.delete(k); });
    return u.toString();
  }

  const title = (t) => t.toLowerCase().replace(/(^|[\s\-_/(])([a-z\u00C0-\u024F])/g, (m, a, b) => a + b.toUpperCase());

  function list(content) {
    const text = String(content || '');
    const t = text.trim();
    const out = [];
    if (!t || t.length > 200000) return out;

    const json = parseJson(t);
    if (json !== null) {
      out.push({ id: 'json-pretty', label: 'Prettify JSON', full: false, run: () => JSON.stringify(json, null, 2) });
      out.push({ id: 'json-min', label: 'Minify JSON', full: false, run: () => JSON.stringify(json) });
    }
    const col = parseColor(t);
    if (col) {
      const sw = toHex(col);
      if (col.kind !== 'hex') out.push({ id: 'c-hex', label: 'HEX ' + toHex(col), full: true, swatch: sw, run: () => toHex(col) });
      if (col.kind !== 'rgb') out.push({ id: 'c-rgb', label: 'RGB', full: true, swatch: sw, run: () => toRgb(col) });
      if (col.kind !== 'hsl') out.push({ id: 'c-hsl', label: 'HSL', full: true, swatch: sw, run: () => toHsl(col) });
    }
    const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(t);
    if (isUrl) {
      try { if (stripTracking(t) !== (t.startsWith('www.') ? 'https://' + t : t) && stripTracking(t) !== new URL(t.startsWith('www.') ? 'https://' + t : t).toString()) out.push({ id: 'url-clean', label: 'Strip tracking', full: true, run: () => stripTracking(t) }); } catch { /* not a URL */ }
    }
    if (json === null && !col && !isUrl) {
      if (looksB64(t)) { try { b64decode(t); out.push({ id: 'b64-dec', label: 'Base64 decode', full: true, run: () => b64decode(t) }); } catch { /* not text */ } }
      if (/%[0-9a-f]{2}/i.test(t)) { try { decodeURIComponent(t); out.push({ id: 'url-dec', label: 'URL decode', full: true, run: () => decodeURIComponent(t) }); } catch { /* bad escape */ } }
      if (t.length <= 20000) {
        out.push({ id: 'b64-enc', label: 'Base64 encode', full: true, run: () => b64encode(text) });
        if (/[\s&?=#%+/:]/.test(t) || /[^\x00-\x7F]/.test(t)) out.push({ id: 'url-enc', label: 'URL encode', full: true, run: () => encodeURIComponent(text) });
        out.push({ id: 'upper', label: 'UPPERCASE', full: true, run: () => text.toUpperCase() });
        out.push({ id: 'lower', label: 'lowercase', full: true, run: () => text.toLowerCase() });
        out.push({ id: 'title', label: 'Title Case', full: true, run: () => title(text) });
        out.push({ id: 'clean', label: 'Clean whitespace', full: true, run: () => text.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim() });
        if (text.includes('\n')) out.push({ id: 'sort', label: 'Sort & dedupe lines', full: true, run: () => [...new Set(text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).join('\n') });
      }
    }
    return out;
  }

  window.clipActions = { list };
})();
