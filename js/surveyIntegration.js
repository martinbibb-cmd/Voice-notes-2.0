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
  const brandSection = document.getElementById('boiler-brand-section');
  const modelSection = document.getElementById('boiler-model-section');

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
    // Mark section as completed
    updateSectionNavCompletion('system-type-section', true);
    
    // Show brand selection when system type is selected
    if (brandSection && systemType) {
      brandSection.style.display = 'block';
    }
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

  // --- Brand and Model Selection ---
  initBoilerSelection();

  // --- Section Navigation (jumping between sections) ---
  initSectionNavigation();

  // --- Cylinder tile selection ---
  initCylinderTileSelection();

  // --- Flue tile selection ---
  initFlueTileSelection();

  // --- Tile chip selection states ---
  initTileChipSelection();

  // --- Flue Route Builder ---
  initFlueBuilder();

  // --- Condensate section ---
  initCondensateSection();

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
        // Clear all selections
        document.querySelectorAll('.cylinder-option-tile.selected, .flue-option.selected, .survey-tile-chip.selected').forEach(el => {
          el.classList.remove('selected');
        });
        // Reset nav completion states
        document.querySelectorAll('.survey-section-nav-btn').forEach(btn => {
          btn.classList.remove('completed');
        });
        // Clear flue builder
        clearFlueBuilder();
        console.log('[SurveyIntegration] All survey fields cleared');
      }
    });
  }

  console.log('[SurveyIntegration] 4-tab survey initialized');
}

