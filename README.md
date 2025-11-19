# Voice Notes 2.0 - Integrated Professional Survey System

A comprehensive heating survey tool that integrates voice transcription, photo markup, and **context-aware intelligent recommendations**. Built by combining the best features from three specialized repositories.

## 🎯 Overview

Voice Notes 2.0 is a professional survey application for heating engineers that provides:
- **Voice-to-text transcription** with audio visualization
- **Context-aware recommendations** based on what was discussed in the survey
- **FAB (Features, Advantages, Benefits) analysis** highlighting relevant points
- **Photo capture and markup** for visual documentation
- **Professional PDF exports** for customers

## ⭐ What's New in 2.0

### Context-Aware Recommendations

**The game-changer:** Recommendations now analyze your transcript and **only show systems you actually discussed**.

Before: Generic recommendations for all system types
After: Intelligent recommendations that:
- ✅ Detect which systems you mentioned (combi, system boiler, etc.)
- ✅ Identify customer issues (cold radiators, low pressure, etc.)
- ✅ Highlight FAB items that solve the specific problems discussed
- ✅ Auto-recommend powerflush when cold radiators or noise mentioned
- ✅ Show transcript excerpts explaining why each system is relevant

**Example:** If you mention "cold radiators" and "shower pressure drops," the system will:
1. Automatically recommend powerflush (with explanation of how it solves cold radiators)
2. Prioritize system boilers with unvented cylinders (to solve pressure issues)
3. Highlight specific features that address these exact problems

## 🚀 Key Features

### 1. Enhanced Voice Recording
**Integrated from: Depot-voice-notes**

- Real-time speech-to-text transcription (Web Speech API)
- Audio level monitoring and waveform visualization
- Adaptive chunking based on network speed
- Section-based note organization
- Auto-save to local storage
- Pause/resume functionality

### 2. Context-Aware Recommendations Engine ⭐ NEW
**Integrated from: System-recommendation + Custom transcript analysis**

**The recommendations engine now analyzes transcripts to detect:**

**System Types:**
- Combi boilers
- System boilers (vented/unvented)
- Regular boilers
- Heat pumps

**Customer Issues:**
- Low pressure / poor flow
- Cold radiators
- Simultaneous demand (multiple showers)
- Noise / kettling
- Inefficiency / high bills
- Leaking
- No hot water
- Breakdowns
- Space constraints

**Requirements:**
- Future-proofing / renewables
- Smart features / app control
- Reliability
- Efficiency / cost savings
- Performance / power
- Simplicity / ease of use
- Space saving

**Solutions Discussed:**
- Powerflush
- New system installation
- Repairs / maintenance
- Smart controls
- Radiator work
- Insulation

### 3. FAB Analysis with Smart Highlighting ⭐ NEW

Each recommendation now shows:

**Features** - What it has
- Technical specifications
- Components included
- System capabilities

**Advantages** - Why it's better
- Comparison to alternatives
- Technical benefits
- Installation advantages

**Benefits** - What customer gets
- Real-world value
- Cost savings
- Quality of life improvements

**Smart Highlighting:**
Items that directly address issues mentioned in your survey are:
- ⭐ Starred
- 🟡 Yellow highlighted background
- Labeled with reason ("Addresses cold radiators you mentioned")

### 4. Powerflush Auto-Detection ⭐ NEW

Automatically recommends powerflush when transcript mentions:
- Cold radiators
- System noise/kettling/banging
- Inefficient heating
- Black water in system

**Shows exactly:** Which issues you mentioned and how powerflush solves each one.

### 5. Discussion Context Display ⭐ NEW

Each recommendation card shows:
- **"Discussed in survey" badge** if system was explicitly mentioned
- **Direct transcript quotes** where you discussed it
- **Related issues** with severity indicators:
  - 🔴 Critical (red): Leaking, breakdown, no hot water
  - 🟡 High (amber): Cold radiators, poor flow, noise
  - 🔵 Medium (blue): Other issues
- **Specific explanations** linking FAB items to survey discussion

