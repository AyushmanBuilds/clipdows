const { withExtractor } = require('./resourceManager');
const { TOPICS } = require('./topics');

const RELEVANCE_THRESHOLD = 0.24; // chosen to favor recall; uncertain clips stay recoverable in Focus Review
const topicVectors = new Map();

function vectorOf(tensor) {
  const data = tensor && tensor.data;
  if (!data || data.length < 1) throw new Error('The local model returned no embedding.');
  return Float32Array.from(data);
}

function dot(a, b) {
  let score = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) score += a[i] * b[i];
  return score;
}

async function embed(extractor, text) {
  const output = await extractor(String(text).slice(0, 12000), { pooling: 'mean', normalize: true });
  return vectorOf(output);
}

async function classify(text, selectedTopicIds, customTopics = []) {
  const selected = TOPICS.filter((topic) => selectedTopicIds.includes(topic.id));
  selected.push(...customTopics.filter((topic) => topic && /^custom-[a-z0-9-]+$/.test(topic.id)
    && typeof topic.label === 'string' && typeof topic.prompt === 'string')
    .map((topic) => ({ id: topic.id, label: topic.label.slice(0, 40), prompt: topic.prompt.slice(0, 240) })));
  if (!selected.length) return { relevant: true, reason: 'no-topics' };

  return withExtractor(async (extractor) => {
    const sample = await embed(extractor, text);
    let best = { topic: null, score: -1 };
    for (const topic of selected) {
      let prototype = topicVectors.get(topic.id);
      if (!prototype) {
        prototype = await embed(extractor, topic.prompt);
        topicVectors.set(topic.id, prototype);
      }
      const score = dot(sample, prototype);
      if (score > best.score) best = { topic: topic.id, score };
    }
    return { relevant: best.score >= RELEVANCE_THRESHOLD, topic: best.topic, score: best.score };
  });
}

module.exports = { classify, RELEVANCE_THRESHOLD };