// Boiler Catalogue - models organized by type and brand
const boilerCatalogue = {
  combi: {
    worcester: [
      { code: 'WB-8L-25C', label: 'Greenstar 8000 Life 25kW Combi' },
      { code: 'WB-8L-30C', label: 'Greenstar 8000 Life 30kW Combi' },
      { code: 'WB-8L-35C', label: 'Greenstar 8000 Life 35kW Combi' },
      { code: 'WB-8S-30C', label: 'Greenstar 8000 Style 30kW Combi' },
      { code: 'WB-4K-25C', label: 'Greenstar 4000 25kW Combi' },
      { code: 'WB-4K-30C', label: 'Greenstar 4000 30kW Combi' }
    ],
    vaillant: [
      { code: 'VA-EC-825', label: 'ecoTEC Plus 825 Combi' },
      { code: 'VA-EC-830', label: 'ecoTEC Plus 830 Combi' },
      { code: 'VA-EC-835', label: 'ecoTEC Plus 835 Combi' },
      { code: 'VA-EX-830', label: 'ecoTEC Exclusive 830 Combi' },
      { code: 'VA-EX-835', label: 'ecoTEC Exclusive 835 Combi' }
    ],
    viessmann: [
      { code: 'VI-V100-25C', label: 'Vitodens 100-W 25kW Combi' },
      { code: 'VI-V100-30C', label: 'Vitodens 100-W 30kW Combi' },
      { code: 'VI-V100-35C', label: 'Vitodens 100-W 35kW Combi' },
      { code: 'VI-V200-25C', label: 'Vitodens 200-W 25kW Combi' },
      { code: 'VI-V200-32C', label: 'Vitodens 200-W 32kW Combi' }
    ],
    'glow-worm': [
      { code: 'GW-EN-25C', label: 'Energy 25C Combi' },
      { code: 'GW-EN-30C', label: 'Energy 30C Combi' },
      { code: 'GW-EN-35C', label: 'Energy 35C Combi' },
      { code: 'GW-UL-25C', label: 'Ultimate3 25C Combi' },
      { code: 'GW-UL-30C', label: 'Ultimate3 30C Combi' }
    ],
    ideal: [
      { code: 'ID-VG-C26', label: 'Vogue Gen2 C26 Combi' },
      { code: 'ID-VG-C32', label: 'Vogue Gen2 C32 Combi' },
      { code: 'ID-VG-C40', label: 'Vogue Gen2 C40 Combi' },
      { code: 'ID-LG-C24', label: 'Logic+ C24 Combi' },
      { code: 'ID-LG-C30', label: 'Logic+ C30 Combi' }
    ],
    baxi: [
      { code: 'BX-800-25C', label: 'Baxi 800 25 Combi' },
      { code: 'BX-800-30C', label: 'Baxi 800 30 Combi' },
      { code: 'BX-800-36C', label: 'Baxi 800 36 Combi' },
      { code: 'BX-600-25C', label: 'Baxi 600 25 Combi' },
      { code: 'BX-600-30C', label: 'Baxi 600 30 Combi' }
    ]
  },
  system: {
    worcester: [
      { code: 'WB-8L-25S', label: 'Greenstar 8000 Life 25kW System' },
      { code: 'WB-8L-30S', label: 'Greenstar 8000 Life 30kW System' },
      { code: 'WB-4K-24S', label: 'Greenstar 4000 24kW System' },
      { code: 'WB-4K-30S', label: 'Greenstar 4000 30kW System' }
    ],
    vaillant: [
      { code: 'VA-EC-612S', label: 'ecoTEC Plus 612 System' },
      { code: 'VA-EC-615S', label: 'ecoTEC Plus 615 System' },
      { code: 'VA-EC-618S', label: 'ecoTEC Plus 618 System' },
      { code: 'VA-EC-624S', label: 'ecoTEC Plus 624 System' }
    ],
    viessmann: [
      { code: 'VI-V100-19S', label: 'Vitodens 100-W 19kW System' },
      { code: 'VI-V100-26S', label: 'Vitodens 100-W 26kW System' },
      { code: 'VI-V200-19S', label: 'Vitodens 200-W 19kW System' },
      { code: 'VI-V200-25S', label: 'Vitodens 200-W 25kW System' }
    ],
    'glow-worm': [
      { code: 'GW-EN-15S', label: 'Energy 15S System' },
      { code: 'GW-EN-18S', label: 'Energy 18S System' },
      { code: 'GW-EN-25S', label: 'Energy 25S System' }
    ],
    ideal: [
      { code: 'ID-VG-S15', label: 'Vogue Gen2 S15 System' },
      { code: 'ID-VG-S26', label: 'Vogue Gen2 S26 System' },
      { code: 'ID-VG-S32', label: 'Vogue Gen2 S32 System' }
    ],
    baxi: [
      { code: 'BX-800-18S', label: 'Baxi 800 18 System' },
      { code: 'BX-800-24S', label: 'Baxi 800 24 System' },
      { code: 'BX-600-18S', label: 'Baxi 600 18 System' }
    ]
  },
  regular: {
    worcester: [
      { code: 'WB-8L-25R', label: 'Greenstar 8000 Life 25kW Regular' },
      { code: 'WB-8L-30R', label: 'Greenstar 8000 Life 30kW Regular' },
      { code: 'WB-4K-18R', label: 'Greenstar 4000 18kW Regular' },
      { code: 'WB-4K-24R', label: 'Greenstar 4000 24kW Regular' }
    ],
    vaillant: [
      { code: 'VA-EC-412R', label: 'ecoTEC Plus 412 Regular' },
      { code: 'VA-EC-415R', label: 'ecoTEC Plus 415 Regular' },
      { code: 'VA-EC-418R', label: 'ecoTEC Plus 418 Regular' }
    ],
    viessmann: [
      { code: 'VI-V100-19R', label: 'Vitodens 100-W 19kW Regular' },
      { code: 'VI-V100-26R', label: 'Vitodens 100-W 26kW Regular' }
    ],
    'glow-worm': [
      { code: 'GW-EN-12R', label: 'Energy 12R Regular' },
      { code: 'GW-EN-18R', label: 'Energy 18R Regular' },
      { code: 'GW-EN-25R', label: 'Energy 25R Regular' }
    ],
    ideal: [
      { code: 'ID-LG-H12', label: 'Logic+ Heat 12 Regular' },
      { code: 'ID-LG-H18', label: 'Logic+ Heat 18 Regular' },
      { code: 'ID-LG-H24', label: 'Logic+ Heat 24 Regular' }
    ],
    baxi: [
      { code: 'BX-800-12R', label: 'Baxi 800 12 Regular' },
      { code: 'BX-800-18R', label: 'Baxi 800 18 Regular' },
      { code: 'BX-600-12R', label: 'Baxi 600 12 Regular' }
    ]
  }
};

/**
 * Initialize Boiler Brand and Model Selection
 */
