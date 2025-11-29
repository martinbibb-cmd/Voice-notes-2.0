/**
 * Integration between main.js and uiEnhancements.js
 * This file bridges the existing functionality with new UI elements
 * and implements the dual voice+form survey flow with shared session state
 */

import {
  sessionState,
  updateFormField,
  updateTranscript,
  updateSections,
  setRecommendation,
  resetSessionState
} from './appState.js';

// Constants for word-to-number conversion
const WORD_TO_NUMBER = {
  one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8'
};

// Field ID mappings for DOM synchronization
const FIELD_ID_MAP = {
  bedrooms: 'surveyBedrooms',
  bathrooms: 'surveyBathrooms'
};

// Store observer reference for cleanup
let transcriptObserver = null;

// Wait for both main.js and uiEnhancements.js to load
function initIntegration() {
  const ui = window.uiEnhancements;
  if (!ui) {
    console.warn('UI enhancements not loaded yet, retrying...');
    setTimeout(initIntegration, 100);
    return;
  }

  console.log('Initializing UI integration...');

  // Get the original buttons
  const startLiveBtn = document.getElementById('start-recording');
  const pauseLiveBtn = document.getElementById('pause-recording');
  const finishLiveBtn = document.getElementById('stop-recording');

  // Store original handlers
  const originalStartHandler = startLiveBtn?.onclick;
  const originalPauseHandler = pauseLiveBtn?.onclick;
  const originalFinishHandler = finishLiveBtn?.onclick;

  // Enhance start button
  if (startLiveBtn && originalStartHandler) {
    startLiveBtn.onclick = async function(e) {
      console.log('Enhanced start button clicked');

      // Call original handler
      const result = await originalStartHandler.call(this, e);

      // Update UI
      ui.setAudioStatus('recording', 'Recording');
      ui.setLiveTranscriptBadge(true);

      // Try to setup audio level meter
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ui.setupAudioLevelMeter(stream);
      } catch (err) {
        console.warn('Could not access microphone for level meter:', err);
      }

      return result;
    };
  }

  // Enhance pause button
  if (pauseLiveBtn && originalPauseHandler) {
    pauseLiveBtn.onclick = function(e) {
      console.log('Enhanced pause button clicked');

      // Determine if pausing or resuming based on button text
      const isPausing = pauseLiveBtn.textContent.includes('Pause');

      // Call original handler
      const result = originalPauseHandler.call(this, e);

      // Update UI based on action
      if (isPausing) {
        ui.setAudioStatus('paused', 'Paused');
        ui.setLiveTranscriptBadge(false);
      } else {
        ui.setAudioStatus('recording', 'Recording');
        ui.setLiveTranscriptBadge(true);
      }

      return result;
    };
  }

  // Enhance finish button
  if (finishLiveBtn && originalFinishHandler) {
    finishLiveBtn.onclick = function(e) {
      console.log('Enhanced finish button clicked');

      // Call original handler
      const result = originalFinishHandler.call(this, e);

      // Update UI
      ui.setAudioStatus('idle', 'Finished');
      ui.setLiveTranscriptBadge(false);
      ui.cleanupAudioLevelMeter();

      return result;
    };
  }

  // Initialize survey form integration
  initSurveyForm();

  // Initialize process button
  initProcessButton();

  // Initialize recommendation JSON loader
  initRecommendationJsonLoader();

  // Hook into worker responses to update processed transcript and AI notes
  interceptWorkerResponses();

  // Hook into transcript updates to auto-extract form data
  initTranscriptListener();
}

/**
 * Initialize the survey form to update sessionState on input changes
 */
function initSurveyForm() {
  const formEl = document.getElementById('survey-form');
  if (!formEl) return;

  console.log('Initializing survey form integration...');

  // On any change, update sessionState.form
  formEl.addEventListener('input', (evt) => {
    const target = evt.target;
    if (!target.name) return;

    let value = target.value;
    if (target.type === 'number') {
      value = value.trim();
    }
    updateFormField(target.name, value);
    console.log(`Form field updated: ${target.name} = ${value}`);

    // Optionally auto-build sections when form changes
    autoBuildSectionsFromState();
  });

  // Also handle select changes
  formEl.addEventListener('change', (evt) => {
    const target = evt.target;
    if (!target.name) return;

    const value = target.value;
    updateFormField(target.name, value);
    console.log(`Form field changed: ${target.name} = ${value}`);

    autoBuildSectionsFromState();
  });
}

