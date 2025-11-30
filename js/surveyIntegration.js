/**
 * Survey Integration Module
 * Initializes and integrates the Notes-elite style survey UI with Voice-notes-2.0
 * Now includes 4-tab survey functionality
 */

import { renderSurvey, getSurveyState, setSurveyState, destroySurvey } from '../survey/import-survey.js';
import { 
  sessionState, 
  updateFormField,
  updateTranscript
} from './appState.js';

// Store survey instance reference
let surveyInstance = null;

/**
 * Initialize the survey UI when DOM is ready
 */
function initSurvey() {
  const container = document.getElementById('survey-container');
  if (!container) {
    console.warn('[SurveyIntegration] Survey container not found');
  } else {
    console.log('[SurveyIntegration] Initializing survey...');

    // Render the survey UI
    surveyInstance = renderSurvey(container, {
      onStateChange: (state) => {
        // Update the quick summary when state changes
        updateQuickSummary(state);
        
        // Sync with traditional form if it exists
        syncToTraditionalForm(state);
      }
    });
  }

  // Setup event handlers for both old and new survey UI
  setupEventHandlers();
  
  // Setup 4-tab survey functionality
  initFourTabSurvey();

  console.log('[SurveyIntegration] Survey initialized successfully');
}

/**
 * Initialize 4-tab survey UI functionality
 */
function initFourTabSurvey() {
  // --- Tab switching ---
  const tabButtons = Array.from(document.querySelectorAll('.survey-tab-button'));
  const tabPanels = Array.from(document.querySelectorAll('.survey-tab-panel'));

  function activateTab(targetId) {
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tabTarget === targetId);
    });
    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === targetId);
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tabTarget;
      if (targetId) activateTab(targetId);
    });
  });

  // Ensure first tab is active if nothing else set
  if (tabButtons.length && !tabButtons.some(b => b.classList.contains('active'))) {
    activateTab(tabButtons[0].dataset.tabTarget);
  }

  // --- System option selection ---
  const systemCards = Array.from(document.querySelectorAll('.system-option-card'));
  const newSystemTypeInput = document.getElementById('new-system-type');
  const cylinderSection = document.getElementById('new-system-cylinder-section');

  function updateCylinderVisibility(systemType) {
    if (!cylinderSection) return;
    // Cylinder only relevant for system or regular.
    if (systemType === 'system' || systemType === 'regular') {
      cylinderSection.classList.remove('hidden');
    } else {
      cylinderSection.classList.add('hidden');
    }
  }

  function selectSystemCard(card) {
    const systemType = card.dataset.system || '';
    systemCards.forEach(c => c.classList.toggle('selected', c === card));
    if (newSystemTypeInput) {
      newSystemTypeInput.value = systemType;
    }
    updateCylinderVisibility(systemType);
  }

  systemCards.forEach(card => {
    card.addEventListener('click', () => selectSystemCard(card));
  });

  // If something sets new-system-type on load, respect it:
  if (newSystemTypeInput && newSystemTypeInput.value) {
    const initial = systemCards.find(c => c.dataset.system === newSystemTypeInput.value);
    if (initial) selectSystemCard(initial);
  } else {
    // default: no selection, hide cylinder until user selects a type
    updateCylinderVisibility('');
  }

  // --- Sync from voice button (new UI) ---
  const syncBtn = document.getElementById('survey-sync-from-voice');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      // TODO: plug into your existing AI / transcript processing.
      // For now, just log so you know the button works.
      console.log('TODO: Sync survey fields from transcript JSON.');
      syncFromVoiceTranscript();
    });
  }

  // --- Clear all button (new UI) ---
  const clearBtn = document.getElementById('survey-clear-all');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all survey fields?')) {
        const inputs = document.querySelectorAll('#property-survey input, #property-survey textarea, #property-survey select');
        inputs.forEach(el => {
          if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
          } else {
            el.value = '';
          }
        });
        systemCards.forEach(c => c.classList.remove('selected'));
        if (newSystemTypeInput) newSystemTypeInput.value = '';
        // Reset cylinder visibility when clearing
        updateCylinderVisibility('');
        console.log('[SurveyIntegration] All survey fields cleared');
      }
    });
  }

  console.log('[SurveyIntegration] 4-tab survey initialized');
}

/**
 * Setup event handlers for survey controls
 */
function setupEventHandlers() {
  // Sync from Voice button (old UI - kept for compatibility)
  const syncBtnOld = document.getElementById('sync-survey-voice-btn');
  if (syncBtnOld) {
    syncBtnOld.addEventListener('click', () => {
      syncFromVoiceTranscript();
    });
  }

  // Clear All button (old UI - kept for compatibility)
  const clearBtnOld = document.getElementById('clear-survey-btn');
  if (clearBtnOld) {
    clearBtnOld.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all survey selections?')) {
        clearAllSurvey();
      }
    });
  }

  // Traditional form fallback sync
  const fallbackForm = document.getElementById('survey-form-fallback');
  if (fallbackForm) {
    fallbackForm.addEventListener('change', (e) => {
      const field = e.target;
      if (field.name) {
        updateFormField(field.name, field.value);
        // Trigger survey UI update if we have an instance
        if (surveyInstance && surveyInstance.bridge) {
          surveyInstance.bridge.autoBuildSectionsFromState();
          surveyInstance.bridge.buildCustomerSummary();
        }
      }
    });
  }
}

/**
 * Update the quick summary panel
 */