function initBoilerSelection() {
  const brandCards = document.querySelectorAll('.brand-option-card');
  const brandInput = document.getElementById('new-boiler-brand');
  const modelSection = document.getElementById('boiler-model-section');
  const modelSelect = document.getElementById('new-boiler-model');
  const summaryDiv = document.getElementById('boiler-selection-summary');
  const summaryText = document.getElementById('boiler-summary-text');
  
  // Brand selection
  brandCards.forEach(card => {
    card.addEventListener('click', () => {
      const brand = card.dataset.brand;
      
      // Update visual state
      brandCards.forEach(c => {
        c.style.borderColor = '#e2e8f0';
        c.style.boxShadow = 'none';
      });
      card.style.borderColor = '#10b981';
      card.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
      
      // Store brand
      if (brandInput) {
        brandInput.value = brand;
      }
      
      // Get system type and populate models
      const systemType = document.getElementById('new-system-type')?.value;
      if (systemType && modelSection && modelSelect) {
        // Clear and populate model dropdown
        modelSelect.innerHTML = '<option value="">Select a model...</option>';
        
        const models = boilerCatalogue[systemType]?.[brand] || [];
        models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.code;
          option.textContent = model.label;
          modelSelect.appendChild(option);
        });
        
        // Show model section
        modelSection.style.display = 'block';
        
        // Hide summary until model is selected
        if (summaryDiv) {
          summaryDiv.style.display = 'none';
        }
      }
    });
    
    // Hover effects
    card.addEventListener('mouseenter', () => {
      if (card.style.borderColor !== 'rgb(16, 185, 129)') {
        card.style.borderColor = '#667eea';
      }
    });
    card.addEventListener('mouseleave', () => {
      if (card.style.borderColor !== 'rgb(16, 185, 129)') {
        card.style.borderColor = '#e2e8f0';
      }
    });
  });
  
  // Model selection
  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      const modelCode = modelSelect.value;
      const modelLabel = modelSelect.options[modelSelect.selectedIndex]?.text;
      const brand = brandInput?.value;
      const systemType = document.getElementById('new-system-type')?.value;
      
      if (modelCode && summaryDiv && summaryText) {
        // Get brand display name
        const brandNames = {
          'worcester': 'Worcester Bosch',
          'vaillant': 'Vaillant',
          'viessmann': 'Viessmann',
          'glow-worm': 'Glow-worm',
          'ideal': 'Ideal',
          'baxi': 'Baxi'
        };
        
        const systemNames = {
          'combi': 'Combi',
          'system': 'System',
          'regular': 'Regular'
        };
        
        summaryText.textContent = `${brandNames[brand] || brand} ${modelLabel}`;
        summaryDiv.style.display = 'block';
      }
    });
  }
  
  console.log('[SurveyIntegration] Boiler selection initialized');
}

/**
 * Initialize section navigation for jumping between sub-sections
 */
function initSectionNavigation() {
  const navButtons = document.querySelectorAll('.survey-section-nav-btn');
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.section;
      const targetSection = document.getElementById(sectionId);
      
      if (targetSection) {
        // Scroll to section
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update active state
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });
}

/**
 * Update section navigation completion state
 */
function updateSectionNavCompletion(sectionId, isCompleted) {
  const navBtn = document.querySelector(`.survey-section-nav-btn[data-section="${sectionId}"]`);
  if (navBtn) {
    navBtn.classList.toggle('completed', isCompleted);
  }
}

/**
 * Initialize cylinder tile selection
 */
function initCylinderTileSelection() {
  const cylinderTiles = document.querySelectorAll('.cylinder-option-tile');
  
  cylinderTiles.forEach(tile => {
    tile.addEventListener('click', () => {
      // Single select - remove selected from others
      cylinderTiles.forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      
      // Check the radio input
      const radio = tile.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
      }
      
      // Mark section as completed
      updateSectionNavCompletion('cylinder-section', true);
    });
  });
}

/**
 * Initialize flue tile selection
 */
function initFlueTileSelection() {
  const flueTiles = document.querySelectorAll('.flue-option');
  
  flueTiles.forEach(tile => {
    tile.addEventListener('click', () => {
      // Single select - remove selected from others
      flueTiles.forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      
      // Mark section as completed
      updateSectionNavCompletion('flue-section', true);
    });
  });
}