/**
 * Initialize the transcript listener to auto-extract form data from voice
 */
function initTranscriptListener() {
  const transcriptArea = document.getElementById('transcript');
  if (!transcriptArea) return;

  let debounceTimer = null;

  // Monitor for changes to the transcript
  transcriptArea.addEventListener('input', () => {
    const text = transcriptArea.value;

    // Debounce to avoid processing too frequently
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      onTranscriptUpdated(text);
    }, 1000);
  });

  // Cleanup any existing observer
  if (transcriptObserver) {
    transcriptObserver.disconnect();
  }

  // Also use MutationObserver in case transcript is updated programmatically
  transcriptObserver = new MutationObserver(() => {
    const text = transcriptArea.value;
    if (text && text !== sessionState.transcript.raw) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        onTranscriptUpdated(text);
      }, 1000);
    }
  });

  transcriptObserver.observe(transcriptArea, { attributes: true, characterData: true, subtree: true });
}

/**
 * Called when the transcript is updated - updates state and auto-extracts form data
 */
function onTranscriptUpdated(newRawTranscript) {
  // 1. Update state
  updateTranscript(newRawTranscript);

  // 2. Run extraction to update form + section texts
  autoExtractFromTranscript(newRawTranscript);

  // 3. Update live transcript UI
  const liveEl = document.getElementById('live-transcript');
  if (liveEl) liveEl.textContent = newRawTranscript;
}

/**
 * Auto-extract form field values from transcript text using pattern matching
 */