### 6. Photo Markup & Annotation
**Integrated from: Clearance-genie concepts**

- Camera capture or file upload
- Canvas-based markup tools:
  - Point markers
  - Rectangles and circles
  - Text annotations
  - Arrow indicators
- Voice annotations for photos
- Photo gallery with captions
- Original + marked versions saved

### 7. Professional Export System

- **Customer PDF**: Polished recommendations with FAB analysis
- **Internal Job Folder**: Complete survey data (audio, photos, transcript)
- **Transcript Export**: Plain text for records
- **Photo Export**: All images with markup

## 📊 Real-World Examples

### Example 1: Cold Radiators Discussion

**What you say during survey:**
> "The upstairs radiators are cold at the bottom and there's black water when I bled them. The system is making banging noises and the bills are high."

**What Voice Notes 2.0 does:**

1. **Auto-detects issues:**
   - Cold radiators (high severity)
   - Noise (high severity)
   - Inefficiency (medium severity)

2. **Recommends powerflush** with explanation:
   > "Based on the cold radiators indicating sludge buildup, system noise from debris in pipes, and reduced efficiency from contaminated water you mentioned, a powerflush is strongly recommended."

3. **Highlights relevant FAB items:**
   - ⭐ "Removes years of accumulated sludge" - *Addresses cold radiators you mentioned*
   - ⭐ "All radiators heat up fully and evenly" - *Addresses cold radiators you mentioned*
   - ⭐ "Quieter operation without kettling" - *Addresses noise you mentioned*

### Example 2: Multiple Bathrooms Discussion

**What you say:**
> "We have 3 bathrooms and in the morning when the kids are getting ready, if two showers are on at once, the pressure is terrible. We're looking at a system boiler."

**What Voice Notes 2.0 does:**

1. **Detects:**
   - System boiler discussed ✓
   - Simultaneous demand issue ✓
   - Performance requirement ✓

2. **Prioritizes System Boiler with Unvented Cylinder** (top recommendation)
   - Shows "Discussed in survey" badge
   - Includes your transcript quote

3. **Highlights:**
   - ⭐ "Run multiple showers simultaneously without pressure drop" - *Addresses simultaneous demand you mentioned*
   - ⭐ "Strong, consistent pressure" - *Matches your performance requirement*
   - ⭐ "Excellent multi-outlet performance" - *Addresses simultaneous demand you mentioned*

4. **Doesn't show:**
   - Combi boilers (not mentioned, poor fit for issue)
   - Regular boilers (not mentioned)

### Example 3: Space-Constrained Flat

**What you say:**
> "It's a one bedroom flat with no space for a cylinder. The airing cupboard is tiny. Want something simple and compact."

**What Voice Notes 2.0 does:**

1. **Detects:**
   - Space constraints (high priority)
   - Simplicity requirement
   - Flat property type

2. **Recommends Combi Boiler** as best option

3. **Highlights:**
   - ⭐ "Saves valuable cupboard space" - *Addresses space constraints you mentioned*
   - ⭐ "No hot water cylinder needed" - *Addresses space constraints you mentioned*
   - ⭐ "Compact single unit" - *Matches your space saving requirement*
   - ⭐ "Easy to understand and operate" - *Matches your simplicity requirement*

## 🏗️ System Architecture

```
Voice Notes 2.0
│
├── Voice Recording (Enhanced)
│   ├── Speech Recognition API (Web Speech API)
│   ├── Audio Visualization (Web Audio API)
│   ├── Adaptive Network Chunking
│   └── Section-based Organization
│
├── Transcript Analysis Engine ⭐ NEW
│   ├── System Type Detection (regex patterns)
│   ├── Issue Pattern Matching (10 issue types)
│   ├── Requirement Extraction (7 requirement types)
│   ├── Solution Detection (6 solution types)
│   ├── Keyword Extraction
│   └── Sentiment Analysis
│
├── Recommendations Engine (Enhanced)
│   ├── Context-Aware Filtering (only show discussed systems)
│   ├── Multi-Factor Scoring (property + transcript analysis)
│   ├── FAB Generation (features/advantages/benefits)
│   ├── Relevance Highlighting (match to transcript)
│   ├── Discussion Context Mapping
│   └── Powerflush Auto-Detection
│
├── Photo Markup System
│   ├── Canvas Drawing Tools (5 tools)
│   ├── Voice Annotations
│   └── Image Gallery
│
└── Export & Documentation
    ├── Customer PDF Generator
    ├── Job Folder Packager
    └── Multi-format Export (JSON/CSV/TXT)
```

