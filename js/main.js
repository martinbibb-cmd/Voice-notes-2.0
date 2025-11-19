// Voice Notes 2.0 - Main Application Controller
// Integrates voice recording, photo markup, and recommendations

// Import modules (will be created)
import VoiceRecorder from './voice/recorder.js';
import PhotoMarkup from './photos/canvas-markup.js';
import RecommendationsEngine from './recommendations/engine.js';
import DocumentGenerator from './documents/customer-pdf.js';
import JobExporter from './storage/job-folders.js';

class VoiceNotes2App {
  constructor() {
    this.voiceRecorder = new VoiceRecorder();
    this.photoMarkup = new PhotoMarkup();
    this.recommendations = new RecommendationsEngine();
    this.documentGenerator = new DocumentGenerator();
    this.jobExporter = new JobExporter();

    // Depot-voice-notes section schema (14 sections)
    this.sectionSchema = [
      { name: 'Needs', order: 1 },
      { name: 'Working at heights', order: 2 },
      { name: 'System characteristics', order: 3 },
      { name: 'Components that require assistance', order: 4 },
      { name: 'Restrictions to work', order: 5 },
      { name: 'External hazards', order: 6 },
      { name: 'Delivery notes', order: 7 },
      { name: 'Office notes', order: 8 },
      { name: 'New boiler and controls', order: 9 },
      { name: 'Flue', order: 10 },
      { name: 'Pipe work', order: 11 },
      { name: 'Disruption', order: 12 },
      { name: 'Customer actions', order: 13 },
      { name: 'Future plans', order: 14 }
    ];

    this.workerUrl = 'https://depot-voice-notes.martinbibb.workers.dev';
    this.processingTranscript = false;
    this.transcriptDebounceTimer = null;
    this.lastProcessedTranscript = '';

    this.state = {
      currentJob: {
        name: '',
        customer: '',
        sections: {},
        photos: [],
        transcript: '',
        audioBlobs: [],
        recommendations: [],
        metadata: {
          created: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
      },
      isRecording: false,
      isPaused: false
    };

    this.init();
  }

  init() {
    console.log('Initializing Voice Notes 2.0...');
    this.setupTabs();
    this.setupVoiceControls();
    this.setupPhotoControls();
    this.setupRecommendations();
    this.setupExport();
    this.loadAutoSave();
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active content
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(targetTab).classList.add('active');
      });
    });
  }

  setupVoiceControls() {
    const startBtn = document.getElementById('start-recording');
    const pauseBtn = document.getElementById('pause-recording');
    const stopBtn = document.getElementById('stop-recording');
    const transcriptArea = document.getElementById('transcript');
    const statusBadge = document.getElementById('status-badge');

    startBtn.addEventListener('click', async () => {
      try {
        await this.voiceRecorder.start();
        this.state.isRecording = true;
        this.state.isPaused = false;

        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;

        statusBadge.textContent = 'Recording...';
        statusBadge.className = 'status-badge status-recording';

        this.startAutoSave();
      } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Could not start recording. Please check microphone permissions.');
      }
    });

    pauseBtn.addEventListener('click', () => {
      if (this.state.isPaused) {
        this.voiceRecorder.resume();
        this.state.isPaused = false;
        pauseBtn.textContent = 'Pause';
        statusBadge.textContent = 'Recording...';
      } else {
        this.voiceRecorder.pause();
        this.state.isPaused = true;
        pauseBtn.textContent = 'Resume';
        statusBadge.textContent = 'Paused';
      }
    });

    stopBtn.addEventListener('click', async () => {
      await this.voiceRecorder.stop();
      this.state.isRecording = false;
      this.state.isPaused = false;

      startBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      pauseBtn.textContent = 'Pause';

      statusBadge.textContent = 'Ready';
      statusBadge.className = 'status-badge status-ready';

      this.stopAutoSave();
      this.saveToLocalStorage();
    });

    // Listen for transcript updates from voice recorder
    this.voiceRecorder.on('transcript', (text) => {
      transcriptArea.value = text;
      this.state.transcript = text;
      this.updateSections(text);
    });

    this.voiceRecorder.on('audio', (blob) => {
      this.state.currentJob.audioBlobs.push(blob);
    });

    // Process Now button
    const processNowBtn = document.getElementById('process-now-btn');
    processNowBtn.addEventListener('click', () => {
      const transcript = transcriptArea.value;
      if (transcript && transcript.length > 10) {
        // Clear debounce timer and process immediately
        if (this.transcriptDebounceTimer) {
          clearTimeout(this.transcriptDebounceTimer);
        }
        this.lastProcessedTranscript = ''; // Force reprocessing
        this.processTranscriptWithAI(transcript);
      } else {
        alert('Please record some voice notes first before processing.');
      }
    });
  }

  setupPhotoControls() {
    const takePhotoBtn = document.getElementById('take-photo');
    const uploadPhotoBtn = document.getElementById('upload-photo');
    const photoInput = document.getElementById('photo-input');
    const canvasContainer = document.getElementById('canvas-container');
    const markupTools = document.getElementById('markup-tools');
    const annotateVoiceBtn = document.getElementById('annotate-with-voice');
    const photoAnnotation = document.getElementById('photo-annotation');

    takePhotoBtn.addEventListener('click', async () => {
      try {
        const photoBlob = await this.capturePhoto();
        this.loadPhotoForMarkup(photoBlob);
      } catch (error) {
        console.error('Failed to capture photo:', error);
        alert('Could not access camera. Please check camera permissions.');
      }
    });

    uploadPhotoBtn.addEventListener('click', () => {
      photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadPhotoForMarkup(file);
      }
    });

    // Markup tool buttons
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.photoMarkup.setTool(tool);

        // Visual feedback
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.getElementById('clear-markup').addEventListener('click', () => {
      if (confirm('Clear all markup?')) {
        this.photoMarkup.clear();
      }
    });

    document.getElementById('undo-markup').addEventListener('click', () => {
      this.photoMarkup.undo();
    });

    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
      this.photoMarkup.zoomIn();
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
      this.photoMarkup.zoomOut();
    });

    document.getElementById('zoom-reset').addEventListener('click', () => {
      this.photoMarkup.zoomReset();
    });

    // Pan controls
    document.getElementById('pan-up').addEventListener('click', () => {
      this.photoMarkup.panUp();
    });

    document.getElementById('pan-down').addEventListener('click', () => {
      this.photoMarkup.panDown();
    });

    document.getElementById('pan-left').addEventListener('click', () => {
      this.photoMarkup.panLeft();
    });

    document.getElementById('pan-right').addEventListener('click', () => {
      this.photoMarkup.panRight();
    });

    document.getElementById('save-marked-photo').addEventListener('click', () => {
      const annotation = photoAnnotation.value;
      const markedPhoto = this.photoMarkup.export();

      this.state.currentJob.photos.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        section: this.state.currentSection,
        annotation: annotation,
        original: this.photoMarkup.originalImage,
        marked: markedPhoto
      });

      this.updatePhotoGallery();
      photoAnnotation.value = '';

      // Hide canvas and tools
      canvasContainer.classList.remove('active');
      markupTools.style.display = 'none';

      alert('Photo saved with markup!');
    });

    annotateVoiceBtn.addEventListener('click', async () => {
      // Quick voice annotation for current photo
      try {
        const annotation = await this.voiceRecorder.quickCapture(5000); // 5 second capture
        photoAnnotation.value = annotation;
      } catch (error) {
        console.error('Voice annotation failed:', error);
      }
    });
  }

  setupRecommendations() {
    const generateBtn = document.getElementById('generate-recommendations');

    generateBtn.addEventListener('click', () => {
      const profile = {
        customerName: document.getElementById('customer-name').value,
        propertyType: document.getElementById('property-type').value,
        bedrooms: parseInt(document.getElementById('bedrooms').value),
        bathrooms: parseInt(document.getElementById('bathrooms').value),
        occupants: parseInt(document.getElementById('occupants').value),
        currentSystem: document.getElementById('current-system').value
      };

      // Pass transcript for context-aware recommendations
      const transcript = this.state.transcript;
      const recommendations = this.recommendations.generate(profile, transcript);
      this.state.currentJob.recommendations = recommendations;
      this.displayRecommendations(recommendations);
    });
  }

  setupExport() {
    // Load job functionality
    const loadJsonBtn = document.getElementById('load-json-job');
    const loadAudioBtn = document.getElementById('load-audio-file');
    const jsonJobInput = document.getElementById('json-job-input');
    const audioFileInput = document.getElementById('audio-file-input');

    loadJsonBtn.addEventListener('click', () => {
      jsonJobInput.click();
    });

    loadAudioBtn.addEventListener('click', () => {
      audioFileInput.click();
    });

    jsonJobInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const jobData = await this.jobExporter.importFromJSON(file);
          this.loadJobData(jobData);
          alert('Job loaded successfully!');
        } catch (error) {
          console.error('Failed to load JSON job:', error);
          alert('Failed to load job. Please check the file format.');
        }
      }
    });

    audioFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const audioData = await this.jobExporter.importAudioFile(file);
          this.state.currentJob.audioBlobs.push(audioData.blob);
          alert(`Audio file "${audioData.filename}" loaded! You can now process it for transcript generation.`);
          // TODO: Add audio processing/transcription functionality
        } catch (error) {
          console.error('Failed to load audio file:', error);
          alert('Failed to load audio file.');
        }
      }
    });

    // Export functionality
    document.getElementById('export-customer-pdf').addEventListener('click', () => {
      this.documentGenerator.generateCustomerPDF(this.state.currentJob);
    });

    document.getElementById('export-internal-folder').addEventListener('click', () => {
      this.jobExporter.exportJobFolder(this.state.currentJob);
    });

    document.getElementById('export-transcript').addEventListener('click', () => {
      this.exportTranscript();
    });

    document.getElementById('export-all-photos').addEventListener('click', () => {
      this.exportPhotos();
    });

    document.getElementById('export-json').addEventListener('click', () => {
      this.jobExporter.exportToJSON(this.state.currentJob);
    });

    document.getElementById('preview-customer-doc').addEventListener('click', () => {
      this.documentGenerator.preview(this.state.currentJob);
    });

    // Update export summary
    this.updateExportSummary();
  }

  async capturePhoto() {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');

      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          video.srcObject = stream;
          video.play();

          video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            stream.getTracks().forEach(track => track.stop());

            canvas.toBlob(blob => {
              resolve(blob);
            }, 'image/jpeg', 0.95);
          });
        })
        .catch(reject);
    });
  }

  loadPhotoForMarkup(imageSource) {
    const canvasContainer = document.getElementById('canvas-container');
    const markupTools = document.getElementById('markup-tools');

    this.photoMarkup.loadImage(imageSource);
    canvasContainer.classList.add('active');
    markupTools.style.display = 'flex';
  }

  async updateSections(transcript) {
    // AI-powered section auto-population using Cloudflare Worker
    if (!transcript || transcript.length < 10) {
      return;
    }

    // Debounce: wait for user to stop speaking
    if (this.transcriptDebounceTimer) {
      clearTimeout(this.transcriptDebounceTimer);
    }

    this.transcriptDebounceTimer = setTimeout(() => {
      this.processTranscriptWithAI(transcript);
    }, 3000); // Process 3 seconds after last transcript update
  }

  async processTranscriptWithAI(transcript) {
    // Skip if already processing or transcript hasn't changed significantly
    if (this.processingTranscript) {
      return;
    }

    const transcriptLength = transcript.length;
    const lastLength = this.lastProcessedTranscript.length;

    // Only process if transcript has grown by at least 50 characters
    if (transcriptLength - lastLength < 50 && this.lastProcessedTranscript.length > 0) {
      return;
    }

    this.processingTranscript = true;
    this.lastProcessedTranscript = transcript;

    // Show processing indicator
    const sectionsList = document.getElementById('sections-list');
    const originalContent = sectionsList.innerHTML;
    if (Object.keys(this.state.currentJob.sections).length === 0) {
      sectionsList.innerHTML = '<p style="color: var(--primary); text-align: center;">🤖 AI is processing your notes...</p>';
    }

    try {
      // Get already captured sections
      const alreadyCaptured = Object.values(this.state.currentJob.sections).map(s => ({
        section: s.name,
        plainText: s.content
      }));

      // Call Cloudflare Worker
      const response = await fetch(`${this.workerUrl}/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript: transcript,
          expectedSections: this.sectionSchema.map(s => s.name),
          alreadyCaptured: alreadyCaptured,
          depotSections: this.sectionSchema
        })
      });

      if (!response.ok) {
        throw new Error(`Worker responded with ${response.status}`);
      }

      const data = await response.json();

      // Update sections from AI response
      if (data.sections && Array.isArray(data.sections)) {
        data.sections.forEach(section => {
          const sectionName = section.section || section.name;
          if (sectionName) {
            this.state.currentJob.sections[sectionName] = {
              name: sectionName,
              content: section.plainText || section.content || '',
              naturalLanguage: section.naturalLanguage || '',
              timestamp: new Date().toISOString()
            };
          }
        });

        this.renderSections();
      }
    } catch (error) {
      console.error('Failed to process transcript with AI:', error);
      // Fallback: just update a general "Notes" section
      this.state.currentJob.sections['Notes'] = {
        name: 'Notes',
        content: transcript,
        timestamp: new Date().toISOString()
      };
      this.renderSections();
    } finally {
      this.processingTranscript = false;
    }
  }

  renderSections() {
    const sectionsList = document.getElementById('sections-list');

    // Sort sections by the schema order
    const sectionOrder = {};
    this.sectionSchema.forEach(s => {
      sectionOrder[s.name] = s.order;
    });

    const sections = Object.values(this.state.currentJob.sections).sort((a, b) => {
      const orderA = sectionOrder[a.name] || 999;
      const orderB = sectionOrder[b.name] || 999;
      return orderA - orderB;
    });

    if (sections.length === 0) {
      sectionsList.innerHTML = '<p style="color: var(--muted); text-align: center;">No sections captured yet. Start recording to begin.</p>';
      return;
    }

    sectionsList.innerHTML = sections.map(section => {
      const hasContent = section.content && section.content.trim().length > 0;
      const hasNaturalLanguage = section.naturalLanguage && section.naturalLanguage.trim().length > 0;

      return `
        <div class="section-item">
          <h4>${section.name}</h4>
          ${hasContent ? `
            <div class="section-content">
              <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${section.content}</pre>
            </div>
          ` : '<p style="color: var(--muted); font-style: italic;">No content yet</p>'}
          ${hasNaturalLanguage ? `
            <div class="section-natural-language" style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 6px; border-left: 3px solid var(--primary);">
              <strong style="color: var(--primary); font-size: 0.9em;">AI Summary:</strong>
              <p style="margin: 8px 0 0 0;">${section.naturalLanguage}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  updatePhotoGallery() {
    const gallery = document.getElementById('photo-gallery');
    const photos = this.state.currentJob.photos;

    if (photos.length === 0) {
      gallery.innerHTML = '<p style="color: var(--muted); text-align: center; grid-column: 1/-1;">No photos yet. Take or upload photos to get started.</p>';
      return;
    }

    gallery.innerHTML = photos.map(photo => `
      <div class="photo-item" data-photo-id="${photo.id}">
        <img src="${photo.marked}" alt="Photo">
        <div class="photo-caption">${photo.annotation || 'No annotation'}</div>
      </div>
    `).join('');
  }

  displayRecommendations(recommendations) {
    const output = document.getElementById('recommendations-output');

    output.innerHTML = recommendations.map((rec, index) => {
      const isBest = index === 0;
      const isMentioned = rec.discussionContext?.mentioned;

      return `
        <div class="recommendation-card ${isBest ? 'best' : ''} ${isMentioned ? 'discussed' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <h3 style="margin: 0;">${isBest ? '✓ ' : ''}${rec.title}</h3>
            ${isMentioned ? '<span class="badge-discussed">Discussed in survey</span>' : ''}
          </div>

          <p style="color: var(--muted); margin: 8px 0 16px 0;">${rec.summary}</p>

          ${rec.fab ? this.renderFAB(rec.fab) : this.renderTraditionalView(rec)}

          <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
            <strong>Why this is recommended for you:</strong>
            <p style="margin: 8px 0 0 0;">${rec.rationale}</p>
          </div>

          ${this.renderDiscussionContext(rec.discussionContext)}
        </div>
      `;
    }).join('');
  }

  renderFAB(fab) {
    return `
      <div class="fab-analysis">
        <div class="fab-section">
          <h4 class="fab-heading">Features</h4>
          <ul class="fab-list">
            ${fab.features.map(f => `
              <li class="${f.highlighted ? 'highlighted' : ''}">
                ${f.text}
                ${f.highlighted ? `<span class="highlight-reason">${f.reason}</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="fab-section">
          <h4 class="fab-heading">Advantages</h4>
          <ul class="fab-list">
            ${fab.advantages.map(a => `
              <li class="${a.highlighted ? 'highlighted' : ''}">
                ${a.text}
                ${a.highlighted ? `<span class="highlight-reason">${a.reason}</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="fab-section">
          <h4 class="fab-heading">Benefits</h4>
          <ul class="fab-list">
            ${fab.benefits.map(b => `
              <li class="${b.highlighted ? 'highlighted' : ''}">
                ${b.text}
                ${b.highlighted ? `<span class="highlight-reason">${b.reason}</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  renderTraditionalView(rec) {
    if (!rec.strengths || !rec.limitations) return '';

    return `
      <div class="features-list">
        <div class="features-col">
          <h4>Strengths & Benefits</h4>
          <ul>
            ${rec.strengths.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
        <div class="features-col limitations">
          <h4>Considerations</h4>
          <ul>
            ${rec.limitations.map(l => `<li>${l}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  renderDiscussionContext(context) {
    if (!context || (!context.mentioned && context.relatedIssues.length === 0)) {
      return '';
    }

    let html = '<div class="discussion-context">';

    if (context.mentioned && context.excerpts.length > 0) {
      html += `
        <div class="context-section">
          <strong>You mentioned:</strong>
          <div class="context-excerpts">
            ${context.excerpts.slice(0, 2).map(exc =>
              `<div class="excerpt">"${exc}"</div>`
            ).join('')}
          </div>
        </div>
      `;
    }

    if (context.relatedIssues.length > 0) {
      html += `
        <div class="context-section">
          <strong>Addresses your concerns:</strong>
          <ul class="context-issues">
            ${context.relatedIssues.map(issue => `
              <li class="issue-${issue.severity}">
                <strong>${issue.type.replace(/_/g, ' ')}</strong>
                ${issue.excerpts[0] ? `<div class="excerpt-mini">"${issue.excerpts[0]}"</div>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  updateExportSummary() {
    document.getElementById('export-sections-count').textContent =
      Object.keys(this.state.currentJob.sections).length;
    document.getElementById('export-photos-count').textContent =
      this.state.currentJob.photos.length;
    document.getElementById('export-recommendations-count').textContent =
      this.state.currentJob.recommendations.length;
  }

  exportTranscript() {
    const transcript = this.state.transcript;
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${Date.now()}.txt`;
    a.click();
  }

  exportPhotos() {
    // Create a simple download of all photos
    // In a real implementation, this would create a ZIP file
    this.state.currentJob.photos.forEach((photo, index) => {
      const a = document.createElement('a');
      a.href = photo.marked;
      a.download = `photo_${index + 1}.png`;
      a.click();
    });
  }

  loadJobData(jobData) {
    // Load job data into the current state
    this.state.currentJob = {
      ...jobData,
      metadata: {
        ...jobData.metadata,
        lastModified: new Date().toISOString()
      }
    };

    // Update transcript if present
    if (jobData.transcript) {
      this.state.transcript = jobData.transcript;
      document.getElementById('transcript').value = jobData.transcript;
    }

    // Update job name if present
    if (jobData.name) {
      document.getElementById('job-name').value = jobData.name;
    }

    // Update customer name if present
    if (jobData.customer) {
      document.getElementById('customer-name').value = jobData.customer;
    }

    // Update sections display
    if (jobData.sections) {
      this.updateSectionsDisplay();
    }

    // Update photo gallery
    if (jobData.photos && jobData.photos.length > 0) {
      this.updatePhotoGallery();
    }

    // Update recommendations display
    if (jobData.recommendations && jobData.recommendations.length > 0) {
      this.displayRecommendations(jobData.recommendations);
    }

    // Update export summary
    this.updateExportSummary();
  }

  startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      this.saveToLocalStorage();
    }, 30000); // Every 30 seconds
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem('voiceNotes2_autosave', JSON.stringify(this.state.currentJob));
      console.log('Auto-saved to localStorage');
    } catch (error) {
      console.error('Failed to auto-save:', error);
    }
  }

  loadAutoSave() {
    try {
      const saved = localStorage.getItem('voiceNotes2_autosave');
      if (saved) {
        const data = JSON.parse(saved);
        if (confirm('Found a previously saved session. Would you like to restore it?')) {
          this.state.currentJob = data;
          this.renderSections();
          this.updatePhotoGallery();
          if (data.recommendations.length > 0) {
            this.displayRecommendations(data.recommendations);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load auto-save:', error);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new VoiceNotes2App();
});
