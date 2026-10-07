# Focus Capture

Focus Capture is an optional local filter for new text, code, and URL clips. It is available to Pro (up to eight topics) and Max (up to sixteen). Both plans can combine the curated topic catalog with custom topics; custom topics count toward the plan limit. Free keeps normal capture behavior, and the model is not loaded for Free.

The curated catalog covers technology, career and business, money and planning, knowledge, and everyday life. A custom topic has a short name and description; the description is embedded locally like a curated topic prompt.

The bundled MiniLM ONNX model compares a clip with descriptions of the selected topics. Raw clipboard content stays on this PC. The model is loaded only when an entitled user enables the feature; classification errors fall back to normal capture. Images and old history are not classified.

Clips classified outside the selected topics go to Focus Review, in a per-account file under Electron's user data directory. They do not enter clipboard history or sync unless the user chooses **Keep in history**. A grouped Windows reminder appears about 24 hours after a clip enters the queue. Unkept clips expire after 48 hours while ClipDows is running; expired queue entries are purged when the app next starts if it was closed at expiry.

The current threshold is tuned with a small synthetic evaluation set, not a representative sample of personal clipboard use. `npm run eval:focus-model` reports precision, recall, and false keeps/discards for the bundled quantized model. Those results should not be described as general application accuracy; tune with representative, locally labeled examples before making an accuracy claim.

To recreate the bundled model assets, run `npm run download:focus-model`. The script pins the ONNX Community MiniLM model revision and includes its Apache 2.0 license and notice. Assets are included by the existing `assets/**/*` build rule and unpacked for ONNX Runtime. The application does not download model assets while running.