## 🎨 User Interface

### Recommendations Tab - What's New

**Recommendation Cards now show:**

1. **Header:**
   - System title
   - ✓ Best recommendation badge (green)
   - "Discussed in survey" badge (purple)

2. **FAB Analysis** (3 columns):
   - Features column (left)
   - Advantages column (middle)
   - Benefits column (right)
   - ⭐ Highlighted items with yellow background
   - Reason labels explaining why highlighted

3. **Why Recommended Section:**
   - Property-based rationale
   - "**Specifically discussed:**" additions
   - Links to transcript issues

4. **Discussion Context Panel** (new):
   - **"You mentioned:"** - Direct quotes from transcript
   - **"Addresses your concerns:"** - Issues with severity colors

### Color Coding

- 🟢 Green: Best recommendation
- 🟣 Purple: Discussed in survey
- 🟡 Yellow: Highlighted FAB items
- 🔴 Red: Critical issues
- 🟠 Amber: High priority issues
- 🔵 Blue: Medium issues

## 📁 File Structure

```
Voice-notes-2.0/
├── index.html                              # Main UI (enhanced with FAB styles)
├── README.md                               # This file
├── js/
│   ├── main.js                             # App controller (enhanced display methods)
│   ├── voice/
│   │   └── recorder.js                     # Enhanced with audio visualization
│   ├── recommendations/
│   │   ├── engine.js                       # ⭐ Context-aware engine + FAB
│   │   └── transcript-analyzer.js          # ⭐ NEW: Detects systems/issues/requirements
│   ├── photos/
│   │   └── canvas-markup.js               # Drawing tools
│   ├── documents/
│   │   └── customer-pdf.js                # PDF generation
│   └── storage/
│       └── job-folders.js                 # Export system
├── data/
│   └── products.json                       # Product catalog
└── .git/                                   # Version control
```

## 🔍 Detection Patterns Reference

### System Keywords:
- **Combi**: "combi boiler", "combination boiler", "on-demand", "instant hot water"
- **System Unvented**: "system boiler", "unvented cylinder", "sealed cylinder", "megaflo", "mains pressure cylinder"
- **System Vented**: "vented cylinder", "open vented", "gravity fed", "F&E tank", "loft tank"
- **Regular**: "regular boiler", "conventional boiler", "heat only", "traditional system"
- **Heat Pump**: "heat pump", "air source", "ASHP", "ground source", "GSHP"

### Issue Keywords:
- **Low Pressure**: "low pressure", "poor pressure", "weak shower", "slow flow"
- **Cold Radiators**: "cold radiator", "not heating", "sludge", "black water"
- **Simultaneous Demand**: "two showers", "multiple bathroom", "same time", "family morning"
- **Noise**: "noisy", "banging", "kettling", "whistling", "rumbling"
- **Inefficient**: "high bills", "expensive", "inefficient", "old boiler", "waste energy"
- **Leaking**: "leak", "drip", "water damage", "puddle"
- **No Hot Water**: "no hot water", "cold water", "waiting", "takes ages"
- **Breakdown**: "broken", "not working", "fault", "error", "cutting out"
- **Poor Flow**: "poor flow", "trickle", "weak", "slow to fill"
- **Space Constraints**: "no space", "tight space", "small cupboard", "limited space", "compact"

