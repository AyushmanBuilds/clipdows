const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const ROOT = path.resolve(__dirname, '..');
const MODEL = 'onnx-community/all-MiniLM-L6-v2-ONNX';
const DEST = path.join(ROOT, 'assets', 'focus-model', MODEL);
// Pin the model revision so builds use the same local weights and tokenizer.
const REVISION = 'aff7a1d';
const FILES = [
  'config.json',
  'special_tokens_map.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.txt',
  'onnx/model_q4.onnx',
  'onnx/model_q4.onnx_data',
];

async function download(relativePath) {
  const target = path.resolve(DEST, relativePath);
  if (!target.startsWith(DEST + path.sep)) throw new Error('Invalid model asset path.');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.download`;
  const url = `https://huggingface.co/${MODEL}/resolve/${REVISION}/${relativePath}`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`Could not download ${relativePath} (HTTP ${response.status}).`);
  try {
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temp));
    const stat = fs.statSync(temp);
    if (stat.size < 100) throw new Error(`Downloaded model asset is unexpectedly small: ${relativePath}`);
    fs.renameSync(temp, target);
    console.log(`Downloaded ${relativePath} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
  } catch (err) {
    try { fs.rmSync(temp, { force: true }); } catch { /* ignore partial download cleanup */ }
    throw err;
  }
}

(async () => {
  for (const file of FILES) await download(file);
  const license = await fetch('https://www.apache.org/licenses/LICENSE-2.0.txt');
  if (!license.ok || !license.body) throw new Error('Could not download the Apache 2.0 license text.');
  await pipeline(Readable.fromWeb(license.body), fs.createWriteStream(path.join(DEST, 'LICENSE-2.0.txt')));
  fs.writeFileSync(path.join(DEST, 'NOTICE.txt'), `${MODEL}\nRevision: ${REVISION}\nLicense: Apache-2.0\nModel card: https://huggingface.co/${MODEL}\n`, 'utf8');
  console.log(`Focus Capture model assets are ready in ${path.relative(ROOT, DEST)}.`);
})().catch((err) => {
  console.error('[focus-model] download failed:', err.message);
  process.exitCode = 1;
});