function autoExtractFromTranscript(text) {
  if (!text || typeof text !== 'string') return;
  const lower = text.toLowerCase();

  // Property type - check specific terms first before broader terms
  if (lower.includes('semi-detached') || lower.includes('semi detached')) {
    updateFormField('propertyType', 'semi');
    syncFormFieldToDOM('propertyType', 'semi');
  } else if (lower.includes('mid-terrace') || lower.includes('mid terrace')) {
    updateFormField('propertyType', 'mid-terrace');
    syncFormFieldToDOM('propertyType', 'mid-terrace');
  } else if (lower.includes('end-terrace') || lower.includes('end terrace')) {
    updateFormField('propertyType', 'end-terrace');
    syncFormFieldToDOM('propertyType', 'end-terrace');
  } else if (lower.includes('detached')) {
    updateFormField('propertyType', 'detached');
    syncFormFieldToDOM('propertyType', 'detached');
  } else if (lower.includes('flat') || lower.includes('apartment')) {
    updateFormField('propertyType', 'flat');
    syncFormFieldToDOM('propertyType', 'flat');
  } else if (lower.includes('bungalow')) {
    updateFormField('propertyType', 'bungalow');
    syncFormFieldToDOM('propertyType', 'bungalow');
  }

  // Bedrooms - pattern match like "three bedroom", "3 bed", etc.
  const bedMatch = lower.match(/(\d+)\s*bed(room)?s?/);
  if (bedMatch) {
    updateFormField('bedrooms', bedMatch[1]);
    syncFormFieldToDOM('bedrooms', bedMatch[1]);
  }
  // Also check for word numbers using the constant mapping
  const wordBedMatch = lower.match(/(one|two|three|four|five|six|seven|eight)\s*bed(room)?s?/);
  if (wordBedMatch) {
    const numVal = WORD_TO_NUMBER[wordBedMatch[1]];
    if (numVal) {
      updateFormField('bedrooms', numVal);
      syncFormFieldToDOM('bedrooms', numVal);
    }
  }

  // Bathrooms
  const bathMatch = lower.match(/(\d+)\s*(bath(room)?s?|bathrooms)/);
  if (bathMatch) {
    updateFormField('bathrooms', bathMatch[1]);
    syncFormFieldToDOM('bathrooms', bathMatch[1]);
  }

  // Occupancy - "X people", "family of X"
  const occupancyMatch = lower.match(/(\d+)\s*(people|occupants|person|persons)/);
  if (occupancyMatch) {
    updateFormField('occupancy', occupancyMatch[1]);
    syncFormFieldToDOM('occupancy', occupancyMatch[1]);
  }
  const familyMatch = lower.match(/family\s*of\s*(\d+)/);
  if (familyMatch) {
    updateFormField('occupancy', familyMatch[1]);
    syncFormFieldToDOM('occupancy', familyMatch[1]);
  }

  // System type
  if (lower.includes('regular boiler') || lower.includes('heat only') || lower.includes('conventional boiler')) {
    updateFormField('currentSystemType', 'regular');
    syncFormFieldToDOM('currentSystemType', 'regular');
  } else if (lower.includes('combi boiler') || lower.includes('combination boiler') || /\bcombi\b/.test(lower)) {
    updateFormField('currentSystemType', 'combi');
    syncFormFieldToDOM('currentSystemType', 'combi');
  } else if (lower.includes('system boiler')) {
    updateFormField('currentSystemType', 'system');
    syncFormFieldToDOM('currentSystemType', 'system');
  } else if (lower.includes('back boiler')) {
    updateFormField('currentSystemType', 'back-boiler');
    syncFormFieldToDOM('currentSystemType', 'back-boiler');
  } else if (lower.includes('electric boiler')) {
    updateFormField('currentSystemType', 'electric');
    syncFormFieldToDOM('currentSystemType', 'electric');
  }

  // Cylinder type
  if (lower.includes('unvented cylinder') || lower.includes('unvented hot water')) {
    updateFormField('cylinderType', 'unvented');
    syncFormFieldToDOM('cylinderType', 'unvented');
  } else if (lower.includes('vented cylinder') || lower.includes('hot water cylinder') || lower.includes('copper cylinder')) {
    updateFormField('cylinderType', 'vented');
    syncFormFieldToDOM('cylinderType', 'vented');
  } else if (lower.includes('no cylinder') || lower.includes('combi so no cylinder')) {
    updateFormField('cylinderType', 'none');
    syncFormFieldToDOM('cylinderType', 'none');
  } else if (lower.includes('thermal store')) {
    updateFormField('cylinderType', 'thermal-store');
    syncFormFieldToDOM('cylinderType', 'thermal-store');
  } else if (lower.includes('mixergy')) {
    updateFormField('cylinderType', 'mixergy');
    syncFormFieldToDOM('cylinderType', 'mixergy');
  }

  // Water pressure
  if (lower.includes('good water pressure') || lower.includes('good pressure') || lower.includes('excellent pressure')) {
    updateFormField('waterPressure', 'good');
    syncFormFieldToDOM('waterPressure', 'good');
  } else if (lower.includes('poor pressure') || lower.includes('low pressure') || lower.includes('weak pressure')) {
    updateFormField('waterPressure', 'poor');
    syncFormFieldToDOM('waterPressure', 'poor');
  } else if (lower.includes('adequate pressure') || lower.includes('okay pressure') || lower.includes('ok pressure')) {
    updateFormField('waterPressure', 'adequate');
    syncFormFieldToDOM('waterPressure', 'adequate');
  }

  // Microbore
  if (lower.includes('microbore') && (lower.includes('yes') || lower.includes('has microbore') || lower.includes('got microbore'))) {
    updateFormField('microbore', 'yes');
    syncFormFieldToDOM('microbore', 'yes');
  } else if (lower.includes('no microbore') || lower.includes('standard pipework') || lower.includes('15mm pipe')) {
    updateFormField('microbore', 'no');
    syncFormFieldToDOM('microbore', 'no');
  }

  // Flue type
  if (lower.includes('balanced flue')) {
    updateFormField('flueType', 'balanced');
    syncFormFieldToDOM('flueType', 'balanced');
  } else if (lower.includes('open flue')) {
    updateFormField('flueType', 'open');
    syncFormFieldToDOM('flueType', 'open');
  } else if (lower.includes('vertical flue')) {
    updateFormField('flueType', 'vertical');
    syncFormFieldToDOM('flueType', 'vertical');
  } else if (lower.includes('asbestos flue') || lower.includes('asbestos')) {
    updateFormField('flueType', 'asbestos');
    syncFormFieldToDOM('flueType', 'asbestos');
  }

  // After updating form fields, auto-generate section texts
  autoBuildSectionsFromState();
}