### Requirement Keywords:
- **Future Proofing**: "future proof", "renewable", "solar", "eco friendly", "sustainable"
- **Smart Features**: "smart", "app", "wifi", "phone control", "remote"
- **Reliability**: "reliable", "dependable", "quality", "last long", "warranty"
- **Efficiency**: "efficient", "save money", "lower bills", "eco", "energy saving"
- **Performance**: "powerful", "good pressure", "hot quickly", "multiple taps"
- **Simplicity**: "simple", "easy", "straightforward", "low maintenance"
- **Space Saving**: "compact", "small", "space save", "tidy"

### Solution Keywords:
- **Powerflush**: "powerflush", "power flush", "system flush", "clean system", "magnetic filter"
- **New System**: "new boiler", "replace", "replacement", "upgrade", "install"
- **Repairs**: "repair", "fix", "service", "maintain"
- **Controls**: "smart control", "thermostat", "nest", "hive", "tado", "wifi control"
- **Radiator Work**: "new radiator", "add radiator", "move radiator", "TRV"
- **Insulation**: "insulation", "lagging", "jacket", "pipe insulation"

## 💡 Usage Guide

### For Best Context-Aware Recommendations:

1. **Mention specific systems naturally:**
   - ✅ "The current combi boiler is 15 years old"
   - ✅ "Looking at replacing with a system boiler"
   - ✅ "Wondering about heat pumps"

2. **Describe issues clearly:**
   - ✅ "The upstairs radiators are cold"
   - ✅ "Shower pressure drops when someone uses a tap"
   - ✅ "The airing cupboard is very small"

3. **State customer requirements:**
   - ✅ "They want something efficient to save money"
   - ✅ "Needs to work with solar panels they're planning"
   - ✅ "Must be reliable - they've had too many breakdowns"

4. **Record the full survey first:**
   - Complete all sections
   - Describe all issues
   - Capture all requirements
   - THEN generate recommendations

5. **The more context, the better:**
   - Mention specific problems
   - Quote what the customer said
   - Describe observations
   - Note any constraints

### Step-by-Step Workflow:

1. **Voice Notes Tab:**
   - Click "Start Recording"
   - Select section (Customer Info, Site Survey, etc.)
   - Speak your survey notes naturally
   - Change sections as needed
   - Click "Finish" when done

2. **Photos Tab:**
   - Take or upload photos
   - Use markup tools to annotate
   - Add voice annotations describing what you see
   - Save marked photos

3. **Recommendations Tab:**
   - Fill in customer profile (bedrooms, bathrooms, etc.)
   - Click "Generate Recommendations"
   - Review context-aware suggestions
   - See highlighted FAB items
   - Read discussion context

4. **Export Tab:**
   - Name your job
   - Review summary
   - Export customer PDF
   - Download job folder with all data

## 🎓 Understanding FAB Highlights

**What the highlights mean:**

- **⭐ Star icon** = This item directly addresses something you discussed
- **🟡 Yellow background** = Highlighted for relevance
- **Reason label** = Explanation of why it's highlighted

**Types of highlights:**
- "Addresses [issue] you mentioned" - Solves a problem from transcript
- "Matches your [requirement] requirement" - Fulfills a stated need

**Example interpretation:**
```
⭐ Run multiple showers simultaneously without pressure drop
   Addresses simultaneous demand you mentioned
```

This means:
1. You mentioned simultaneous demand in your survey
2. This feature solves that specific issue
3. It's highlighted so you can easily show the customer

## 🛠️ Technical Requirements

### Browser Compatibility:

**Best support:**
- Chrome/Edge (recommended)
- Safari (macOS/iOS)

**Required APIs:**
- Web Speech API (speech-to-text)
- MediaRecorder API (audio recording)
- getUserMedia API (microphone)
- Canvas API (photo markup)
- Web Audio API (visualization)

**Permissions needed:**
- Microphone access
- Camera access (optional, for photos)

### Performance:

- **Network speed detection** for adaptive audio chunking
- **Auto-save** every 30 seconds
- **Local storage** for session persistence
- **Responsive design** for tablets and mobile

## 🎯 Integration Details

