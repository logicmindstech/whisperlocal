const worker = new Worker('worker.js', { type: 'module' });
worker.onerror = (e) => {
    console.error('Worker failed to load:', e);
    updateStatus(`Worker error: ${e.message || 'failed to load worker.js (see console)'}`, false);
};

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusText = document.getElementById('status-text');
const progressWrapper = document.getElementById('progress-wrapper');
const progressBar = document.getElementById('progress-bar');
const outputBox = document.getElementById('output-box');

const btnCopy = document.getElementById('btn-copy');
const btnSrt = document.getElementById('btn-srt');
const btnTxt = document.getElementById('btn-txt');

let computedChunks = []; 

worker.onmessage = (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'DOWNLOAD_PROGRESS':
            if (progressWrapper) progressWrapper.style.display = 'block';
            updateStatus(`Downloading AI Model weights: ${Math.round(data.progress)}%`, true);
            if (progressBar) progressBar.style.width = `${data.progress}%`;
            break;
            
        case 'STATUS_UPDATE':
            if (progressWrapper) progressWrapper.style.display = 'none';
            updateStatus(data, true);
            break;
            
        case 'PARTIAL_RESULT':
            outputBox.value = data;
            outputBox.scrollTop = outputBox.scrollHeight;
            break;
            
        case 'TRANSCRIPTION_COMPLETE':
            updateStatus(`Done! Processed in ${data.duration}s.`, true);
            outputBox.value = data.text;
            computedChunks = data.chunks;
            enableExportButtons();
            break;
            
        case 'TRANSCRIPTION_ERROR':
            if (progressWrapper) progressWrapper.style.display = 'none';
            updateStatus(`Pipeline Error: ${data}`, false);
            break;
    }
};

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

// Streamlined Memory-Safe Audio Reader
async function handleFile(file) {
    updateStatus(`Processing file container: ${file.name}...`, true);
    outputBox.value = "";
    disableExportButtons();

    try {
        // Build an offline audio context that won't run out of browser memory
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Read file using FileReader to keep browser UI active
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                updateStatus("Extracting audio channels (Demuxing)...", true);
                const fileBuffer = e.target.result;
                
                audioCtx.decodeAudioData(fileBuffer, (decodedBuffer) => {
                    updateStatus("Resampling audio to 16kHz for AI engine...", true);
                    
                    // Force downsample to 16000Hz standard Mono Float32 PCM
                    const offlineCtx = new OfflineAudioContext(1, Math.ceil(decodedBuffer.duration * 16000), 16000);
                    const bufferSource = offlineCtx.createBufferSource();
                    bufferSource.buffer = decodedBuffer;
                    bufferSource.connect(offlineCtx.destination);
                    bufferSource.start();
                    
                    offlineCtx.startRendering().then((renderedBuffer) => {
                        const rawChannelData = renderedBuffer.getChannelData(0);
                        updateStatus("Warming up local Whisper model...", true);
                        
                        worker.postMessage({
                            type: 'START_TRANSCRIPTION',
                            data: { audioData: rawChannelData }
                        });
                    }).catch(err => {
                        updateStatus(`Resampling failed: ${err.message}`, false);
                    });
                    
                }, (decodeError) => {
                    updateStatus("Error: Browser cannot parse this video codec locally. Try an MP3/WAV file.", false);
                    console.error(decodeError);
                });
            } catch (err) {
                updateStatus(`Buffer failure: ${err.message}`, false);
            }
        };

        reader.readAsArrayBuffer(file);

    } catch (err) {
        updateStatus(`Error: ${err.message}`, false);
        console.error(err);
    }
}

function updateStatus(text, isWorking) {
    statusText.style.display = 'flex';
    statusText.innerText = text;
    statusText.style.color = isWorking ? '#2563eb' : '#dc2626';
}

function enableExportButtons() {
    btnCopy.disabled = false;
    btnSrt.disabled = false;
    btnTxt.disabled = false;
}

function disableExportButtons() {
    btnCopy.disabled = true;
    btnSrt.disabled = true;
    btnTxt.disabled = true;
}

btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(outputBox.value);
    alert("Transcript copied to clipboard!");
});

btnTxt.addEventListener('click', () => {
    downloadBlob(outputBox.value, 'transcript.txt', 'text/plain');
});

btnSrt.addEventListener('click', () => {
    if (!computedChunks || computedChunks.length === 0) return;
    
    let srtContent = "";
    computedChunks.forEach((chunk, index) => {
        const start = formatSRTTime(chunk.timestamp[0]);
        const end = formatSRTTime(chunk.timestamp[1] || chunk.timestamp[0] + 2);
        srtContent += `${index + 1}\n${start} --> ${end}\n${chunk.text.trim()}\n\n`;
    });
    
    downloadBlob(srtContent, 'transcript.srt', 'text/srt');
});

function downloadBlob(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function formatSRTTime(seconds) {
    if (seconds === null || isNaN(seconds)) seconds = 0;
    const date = new Date(null);
    date.setSeconds(seconds);
    const milliseconds = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
    const timeString = date.toISOString().substr(11, 8);
    return `${timeString},${milliseconds}`;
}