/**
 * Sync a form field value to the DOM element
 */
function syncFormFieldToDOM(name, value) {
  // Use the field ID mapping for fields with different IDs
  const fieldId = FIELD_ID_MAP[name] || name;

  const field = document.getElementById(fieldId) || document.querySelector(`#survey-form [name="${name}"]`);
  if (!field) return;

  if (field.tagName === 'SELECT' || field.tagName === 'INPUT') {
    field.value = value;
  }
}

/**
 * Build depot sections from the current sessionState (form + transcript)
 */
function autoBuildSectionsFromState() {
  const f = sessionState.form;
  const t = sessionState.transcript.raw || '';

  // Build Needs section
  const needsLines = [];
  if (f.propertyType) needsLines.push(`• ${capitalize(f.propertyType)} property;`);
  if (f.bedrooms) needsLines.push(`• ${f.bedrooms} bedroom(s);`);
  if (f.bathrooms) needsLines.push(`• ${f.bathrooms} bathroom(s);`);
  if (f.currentSystemType) needsLines.push(`• Existing system is ${f.currentSystemType} boiler;`);
  if (f.cylinderType && f.cylinderType !== 'none') needsLines.push(`• Hot water cylinder type: ${f.cylinderType};`);
  if (f.occupancy) needsLines.push(`• ${f.occupancy} occupant(s);`);
  const needsText = needsLines.join('\n');

  // Build System Characteristics section
  const sysCharLines = [];
  if (f.currentSystemType) sysCharLines.push(`• Current boiler: ${f.currentSystemType};`);
  if (f.cylinderType) sysCharLines.push(`• Cylinder: ${f.cylinderType};`);
  if (f.waterPressure) sysCharLines.push(`• Water pressure: ${f.waterPressure};`);
  if (f.microbore) sysCharLines.push(`• Microbore pipework: ${f.microbore};`);
  const systemCharacteristics = sysCharLines.join('\n');

  // Build Working at Heights section
  let workingAtHeights = '';
  if (f.loftAccess) {
    workingAtHeights = `• Loft access: ${f.loftAccess};`;
  } else {
    workingAtHeights = '• Working at height requirements to be confirmed (loft access / flue route);';
  }

  // Build Flue section
  let flueText = '';
  if (f.flueType) {
    flueText = `• Flue type: ${f.flueType};`;
  }

  // Build Delivery Notes section
  let deliveryNotes = '';
  if (f.parking) {
    deliveryNotes = `• Parking: ${f.parking};`;
  }

  // Build External Hazards section
  let externalHazards = '';
  if (f.hazards && f.hazards.length > 0) {
    externalHazards = f.hazards.map(h => `• ${h};`).join('\n');
  }

  // Update sessionState sections
  updateSections({
    Needs: needsText,
    WorkingAtHeights: workingAtHeights,
    SystemCharacteristics: systemCharacteristics,
    Flue: flueText,
    DeliveryNotes: deliveryNotes,
    ExternalHazards: externalHazards,
  });

  // Render sections to UI
  renderSectionsToUI();
}

/**
 * Capitalize the first letter of a string
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Render sessionState sections to the notes output UI
 */
function renderSectionsToUI() {
  Object.entries(sessionState.sections).forEach(([key, value]) => {
    const el = document.getElementById(`section-${key}`);
    if (el) {
      el.textContent = value || '';
    }
  });
}

/**
 * Initialize the Process Session button
 */
function initProcessButton() {
  const btn = document.getElementById('process-session-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    console.log('Process session button clicked');

    // 1. Rebuild sections from latest form + transcript
    autoBuildSectionsFromState();

    // 2. Generate or refresh customer summary
    buildCustomerSummary();

    // 3. Show success feedback
    const originalText = btn.textContent;
    btn.textContent = '✅ Processed!';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  });
}

