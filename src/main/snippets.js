// Snippet variables: {date} {time} {datetime} {clipboard} {cursor}
const pad = (n) => String(n).padStart(2, '0');

function expand(content, clipboardText = '') {
  const now = new Date();
  const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  let text = String(content || '')
    .replace(/\{datetime\}/gi, `${date} ${time}`)
    .replace(/\{date\}/gi, date)
    .replace(/\{time\}/gi, time)
    .replace(/\{clipboard\}/gi, () => clipboardText || '');
  let cursorBack = 0;
  const i = text.search(/\{cursor\}/i);
  if (i >= 0) {
    const before = text.slice(0, i);
    const after = text.slice(i).replace(/\{cursor\}/gi, '');
    text = before + after;
    cursorBack = after.replace(/\r\n/g, '\n').length; // caret steps needed after pasting
  }
  return { text, cursorBack };
}

module.exports = { expand };