/**
 * Initialize tile chip selection states
 */
function initTileChipSelection() {
  const tileChips = document.querySelectorAll('.survey-tile-chip');
  
  tileChips.forEach(chip => {
    const input = chip.querySelector('input');
    
    if (input) {
      // Update selected state based on input
      input.addEventListener('change', () => {
        if (input.type === 'checkbox') {
          chip.classList.toggle('selected', input.checked);
        } else if (input.type === 'radio') {
          // For radios, update all chips in the same group
          const name = input.name;
          document.querySelectorAll(`.survey-tile-chip input[name="${name}"]`).forEach(r => {
            r.closest('.survey-tile-chip').classList.toggle('selected', r.checked);
          });
        }
        
        // Check for gas section completion
        const gasChips = document.querySelectorAll('#gas-section .survey-tile-chip input:checked');
        if (gasChips.length > 0) {
          updateSectionNavCompletion('gas-section', true);
        }
        
        // Check for controls section completion
        const controlsChips = document.querySelectorAll('#controls-section .survey-tile-chip input:checked');
        if (controlsChips.length > 0) {
          updateSectionNavCompletion('controls-section', true);
        }
      });
      
      // Set initial state
      if (input.checked) {
        chip.classList.add('selected');
      }
    }
  });
  
  // Track location section completion
  const locationInputs = document.querySelectorAll('#location-section input');
  locationInputs.forEach(input => {
    input.addEventListener('change', () => {
      const hasSelection = Array.from(document.querySelectorAll('#location-section input')).some(i => i.checked || i.value);
      updateSectionNavCompletion('location-section', hasSelection);
    });
  });
}

// Flue Builder state
let flueSegments = [];

// Segment equivalent length values (in meters)
const FLUE_SEGMENT_VALUES = {
  'straight-1m': { type: 'straight', label: 'Straight 1m', lengthEq: 1.0 },
  'straight-0.5m': { type: 'straight', label: 'Straight 0.5m', lengthEq: 0.5 },
  'bend-45': { type: 'bend', label: '45° Bend', lengthEq: 0.5 },
  'bend-90': { type: 'bend', label: '90° Bend', lengthEq: 1.0 },
  'plume-kit': { type: 'accessory', label: 'Plume Kit', lengthEq: 1.5 }
};

// Maximum equivalent length (typical manufacturer limit)
const MAX_FLUE_EQ_LENGTH = 10.0;
const MAX_BENDS = 5;

/**
 * Initialize Flue Route Builder
 */
function initFlueBuilder() {
  const segmentBtns = document.querySelectorAll('.flue-segment-btn');
  const undoBtn = document.getElementById('flue-undo-btn');
  const clearBtn = document.getElementById('flue-clear-btn');
  const directionBtns = document.querySelectorAll('.flue-direction-btn');
  
  // Segment buttons
  segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const segmentType = btn.dataset.segment;
      addFlueSegment(segmentType);
    });
  });
  
  // Direction buttons (for visual indication, optional)
  directionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const direction = btn.dataset.direction;
      console.log('[FlueBuilder] Direction selected:', direction);
      // For now, direction is just informational
    });
  });
  
  // Undo button
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (flueSegments.length > 0) {
        flueSegments.pop();
        updateFlueDisplay();
      }
    });
  }
  
  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearFlueBuilder();
    });
  }
  
  // Initialize display
  updateFlueDisplay();
  console.log('[SurveyIntegration] Flue builder initialized');
}

/**
 * Add a flue segment
 */
function addFlueSegment(segmentType) {
  const segmentData = FLUE_SEGMENT_VALUES[segmentType];
  if (!segmentData) {
    console.warn('[FlueBuilder] Unknown segment type:', segmentType);
    return;
  }
  
  flueSegments.push({
    ...segmentData,
    id: Date.now()
  });
  
  updateFlueDisplay();
  updateSectionNavCompletion('flue-builder-section', true);
}

/**
 * Update the flue builder display
 */