/**
 * Build a customer-friendly summary from form data and recommendation
 */
function buildCustomerSummary() {
  const f = sessionState.form;
  const rec = sessionState.recommendation;

  const lines = [];

  // Basic system recap
  if (f.propertyType || f.bedrooms || f.bathrooms) {
    const bedroomText = f.bedrooms ? `${f.bedrooms} bedroom` : '';
    const propertyText = f.propertyType || 'property';
    const bathroomText = f.bathrooms ? ` with ${f.bathrooms} bathroom(s)` : '';
    lines.push(`You live in a ${bedroomText} ${propertyText}${bathroomText}.`);
  }

  if (f.occupancy) {
    lines.push(`There are ${f.occupancy} people living in the property.`);
  }

  if (f.currentSystemType) {
    let cylinderText = '';
    if (f.cylinderType && f.cylinderType !== 'none') {
      cylinderText = ` with a ${f.cylinderType} cylinder`;
    }
    lines.push(`You currently have a ${f.currentSystemType} boiler system${cylinderText}.`);
  }

  if (f.waterPressure) {
    lines.push(`Your water pressure is ${f.waterPressure}.`);
  }

  // Recommendation-based text if available
  if (rec && rec.bestOption && rec.bestOption.title) {
    lines.push('');
    lines.push(`Based on your home and hot water needs, the best fit is: ${rec.bestOption.title}.`);

    if (Array.isArray(rec.bestOption.keyBenefits) && rec.bestOption.keyBenefits.length) {
      lines.push(`This option was chosen because:\n• ${rec.bestOption.keyBenefits.join('\n• ')}`);
    }
  } else if (!rec) {
    // Fallback if no recommendation JSON yet
    if (f.currentSystemType) {
      lines.push('');
      lines.push(`Based on your current ${f.currentSystemType} system, we will recommend the most suitable replacement option during your survey.`);
    }
  }

  sessionState.customerSummary = lines.join('\n');

  const el = document.getElementById('customer-summary-text');
  if (el) {
    if (sessionState.customerSummary) {
      el.textContent = sessionState.customerSummary;
    } else {
      el.innerHTML = '<span style="color: var(--muted); font-style: italic;">Customer summary will appear here after processing...</span>';
    }
  }
}

/**
 * Initialize the recommendation JSON loader
 */
function initRecommendationJsonLoader() {
  const btn = document.getElementById('load-recommendation-json-btn');
  const textarea = document.getElementById('recommendation-json-input');

  if (!btn || !textarea) return;

  btn.addEventListener('click', () => {
    const jsonText = textarea.value.trim();
    if (!jsonText) {
      alert('Please paste recommendation JSON into the textarea first.');
      return;
    }

    onRecommendationJsonLoaded(jsonText);
  });
}

/**
 * Handle loading of recommendation JSON from the system-recommendation app
 */
function onRecommendationJsonLoaded(recJson) {
  try {
    const parsed = typeof recJson === 'string' ? JSON.parse(recJson) : recJson;
    setRecommendation(parsed);
    console.log('Recommendation JSON loaded:', parsed);

    // Optionally immediately rebuild key sections + summary
    autoBuildSectionsFromState();
    buildCustomerSummary();

    alert('Recommendation JSON loaded successfully!');
  } catch (err) {
    console.error('Failed to parse recommendation JSON', err);
    alert('Could not read system recommendation JSON – please check the format.');
  }
}

// Expose functions globally for use by other modules
window.sessionStateHelpers = {
  onTranscriptUpdated,
  autoExtractFromTranscript,
  autoBuildSectionsFromState,
  buildCustomerSummary,
  onRecommendationJsonLoaded,
  syncFormFieldToDOM,
  renderSectionsToUI
};

