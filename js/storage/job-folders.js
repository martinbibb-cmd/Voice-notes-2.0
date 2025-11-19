// Job Folder Exporter
// Creates comprehensive job folders with all notes, photos, audio, and documents

export default class JobExporter {
  constructor() {
    this.zipSupported = typeof JSZip !== 'undefined';
  }

  async exportJobFolder(jobData) {
    // Create a comprehensive job folder as a downloadable package
    const folderStructure = this.createJobFolderStructure(jobData);

    // For now, download files individually
    // In production, this would use JSZip to create a single ZIP file
    await this.downloadJobFiles(folderStructure, jobData);
  }

  createJobFolderStructure(jobData) {
    const timestamp = new Date().toISOString().split('T')[0];
    const jobName = jobData.name || `Job_${timestamp}`;

    return {
      name: jobName,
      internal: {
        'full-transcript.txt': this.createTranscriptFile(jobData),
        'metadata.json': this.createMetadataFile(jobData),
        sections: this.createSectionFiles(jobData.sections),
        photos: {
          original: this.extractOriginalPhotos(jobData.photos),
          annotated: this.extractAnnotatedPhotos(jobData.photos),
          marked: this.extractMarkedPhotos(jobData.photos)
        },
        audio: this.extractAudioFiles(jobData.audioBlobs)
      },
      customer: {
        'recommendations_report.html': this.createCustomerReport(jobData)
      }
    };
  }

  createTranscriptFile(jobData) {
    let transcript = `FULL TRANSCRIPT\n`;
    transcript += `=================\n\n`;
    transcript += `Job: ${jobData.name || 'Unnamed'}\n`;
    transcript += `Date: ${new Date(jobData.metadata?.created || Date.now()).toLocaleDateString()}\n`;
    transcript += `Customer: ${jobData.customer || 'Not specified'}\n\n`;
    transcript += `---\n\n`;
    transcript += jobData.transcript || 'No transcript available';

    return transcript;
  }

  createMetadataFile(jobData) {
    const metadata = {
      version: '2.0',
      created: jobData.metadata?.created || new Date().toISOString(),
      lastModified: jobData.metadata?.lastModified || new Date().toISOString(),
      customer: jobData.customer || '',
      jobName: jobData.name || '',
      sectionCount: Object.keys(jobData.sections || {}).length,
      photoCount: (jobData.photos || []).length,
      recommendationCount: (jobData.recommendations || []).length,
      sections: Object.keys(jobData.sections || {}),
      hasAudio: (jobData.audioBlobs || []).length > 0
    };

    return JSON.stringify(metadata, null, 2);
  }

  createSectionFiles(sections) {
    if (!sections) return {};

    const files = {};

    Object.entries(sections).forEach(([key, section]) => {
      const filename = `${key}.txt`;
      let content = `${section.name}\n`;
      content += `${'='.repeat(section.name.length)}\n\n`;
      content += `Created: ${new Date(section.timestamp).toLocaleString()}\n\n`;
      content += section.content || 'No content';

      files[filename] = content;
    });

    return files;
  }

  extractOriginalPhotos(photos) {
    if (!photos) return {};

    const files = {};

    photos.forEach((photo, index) => {
      files[`photo_${index + 1}_original.png`] = photo.original;
    });

    return files;
  }

  extractAnnotatedPhotos(photos) {
    if (!photos) return {};

    const files = {};

    photos.forEach((photo, index) => {
      const filename = `photo_${index + 1}_annotated.txt`;
      let content = `Photo ${index + 1}\n`;
      content += `Timestamp: ${new Date(photo.timestamp).toLocaleString()}\n`;
      content += `Section: ${photo.section}\n\n`;
      content += `Annotation:\n${photo.annotation || 'No annotation'}\n`;

      files[filename] = content;
    });

    return files;
  }

  extractMarkedPhotos(photos) {
    if (!photos) return {};

    const files = {};

    photos.forEach((photo, index) => {
      files[`photo_${index + 1}_marked.png`] = photo.marked;
    });

    return files;
  }

  extractAudioFiles(audioBlobs) {
    if (!audioBlobs || audioBlobs.length === 0) return {};

    const files = {};

    audioBlobs.forEach((blob, index) => {
      files[`recording_${index + 1}.webm`] = blob;
    });

    return files;
  }

  createCustomerReport(jobData) {
    // This would use the DocumentGenerator
    // For now, return a simple HTML structure
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Recommendations Report</title>
</head>
<body>
  <h1>Customer Recommendations</h1>
  <p>This is a placeholder for the full customer report.</p>
</body>
</html>
    `;
  }

  async downloadJobFiles(structure, jobData) {
    // Download all files individually
    // In production with JSZip, this would create a single ZIP file

    const timestamp = Date.now();

    // Download transcript
    this.downloadTextFile(
      structure.internal['full-transcript.txt'],
      `${structure.name}_transcript.txt`
    );

    // Download metadata
    this.downloadTextFile(
      structure.internal['metadata.json'],
      `${structure.name}_metadata.json`
    );

    // Download section files
    Object.entries(structure.internal.sections).forEach(([filename, content]) => {
      this.downloadTextFile(content, `${structure.name}_${filename}`);
    });

    // Download photos
    const markedPhotos = structure.internal.photos.marked;
    Object.entries(markedPhotos).forEach(([filename, dataUrl]) => {
      // Photos are already data URLs, trigger download
      this.downloadDataURL(dataUrl, `${structure.name}_${filename}`);
    });

    // Download annotations
    const annotations = structure.internal.photos.annotated;
    Object.entries(annotations).forEach(([filename, content]) => {
      this.downloadTextFile(content, `${structure.name}_${filename}`);
    });

    alert(`Job folder files prepared for download! Files are being downloaded individually. In the full version, these would be packaged as a single ZIP file.`);
  }

  downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadDataURL(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  async exportToJSON(jobData) {
    // Export entire job as single JSON file
    const json = JSON.stringify(jobData, null, 2);
    this.downloadTextFile(json, `${jobData.name || 'job'}_complete.json`);
  }

  async importFromJSON(file) {
    // Import job from JSON file
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const jobData = JSON.parse(e.target.result);
          resolve(jobData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  generateJobSummary(jobData) {
    return `
Job Summary
===========

Name: ${jobData.name || 'Unnamed Job'}
Customer: ${jobData.customer || 'Not specified'}
Created: ${new Date(jobData.metadata?.created || Date.now()).toLocaleDateString()}

Statistics:
- Sections: ${Object.keys(jobData.sections || {}).length}
- Photos: ${(jobData.photos || []).length}
- Recommendations: ${(jobData.recommendations || []).length}
- Audio recordings: ${(jobData.audioBlobs || []).length}

Sections captured:
${Object.values(jobData.sections || {}).map(s => `- ${s.name}`).join('\n')}

Recommendations provided:
${(jobData.recommendations || []).map((r, i) => `${i + 1}. ${r.title}`).join('\n')}
    `;
  }
}