function updateQuickSummary(state) {
  const summaryEl = document.getElementById('survey-summary-content');
  if (!summaryEl) return;

  const selections = state?.selections || {};
  const inputs = state?.inputs || {};
  
  const items = [];

  // Count selections by section
  Object.entries(selections).forEach(([sectionId, tiles]) => {
    const count = Object.keys(tiles).length;
    if (count > 0) {
      const labels = Object.keys(tiles).map(id => tiles[id] || id);
      items.push(`<strong>${formatSectionName(sectionId)}:</strong> ${labels.join(', ')}`);
    }
  });

  // Include inputs
  Object.entries(inputs).forEach(([key, value]) => {
    if (value) {
      const [, inputId] = key.split('-');
      items.push(`<strong>${formatInputName(inputId)}:</strong> ${value}`);
    }
  });

  if (items.length === 0) {
    summaryEl.innerHTML = '<span style="color: var(--muted); font-style: italic;">Start selecting tiles above to see a summary of your survey...</span>';
  } else {
    summaryEl.innerHTML = `
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${items.map(item => `<li style="margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">${item}</li>`).join('')}
      </ul>
    `;
  }
}

/**
 * Sync survey from voice transcript
 */
function syncFromVoiceTranscript() {
  const transcriptArea = document.getElementById('transcript');
  const transcript = transcriptArea?.value || sessionState.transcript?.raw || '';

  if (!transcript || transcript.length < 10) {
    alert('No transcript available to sync from. Please record some voice notes first.');
    return;
  }

  console.log('[SurveyIntegration] Syncing from voice transcript...');

  // Use the existing auto-extract logic from mainIntegration
  if (window.sessionStateHelpers && window.sessionStateHelpers.autoExtractFromTranscript) {
    window.sessionStateHelpers.autoExtractFromTranscript(transcript);
    
    // Re-initialize survey with updated state
    if (surveyInstance && surveyInstance.bridge) {
      const initialState = surveyInstance.bridge.getInitialStateFromSession();
      surveyInstance.surveyUI.setState({
        selections: initialState.selections,
        inputs: initialState.inputs
      });
      
      alert('Survey synced from voice transcript!');
    }
  } else {
    alert('Voice sync not available. Please ensure the main application has loaded.');
  }
}

/**
 * Clear all survey selections
 */
function clearAllSurvey() {
  // Destroy and re-render the survey
  const container = document.getElementById('survey-container');
  if (container && surveyInstance) {
    destroySurvey();
    surveyInstance = renderSurvey(container);
  }

  // Clear sessionState form fields
  const formFields = [
    'propertyType', 'bedrooms', 'bathrooms', 'occupancy',
    'currentSystemType', 'cylinderType', 'waterPressure',
    'microbore', 'flueType', 'loftAccess', 'parking', 'pumpLocation'
  ];

  formFields.forEach(field => {
    updateFormField(field, '');
  });
  updateFormField('hazards', []);

  // Clear summary
  const summaryEl = document.getElementById('survey-summary-content');
  if (summaryEl) {
    summaryEl.innerHTML = '<span style="color: var(--muted); font-style: italic;">Survey cleared. Start selecting tiles to begin...</span>';
  }

  console.log('[SurveyIntegration] Survey cleared');
}

/**
 * Sync survey state to traditional form fields
 */
function syncToTraditionalForm(state) {
  if (!state || !state.selections) return;

  // Map tile selections to form fields
  const fieldMappings = {
    'property': { field: 'propertyType2', valueKey: null },
    'current-system': { field: 'currentSystemType', valueKey: null },
    'cylinder': { field: 'cylinderType', valueKey: null },
    'water-pressure': { field: 'waterPressure', valueKey: null },
    'flue': { field: 'flueType', valueKey: null }
  };

  Object.entries(state.selections).forEach(([sectionId, tiles]) => {
    const mapping = fieldMappings[sectionId];
    if (mapping) {
      const selectedId = Object.keys(tiles)[0];
      if (selectedId) {
        const value = tiles[selectedId] || selectedId;
        const field = document.getElementById(mapping.field);
        if (field) {
          field.value = value;
        }
      }
    }
  });

  // Sync inputs
  if (state.inputs) {
    Object.entries(state.inputs).forEach(([key, value]) => {
      const [, inputId] = key.split('-');
      const inputMappings = {
        'bedrooms': 'surveyBedrooms2',
        'bathrooms': 'surveyBathrooms2',
        'occupancy': 'occupancy2'
      };
      const fieldId = inputMappings[inputId];
      if (fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
          field.value = value;
        }
      }
    });
  }
}

/**
 * Format section name for display
 */
function formatSectionName(sectionId) {
  const names = {
    'property': 'Property',
    'current-system': 'Current System',
    'cylinder': 'Cylinder',
    'water-pressure': 'Water Pressure',
    'pipework': 'Pipework',
    'flue': 'Flue',
    'access': 'Access',
    'issues': 'Issues',
    'requirements': 'Requirements'
  };
  return names[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1).replace(/-/g, ' ');
}

/**
 * Format input name for display
 */
function formatInputName(inputId) {
  const names = {
    'bedrooms': 'Bedrooms',
    'bathrooms': 'Bathrooms',
    'occupancy': 'Occupants',
    'loftAccess': 'Loft Access',
    'parking': 'Parking',
    'pumpLocation': 'Pump Location'
  };
  return names[inputId] || inputId.charAt(0).toUpperCase() + inputId.slice(1);
}

/**
 * Get the current survey instance
 */
export function getSurveyInstance() {
  return surveyInstance;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initSurvey, 100);
  });
} else {
  setTimeout(initSurvey, 100);
}

// Export for external use
export { initSurvey, syncFromVoiceTranscript, clearAllSurvey };