function interceptWorkerResponses() {
  const ui = window.uiEnhancements;

  // Check for updates periodically
  setInterval(() => {
    // Check if there's debug data we can use
    const debugData = window.__depotVoiceNotesDebug || window.__depotDebug;

    let transcriptUpdated = false;

    if (debugData && debugData.lastWorkerResponse) {
      const response = debugData.lastWorkerResponse;

      // Update processed transcript if available
      if (response.fullTranscript || response.transcript) {
        const transcript = response.fullTranscript || response.transcript;
        ui.updateProcessedTranscript(transcript);
        transcriptUpdated = true;

        // Also update sessionState and run extraction
        updateTranscript(transcript);
        autoExtractFromTranscript(transcript);
      }

      // Generate AI notes from sections if available
      if (response.sections && Array.isArray(response.sections)) {
        const aiNotes = response.sections.map(section => {
          // Check various possible formats
          const title = section.section || section.title || section.name || 'Section';
          const content = section.content || section.text || section.value || section.notes || '';

          return {
            title: title,
            content: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
          };
        }).filter(note => note.content); // Only include notes with content

        if (aiNotes.length > 0) {
          ui.updateAINotes(aiNotes);
        }
      }

      // Alternative: check for depot sections
      if (debugData.sections && Array.isArray(debugData.sections)) {
        const aiNotes = debugData.sections.map(section => ({
          title: section.section || 'Note',
          content: section.content || section.text || ''
        })).filter(note => note.content);

        if (aiNotes.length > 0) {
          ui.updateAINotes(aiNotes);
        }
      }
    }

    // Fallback: if worker response is unavailable, try to get transcript from localStorage or input
    if (!transcriptUpdated) {
      // Try localStorage autosave first
      try {
        const autosave = localStorage.getItem('surveyBrainAutosave');
        if (autosave) {
          const parsed = JSON.parse(autosave);
          if (parsed.fullTranscript) {
            ui.updateProcessedTranscript(parsed.fullTranscript);
            transcriptUpdated = true;
          }
        }
      } catch (e) {
        console.warn('Could not read autosave from localStorage:', e);
      }

      // If still no transcript, try the input element
      if (!transcriptUpdated) {
        const transcriptInput = document.getElementById('transcriptInput');
        if (transcriptInput && transcriptInput.value.trim()) {
          ui.updateProcessedTranscript(transcriptInput.value.trim());
          transcriptUpdated = true;
        }
      }
    }

    // Also check the sectionsList element for updates
    const sectionsList = document.getElementById('sectionsList');
    if (sectionsList && !sectionsList.textContent.includes('No automatic notes')) {
      // Sections have been updated, sync to AI notes
      syncAutomaticToAINotes();
    }
  }, 1000);
}

function syncAutomaticToAINotes() {
  const ui = window.uiEnhancements;
  const sectionItems = document.querySelectorAll('#sectionsList .section-item');

  if (sectionItems.length === 0) return;

  const aiNotes = [];
  sectionItems.forEach(item => {
    const title = item.querySelector('h4')?.textContent || '';
    const content = item.querySelector('pre')?.textContent || '';

    if (title && content && !content.includes('No content') && content.trim() !== '') {
      aiNotes.push({
        title: `📝 ${title}`,
        content: formatContentAsNarrative(title, content)
      });
    }
  });

  if (aiNotes.length > 0) {
    ui.updateAINotes(aiNotes);
  }
}

function formatContentAsNarrative(title, content) {
  // Convert structured content to more natural narrative
  if (typeof content !== 'string') return content;

  // Clean up the content
  let narrative = content.trim();

  // Add some context based on the section title
  const contextMap = {
    'Needs': 'Customer requirements: ',
    'System characteristics': 'Current system details: ',
    'Restrictions to work': 'Work limitations: ',
    'New boiler and controls': 'Proposed equipment: ',
    'Flue': 'Flue considerations: ',
    'Pipe work': 'Pipework notes: ',
    'Disruption': 'Expected disruption: ',
    'Customer actions': 'Customer to-do items: '
  };

  const context = contextMap[title] || '';
  if (context && !narrative.startsWith(context)) {
    narrative = context + narrative;
  }

  return narrative;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initIntegration, 500); // Give main.js time to set up handlers
  });
} else {
  setTimeout(initIntegration, 500);
}