function updateFlueDisplay() {
  const eqLengthEl = document.getElementById('flue-eq-length');
  const bendCountEl = document.getElementById('flue-bend-count');
  const statusBadgeEl = document.getElementById('flue-status-badge');
  const segmentsListEl = document.getElementById('flue-segments-list');
  
  // Calculate totals
  const eqLength = flueSegments.reduce((sum, s) => sum + s.lengthEq, 0);
  const bendCount = flueSegments.filter(s => s.type === 'bend').length;
  
  // Update display
  if (eqLengthEl) {
    eqLengthEl.textContent = eqLength.toFixed(1) + 'm';
  }
  
  if (bendCountEl) {
    bendCountEl.textContent = bendCount.toString();
  }
  
  // Check limits and update status
  const exceedsLength = eqLength > MAX_FLUE_EQ_LENGTH;
  const exceedsBends = bendCount > MAX_BENDS;
  
  if (statusBadgeEl) {
    if (exceedsLength || exceedsBends) {
      statusBadgeEl.textContent = 'EXCEEDS LIMIT';
      statusBadgeEl.style.background = '#fef2f2';
      statusBadgeEl.style.color = '#dc2626';
    } else if (eqLength > MAX_FLUE_EQ_LENGTH * 0.8) {
      statusBadgeEl.textContent = 'NEAR LIMIT';
      statusBadgeEl.style.background = '#fef3c7';
      statusBadgeEl.style.color = '#d97706';
    } else {
      statusBadgeEl.textContent = 'OK';
      statusBadgeEl.style.background = '#d1fae5';
      statusBadgeEl.style.color = '#059669';
    }
  }
  
  // Update segments list
  if (segmentsListEl) {
    if (flueSegments.length === 0) {
      segmentsListEl.innerHTML = '<em>No segments added yet.</em>';
    } else {
      const items = flueSegments.map((s, i) => `${i + 1}. ${s.label} (${s.lengthEq}m eq)`).join(' → ');
      segmentsListEl.innerHTML = `<span style="color: #334155;">${items}</span>`;
    }
  }
}

/**
 * Clear the flue builder
 */
function clearFlueBuilder() {
  flueSegments = [];
  updateFlueDisplay();
}

/**
 * Get flue builder data for export
 */
function getFlueBuilderData() {
  const eqLength = flueSegments.reduce((sum, s) => sum + s.lengthEq, 0);
  const bendCount = flueSegments.filter(s => s.type === 'bend').length;
  
  return {
    segments: flueSegments.map(s => ({ type: s.type, label: s.label, lengthEq: s.lengthEq })),
    totalEqLength: eqLength,
    bendCount: bendCount,
    isValid: eqLength <= MAX_FLUE_EQ_LENGTH && bendCount <= MAX_BENDS
  };
}

/**
 * Initialize Condensate section
 */
function initCondensateSection() {
  const clearBtn = document.getElementById('condensate-clear-btn');
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Clear all condensate checkboxes
      const condensateCheckboxes = document.querySelectorAll('#condensate-section input[type="checkbox"]');
      condensateCheckboxes.forEach(cb => {
        cb.checked = false;
        const chip = cb.closest('.survey-tile-chip');
        if (chip) {
          chip.classList.remove('selected');
        }
      });
    });
  }
  
  // Track condensate section completion
  const condensateInputs = document.querySelectorAll('#condensate-section input[type="checkbox"]');
  condensateInputs.forEach(input => {
    input.addEventListener('change', () => {
      const hasSelection = Array.from(condensateInputs).some(i => i.checked);
      updateSectionNavCompletion('condensate-section', hasSelection);
    });
  });
  
  console.log('[SurveyIntegration] Condensate section initialized');
}

/**
 * Get condensate data for export
 */
function getCondensateData() {
  const external = [];
  const internal = [];
  const extra = [];
  
  document.querySelectorAll('#condensate-section input[name="condensate-external"]:checked').forEach(cb => {
    external.push(cb.value);
  });
  
  document.querySelectorAll('#condensate-section input[name="condensate-internal"]:checked').forEach(cb => {
    internal.push(cb.value);
  });
  
  document.querySelectorAll('#condensate-section input[name="condensate-extra"]:checked').forEach(cb => {
    extra.push(cb.value);
  });
  
  return {
    external,
    internal,
    additional: extra
  };
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
export { initSurvey, syncFromVoiceTranscript, clearAllSurvey, getFlueBuilderData, getCondensateData };
