const path = require('path');
const { app } = require('electron');

const MODEL_ID = 'onnx-community/all-MiniLM-L6-v2-ONNX';

function modelRoot() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'focus-model');
  return path.resolve(__dirname, '../../../assets/focus-model');
}

async function createExtractor() {
  const { env, pipeline } = await import('@huggingface/transformers');
  env.localModelPath = modelRoot();
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  return pipeline('feature-extraction', MODEL_ID, { dtype: 'q4', local_files_only: true });
}

module.exports = { createExtractor, MODEL_ID };