### From Depot-voice-notes (AI voice system):
- ✅ Enhanced voice recorder with audio visualization
- ✅ Adaptive network-aware chunking
- ✅ Session management
- ✅ Auto-save functionality
- ✅ Multi-codec audio support

### From System-recommendation (Scoring engine):
- ✅ Multi-factor scoring algorithm
- ✅ System profile database (4 main types)
- ✅ Property-based suitability logic
- ✅ Performance data (efficiency, costs, lifespan)
- ✅ Occupancy-based calculations

### From Clearance-genie (Photo tools):
- ✅ Canvas-based photo markup
- ✅ Interactive drawing tools (5 types)
- ✅ Photo calibration concepts
- ✅ Annotation system

### New Custom Features (Voice Notes 2.0):
- ⭐ Transcript analyzer engine
- ⭐ Context-aware recommendation filtering
- ⭐ FAB highlighting system
- ⭐ Discussion context display
- ⭐ Automatic powerflush detection
- ⭐ Issue severity classification
- ⭐ Requirement priority ranking
- ⭐ Keyword extraction
- ⭐ Sentiment analysis

## 🚦 Quick Start

### First Time Setup:

1. Open `index.html` in Chrome or Edge
2. Allow microphone permission when prompted
3. Allow camera permission (if taking photos)

### Starting a Survey:

1. Click "Start Recording" in Voice Notes tab
2. Speak naturally - describe what you see and hear
3. Mention issues: "The radiators are cold"
4. Mention systems if discussed: "Looking at a combi boiler"
5. State requirements: "They want something efficient"

### Generating Recommendations:

1. Complete your survey recording
2. Go to Recommendations tab
3. Fill in customer details (property type, bedrooms, etc.)
4. Click "Generate Recommendations"
5. Review the context-aware suggestions

**What to look for:**
- "Discussed in survey" badges
- ⭐ Highlighted FAB items
- Discussion context quotes
- Issue severity indicators

### Exporting:

1. Navigate to Export tab
2. Enter job name
3. Click "Customer Recommendations PDF"
4. Download and share with customer

## 📈 Future Enhancement Opportunities

**Potential additions from source repositories:**

- AI-powered transcription (OpenAI Whisper/GPT-4)
- Clearance checking with object detection (Gemini API)
- Quote builder with pricing integration
- Cloud sync and backup
- Mobile app versions
- Team collaboration features
- CRM integration
- Email delivery of PDFs

**Roadmap priorities:**
1. Cloud AI transcription (higher accuracy)
2. Quote builder from Depot-voice-notes
3. Clearance checking from Clearance-genie
4. Mobile-responsive improvements

## 🤝 Credits & Sources

This integrated system combines features from:

- **martinbibb-cmd/Depot-voice-notes** - Voice transcription, AI processing, quote builder
  - 232 commits, 3000+ lines of code
  - Advanced features: AI transcription, deduplication, pricebook matching

- **martinbibb-cmd/System-recommendation** - Scoring engine, system profiles
  - 71 commits, comprehensive UK heating data
  - Research-backed efficiency data and suitability logic

- **martinbibb-cmd/Clearance-genie** - Photo markup, object detection concepts
  - 72 commits, sophisticated calibration system
  - AI-powered object detection and compliance checking

**New development for Voice Notes 2.0:**
- Context-aware recommendation filtering
- Transcript analysis engine
- FAB highlighting system
- Discussion context mapping

## 📝 Version History

- **v2.0.0** - Context-aware recommendations with transcript analysis
- **v1.0.0** - Initial integration of three repositories

## 📄 License

Combined from multiple sources - refer to individual repository licenses:
- Depot-voice-notes
- System-recommendation
- Clearance-genie

---

**Built with:** Vanilla JavaScript, HTML5, CSS3, Web APIs

**Primary APIs:** Speech Recognition, MediaRecorder, Canvas, Web Audio

**No frameworks required** - Pure JavaScript for maximum compatibility

**Status:** Production ready with context-aware intelligence
