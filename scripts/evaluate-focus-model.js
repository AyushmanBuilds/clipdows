const path = require('path');

const MODEL_ID = 'onnx-community/all-MiniLM-L6-v2-ONNX';
const TOPICS = [
  ['programming', 'Software development, programming languages, code, debugging, APIs, databases, developer tools, and technical documentation.'],
  ['ai', 'Artificial intelligence, machine learning, language models, neural networks, prompts, model research, and AI tools.'],
  ['work', 'Work tasks, meetings, project planning, professional communication, workplace notes, and business operations.'],
  ['finance', 'Personal finance, banking, budgeting, taxes, payments, financial planning, and managing expenses.'],
  ['research', 'Research papers, academic notes, evidence, experiments, citations, study materials, and factual investigation.'],
  ['shopping', 'Products to buy, product comparisons, prices, stores, wish lists, deals, and purchase decisions.'],
  ['writing', 'Writing drafts, editing, grammar, outlines, publishing, storytelling, and communication ideas.'],
  ['travel', 'Travel plans, destinations, flights, hotels, directions, itineraries, and places to visit.'],
  ['learning', 'Learning goals, tutorials, course notes, explanations, study guides, and educational resources.'],
  ['personal', 'Personal reminders, life planning, useful notes, goals, and information to keep for later.'],
];

// Synthetic sanity-check examples only. Replace/add opt-in, locally labeled clips
// before treating these results as representative of real user behavior.
const CASES = [
  ['programming', true, 'The TypeScript function fails because the API response can be null before parsing.'],
  ['programming', true, 'Use a SQL index on the account_id column to speed up this query.'],
  ['programming', true, 'I need the Electron preload bridge to expose this IPC method safely.'],
  ['programming', false, 'Buy oat milk, tomatoes, and coffee on the way home.'],
  ['programming', false, 'The train leaves platform four at seven fifteen tonight.'],
  ['programming', false, 'A quiet beach hotel with breakfast costs less in September.'],
  ['ai', true, 'Compare small language models for private on-device text classification.'],
  ['ai', true, 'The transformer encoder maps each sentence into a semantic vector.'],
  ['ai', true, 'Quantization reduces model size but may affect similarity scores.'],
  ['ai', false, 'Remember to bring an umbrella because rain is expected tomorrow.'],
  ['ai', false, 'The recipe needs two cups of flour and a spoon of olive oil.'],
  ['ai', false, 'Hotel check-in is at three and the airport shuttle takes twenty minutes.'],
  ['work', true, 'Prepare a short agenda for the product review with the design team.'],
  ['work', true, 'The quarterly project plan needs owners, milestones, and delivery dates.'],
  ['work', true, 'Reply to the client with the revised timeline before the meeting.'],
  ['work', false, 'The museum is open from ten until six on weekdays.'],
  ['work', false, 'Add basil and parmesan to the pasta shopping list.'],
  ['work', false, 'The hiking trail is five miles long and starts near the lake.'],
  ['finance', true, 'Set aside money each month for taxes and emergency savings.'],
  ['finance', true, 'Compare the annual fees and interest rates on these credit cards.'],
  ['finance', true, 'Review the monthly budget before increasing the index fund contribution.'],
  ['finance', false, 'The Python loop should stop when the list is empty.'],
  ['finance', false, 'Draft a clearer opening paragraph for the newsletter.'],
  ['finance', false, 'Take the north exit after baggage claim to reach the taxi rank.'],
  ['research', true, 'Find the paper that reports confidence intervals for this clinical result.'],
  ['research', true, 'The literature review needs a source for the study methodology.'],
  ['research', true, 'Compare these experiment results and record the sample size and limitations.'],
  ['research', false, 'The grocery store closes at eight on Sunday evening.'],
  ['research', false, 'Reserve a window seat on the morning flight to Delhi.'],
  ['research', false, 'The jacket is available in blue for a lower price this week.'],
  ['shopping', true, 'Compare the battery life, screen size, and price of these two laptops.'],
  ['shopping', true, 'Save this store link so I can check the sale before ordering.'],
  ['shopping', true, 'This vacuum has free delivery and a two-year warranty.'],
  ['shopping', false, 'The meeting notes need an owner for each follow-up action.'],
  ['shopping', false, 'Review the cited sources before submitting the research summary.'],
  ['shopping', false, 'The JavaScript event handler should ignore clicks on the background.'],
  ['writing', true, 'Rewrite this introduction so the main idea is clear in the first sentence.'],
  ['writing', true, 'Check the punctuation and tone in this customer email draft.'],
  ['writing', true, 'Outline three sections for the article before drafting the conclusion.'],
  ['writing', false, 'The train ticket is valid for travel after nine in the morning.'],
  ['writing', false, 'Add the electricity bill and rent to this month’s budget.'],
  ['writing', false, 'The database migration adds an index for faster search.'],
  ['travel', true, 'Book a hotel near the station and save the address for the itinerary.'],
  ['travel', true, 'The flight departs at 8:20 and boarding starts forty minutes earlier.'],
  ['travel', true, 'Plan a three-day walking route through Kyoto with transit directions.'],
  ['travel', false, 'The API returns a 401 error when the authentication token expires.'],
  ['travel', false, 'The essay needs a stronger final paragraph and a shorter title.'],
  ['travel', false, 'Compare the expense ratio before buying this mutual fund.'],
  ['learning', true, 'This tutorial explains recursion with a simple step-by-step example.'],
  ['learning', true, 'Save the course notes about probability for the weekend study session.'],
  ['learning', true, 'I want a beginner explanation of how neural networks learn from data.'],
  ['learning', false, 'The parcel tracking page says delivery is expected on Friday.'],
  ['learning', false, 'Add a reminder to call the dentist after lunch.'],
  ['learning', false, 'The client approved the project quote and delivery schedule.'],
  ['personal', true, 'Remember to renew my passport before the appointment next month.'],
  ['personal', true, 'My weekly goal is to walk after dinner and call my parents on Sunday.'],
  ['personal', true, 'Save this note about the measurements for the desk in my office.'],
  ['personal', false, 'The React component should memoize this expensive calculation.'],
  ['personal', false, 'A new paper compares language model inference on consumer laptops.'],
  ['personal', false, 'The flight to Mumbai has been moved to gate twelve.'],
];

