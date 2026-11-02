import { pipeline, env } from './lib/transformers.min.js';

// Load ONNX runtime files from the extension's lib/ folder
env.backends.onnx.wasm.wasmPaths = new URL('./lib/', import.meta.url).href;
env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false;   // download model from Hugging Face

let transcriber = null;

self.onmessage = async (event) => {
  const { type, data } = event.data;
  if (type !== 'START_TRANSCRIPTION') return;

  try {
    const audio = data.audioData;
    if (!audio || audio.length === 0) throw new Error('Empty audio data.');

    const t0 = performance.now();

    if (!transcriber) {
      self.postMessage({ type: 'STATUS_UPDATE', data: 'Loading Whisper model...' });
      transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-base.en',
        {
          device: 'wasm',
          progress_callback: (p) => {
            if (p.status === 'progress') {
              self.postMessage({ type: 'DOWNLOAD_PROGRESS', data: { progress: p.progress } });
            }
          },
        }
      );
    }

    self.postMessage({ type: 'STATUS_UPDATE', data: 'Transcribing...' });
    const result = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
	  no_repeat_ngram_size: 3,
	  repetition_penalty: 1.3,
    });

    self.postMessage({
      type: 'TRANSCRIPTION_COMPLETE',
      data: {
        text: result.text,
        chunks: result.chunks,
        duration: ((performance.now() - t0) / 1000).toFixed(1),
      },
    });
  } catch (err) {
    self.postMessage({ type: 'TRANSCRIPTION_ERROR', data: err.message });
    console.error(err);
  }
};