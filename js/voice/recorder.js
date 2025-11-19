// Voice Recorder Module
// Handles audio recording and speech-to-text transcription

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

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    // Check for browser support
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
      // Restart if still recording and not paused
      if (this.isRecording && !this.isPaused) {
        this.recognition.start();
      }
    };
  }

  async start() {
    try {
      // Start speech recognition
      if (this.recognition) {
        this.recognition.start();
      }

      // Start audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await this.startAudioRecording(stream);

      this.isRecording = true;
      this.isPaused = false;
      this.transcript = '';

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
      }
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      this.emit('audio', audioBlob);

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    };

    this.mediaRecorder.start(1000); // Collect data every second
  }

  pause() {
    if (!this.isRecording) return;

    if (this.recognition) {
      this.recognition.stop();
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }

    this.isPaused = true;
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

    this.isRecording = false;
    this.isPaused = false;

    console.log('Voice recording stopped');
  }

  async quickCapture(duration = 5000) {
    // Quick capture for photo annotations
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

      // Auto-stop after duration
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