function dot(a, b) {
  let value = 0;
  for (let i = 0; i < a.length; i++) value += a[i] * b[i];
  return value;
}

(async () => {
  const { env, pipeline } = await import('@huggingface/transformers');
  env.localModelPath = path.resolve(__dirname, '..', 'assets', 'focus-model');
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  const extractor = await pipeline('feature-extraction', MODEL_ID, { dtype: 'q4', local_files_only: true });
  const uniqueTexts = [...new Set([...TOPICS.map((topic) => topic[1]), ...CASES.map((item) => item[2])])];
  const output = await extractor(uniqueTexts, { pooling: 'mean', normalize: true });
  const dim = output.dims[output.dims.length - 1];
  const index = new Map(uniqueTexts.map((text, i) => [text, Float32Array.from(output.data.slice(i * dim, (i + 1) * dim))]));
  const prompts = new Map(TOPICS);
  const scored = CASES.map(([topicId, expected, text]) => {
    const prompt = prompts.get(topicId);
    const score = dot(index.get(text), index.get(prompt));
    return { topicId, expected, score };
  });

  console.log(`Model: ${MODEL_ID} q4 | local examples: ${scored.length}`);
  console.log('threshold  precision  recall  f1  false-discard  false-keep');
  for (let threshold = 0.24; threshold <= 0.6001; threshold += 0.02) {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const item of scored) {
      const predicted = item.score >= threshold;
      if (predicted && item.expected) tp++;
      else if (predicted) fp++;
      else if (item.expected) fn++;
      else tn++;
    }
    const precision = tp / Math.max(1, tp + fp);
    const recall = tp / Math.max(1, tp + fn);
    const f1 = 2 * precision * recall / Math.max(1e-9, precision + recall);
    console.log(`${threshold.toFixed(2)}       ${(precision * 100).toFixed(1)}%       ${(recall * 100).toFixed(1)}%   ${(f1 * 100).toFixed(1)}%   ${fn}             ${fp}`);
  }
  if (extractor.dispose) await extractor.dispose();
  else if (extractor.model && extractor.model.dispose) await extractor.model.dispose();
})().catch((err) => {
  console.error('[focus-eval] failed:', err.message);
  process.exitCode = 1;
});
