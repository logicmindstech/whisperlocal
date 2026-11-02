# WhisperLocal

[![DOI](https://zenodo.org/badge/1442503754.svg)](https://doi.org/10.5281/zenodo.23876605)

A browser extension that transcribes speech to text **locally in your browser** using a Whisper model. Audio is processed on your own device, so nothing is sent to an outside server for transcription.

## Features

- Speech-to-text powered by Whisper, running fully on-device
- Runs in the browser via [Transformers.js](https://github.com/huggingface/transformers.js) and ONNX Runtime (WebAssembly)
- Transcription runs in a Web Worker, so the interface stays responsive
- Simple popup to launch the transcriber

## Project Structure

```
WhisperLocal_Extension/
├── lib/
│   ├── transformers.min.js                    # Transformers.js library
│   ├── ort-wasm-simd-threaded.asyncify.mjs    # ONNX Runtime (WASM) loader
│   └── ort-wasm-simd-threaded.asyncify.wasm   # ONNX Runtime (WASM) binary
├── manifest.json       # Extension configuration
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
├── transcriber.html    # Transcriber page UI
├── transcriber.js      # Transcriber logic
└── worker.js           # Web Worker that runs the Whisper model
```

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/logicmindstech/whisperlocal.git
   ```
2. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `whisperlocal` folder.
5. Pin the extension to your toolbar and click its icon to open the popup.

## Usage

1. Click the WhisperLocal icon in your toolbar.
2. Open the transcriber from the popup.
3. Allow microphone access if prompted, then start transcribing.

> The first run may take a while because the Whisper model has to be downloaded and loaded. After that, it should start faster.

## Tech Stack

- HTML, JavaScript
- [Transformers.js](https://github.com/huggingface/transformers.js)
- [ONNX Runtime Web](https://onnxruntime.ai/) (WebAssembly)
- Web Workers
- Browser Extension (Manifest V3)

## Notes

- Requires a Chromium-based browser (Chrome, Edge, Brave) with WebAssembly support.
- Transcription speed depends on your device's CPU.

## Author

**Marvin Arrevillaga**
[LogicMinds Technologies, Inc.](https://github.com/logicmindstech)

## License

Add a license of your choice (for example, MIT) before sharing this project publicly.
