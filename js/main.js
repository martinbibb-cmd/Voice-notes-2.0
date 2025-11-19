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
      currentSection: 'customer-info',
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
    const sectionSelect = document.getElementById('current-section');
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

    sectionSelect.addEventListener('change', (e) => {
      this.state.currentSection = e.target.value;
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

  updateSections(transcript) {
    // Parse transcript into sections based on current section
    const section = this.state.currentSection;

    if (!this.state.currentJob.sections[section]) {
      this.state.currentJob.sections[section] = {
        name: this.getSectionName(section),
        content: '',
        timestamp: new Date().toISOString()
      };
    }

    this.state.currentJob.sections[section].content = transcript;
    this.renderSections();
  }

  getSectionName(sectionId) {
    const names = {
      'customer-info': 'Customer Information',
      'site-survey': 'Site Survey',
      'system-details': 'System Details',
      'measurements': 'Measurements',
      'requirements': 'Customer Requirements',
      'safety-notes': 'Safety Notes',
      'recommendations': 'Recommendations',
      'next-steps': 'Next Steps'
    };
    return names[sectionId] || sectionId;
  }

  renderSections() {
    const sectionsList = document.getElementById('sections-list');
    const sections = Object.values(this.state.currentJob.sections);

    if (sections.length === 0) {
      sectionsList.innerHTML = '<p style="color: var(--muted); text-align: center;">No sections captured yet. Start recording to begin.</p>';
      return;
    }

    sectionsList.innerHTML = sections.map(section => `
      <div class="section-item">
        <h4>${section.name}</h4>
        <p>${section.content || '<em>No content yet</em>'}</p>
      </div>
    `).join('');
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
