# Voice Notes 2.0

A comprehensive professional survey tool combining voice recording, photo markup, and intelligent recommendations into a single powerful application.

## Overview

Voice Notes 2.0 integrates the best features from three specialized applications:

- **Depot Voice Notes**: Voice recording and real-time transcription
- **System Recommendations**: Intelligent product recommendations engine
- **Clearances Genie**: Photo markup and annotation tools

## Key Features

### 🎤 Voice Recording & Transcription
- Real-time speech-to-text using Web Speech API
- Audio recording backup (WebM/MP4/WAV)
- Section-based organization
- Pause/resume functionality
- Auto-save every 30 seconds
- Full transcript export

### 📸 Photo Capture & Markup
- Camera integration for instant photo capture
- Upload existing photos
- Professional markup tools: Points, Rectangles, Circles, Arrows, Text
- Canvas-based drawing (from Clearances-Genie)
- Voice annotations for each photo
- Original, annotated, and marked versions saved

### 💡 Intelligent Recommendations
- Customer profile-based scoring
- Multiple heating system options evaluated
- Features & benefits for each recommendation
- Tailored rationale explaining why each option suits the customer
- High school reading level language
- Bullet-point format for clarity

### 📄 Professional Document Generation
- Customer-facing recommendations PDF
- Clean, professional design
- Executive summary with personalized recommendations
- Embedded annotated photos
- Next steps section
- Print-friendly format

### 💾 Comprehensive Job Folders
Export complete job packages including:
- Full transcript and section notes
- Photos (original, annotated, marked)
- Audio recordings
- Customer recommendations document
- Metadata (JSON)

## Quick Start

1. Open `index.html` in a modern browser
2. Grant microphone and camera permissions
3. Start recording voice notes in the Voice Notes tab
4. Take and markup photos in the Photos tab
5. Generate recommendations in the Recommendations tab
6. Export everything in the Export tab

## Browser Compatibility

**Recommended Browsers:**
- Chrome/Edge (best support)
- Safari (iOS and macOS)
- Firefox

**Required APIs:**
- Web Speech API
- MediaRecorder API
- getUserMedia (Camera/Mic)
- Canvas API

## Project Structure

```
Voice-notes-2.0/
├── index.html              # Main application
├── js/
│   ├── main.js            # Core controller
│   ├── voice/recorder.js  # Voice recording
│   ├── photos/canvas-markup.js  # Photo markup
│   ├── recommendations/engine.js  # Recommendations
│   ├── documents/customer-pdf.js  # PDF generator
│   └── storage/job-folders.js  # Export system
└── data/
    └── products.json      # Product library
```

## Product Library

The `data/products.json` file contains a comprehensive database of heating products including:
- Combi and System boilers
- Unvented and Vented cylinders
- Smart controls and thermostats
- Filters and accessories

Each product includes features, benefits, and customer-specific rationale.

## Future Enhancements

- Cloud sync and backup
- ZIP file exports
- Direct PDF generation
- Email delivery
- Expanded product library (heat pumps, solar, etc.)
- Mobile app versions

## Credits

Built by combining three specialized tools:
- Depot Voice Notes
- System Recommendations
- Clearances Genie

---

**Version**: 2.0.0
**Status**: Production Ready
