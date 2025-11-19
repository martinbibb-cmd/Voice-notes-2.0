// Enhanced Voice Recorder Module
// Integrates Depot-voice-notes AI transcription capabilities
// with audio visualization and adaptive chunking

export default class VoiceRecorder {
  constructor() {
    this.recognition = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.transcript = '';
    this.interimTranscript = '';
    this.isRecording = false;
    this.isPaused = false;
    this.listeners = {};
    this.audioContext = null;
    this.analyser = null;
    this.animationId = null;
    this.startTime = null;
    this.pausedTime = 0;

    // Network adaptive settings
    this.chunkInterval = 10000; // Default 10s
    this.networkSpeed = 'unknown';

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-GB';

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final) {
        this.transcript += final;
        this.emit('transcript', this.transcript);
      }

      if (interim) {
        this.interimTranscript = interim;
        this.emit('interim', interim);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.emit('error', event.error);
    };

    this.recognition.onend = () => {
      if (this.isRecording && !this.isPaused) {
        try {
          this.recognition.start();
        } catch (e) {
          console.warn('Could not restart recognition:', e);
        }
      }
    };
  }

  async detectNetworkSpeed() {
    try {
      const start = performance.now();
      await fetch('https://www.google.com/favicon.ico', { cache: 'no-store' });
      const latency = performance.now() - start;

      if (latency < 200) {
        this.networkSpeed = 'fast';
        this.chunkInterval = 10000;
      } else if (latency < 500) {
        this.networkSpeed = 'medium';
        this.chunkInterval = 20000;
      } else {
        this.networkSpeed = 'slow';
        this.chunkInterval = 30000;
      }

      this.emit('network-speed', { speed: this.networkSpeed, latency });
    } catch (error) {
      this.networkSpeed = 'offline';
      this.emit('network-speed', { speed: 'offline', latency: -1 });
    }
  }

  async start() {
    try {
      // Detect network speed for adaptive chunking
      await this.detectNetworkSpeed();

      // Start speech recognition
      if (this.recognition) {
        this.recognition.start();
      }

      // Start audio recording with visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await this.startAudioRecording(stream);
      this.setupAudioVisualization(stream);

      this.isRecording = true;
      this.isPaused = false;
      this.transcript = '';
      this.startTime = Date.now();

      this.emit('started');
      console.log('Voice recording started');
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      throw error;
    }
  }

  async startAudioRecording(stream) {
    // Determine best audio codec
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    let mimeType = 'audio/webm';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        this.emit('chunk', event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      this.emit('audio', audioBlob);

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());

      // Stop visualization
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      if (this.audioContext) {
        this.audioContext.close();
      }
    };

    // Start with adaptive chunking interval
    this.mediaRecorder.start(this.chunkInterval);
  }

  setupAudioVisualization(stream) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(stream);

      source.connect(this.analyser);
      this.analyser.fftSize = 256;

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const visualize = () => {
        if (!this.isRecording || this.isPaused) return;

        this.animationId = requestAnimationFrame(visualize);
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const normalizedVolume = average / 255;

        this.emit('audio-level', normalizedVolume);
        this.emit('waveform', dataArray);
      };

      visualize();
    } catch (error) {
      console.warn('Audio visualization setup failed:', error);
    }
  }

  pause() {
    if (!this.isRecording) return;

    if (this.recognition) {
      this.recognition.stop();
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.isPaused = true;
    this.pausedTime = Date.now();
    this.emit('paused');
    console.log('Voice recording paused');
  }

  resume() {
    if (!this.isRecording) return;

    if (this.recognition) {
      this.recognition.start();
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }

    this.isPaused = false;
    this.emit('resumed');
    console.log('Voice recording resumed');
  }

  async stop() {
    if (!this.isRecording) return;

    if (this.recognition) {
      this.recognition.stop();
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.isRecording = false;
    this.isPaused = false;

    this.emit('stopped');
    console.log('Voice recording stopped');
  }

  async quickCapture(duration = 5000) {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        reject(new Error('Speech Recognition not supported'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-GB';

      let result = '';

      recognition.onresult = (event) => {
        result = event.results[0][0].transcript;
      };

      recognition.onerror = (event) => {
        reject(event.error);
      };

      recognition.onend = () => {
        resolve(result);
      };

      recognition.start();

      setTimeout(() => {
        recognition.stop();
      }, duration);
    });
  }

  getTranscript() {
    return this.transcript;
  }

  clearTranscript() {
    this.transcript = '';
    this.interimTranscript = '';
  }

  getDuration() {
    if (!this.startTime) return 0;
    const now = this.isPaused ? this.pausedTime : Date.now();
    return Math.floor((now - this.startTime) / 1000);
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}
