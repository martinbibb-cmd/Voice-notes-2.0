/**
 * Survey Bridge
 * Connects the Notes-elite style survey UI to the Voice-notes-2.0 sessionState
 * Translates tile selections → sessionState updates → section auto-build → summary generation
 */

import {
  sessionState,
  updateFormField,
  updateSections
} from '../js/appState.js';

import { getFormFieldForGroup } from './survey-options-parser.js';

// Constants for hazard toggles
const HAZARD_TOGGLES = {
  SCAFFOLDING_REQUIRED: 'scaffoldingRequired',
  RESTRICTED_ACCESS: 'restrictedAccess',
  ASBESTOS_PRESENT: 'asbestosPresent'
};

// Constants for microbore values
const MICROBORE_VALUES = {
  YES: 'yes',
  NO: 'no',
  UNKNOWN: 'unknown'
};

/**
 * @typedef {Object} BridgeConfig
 * @property {Function} onStateUpdate - Called when sessionState is updated
 * @property {Function} onSectionsUpdate - Called when depot sections are rebuilt
 * @property {Function} onSummaryUpdate - Called when customer summary is rebuilt
 */

/**
 * Survey Bridge class
 * Handles bidirectional sync between survey UI and sessionState
 */
export class SurveyBridge {
  /**
   * @param {BridgeConfig} config - Bridge configuration
   */
  constructor(config = {}) {
    this.onStateUpdate = config.onStateUpdate || (() => {});
    this.onSectionsUpdate = config.onSectionsUpdate || (() => {});
    this.onSummaryUpdate = config.onSummaryUpdate || (() => {});
    
    // Multi-select fields that accumulate values
    this.multiSelectFields = ['issues', 'requirements', 'hazards'];
    
    // Track multi-select values
    this.multiSelectValues = {};
  }

  /**
   * Handle tile toggle from survey UI
   * @param {string} sectionId - Section ID
   * @param {string} tileId - Tile ID
   * @param {boolean} isSelected - Whether tile is now selected
   * @param {string} value - Value associated with tile
   * @param {string} group - Group the tile belongs to (for single-select groups)
   */
  handleTileToggle(sectionId, tileId, isSelected, value, group) {
    console.log(`[SurveyBridge] Tile toggle: ${sectionId}/${tileId} = ${isSelected} (value: ${value}, group: ${group})`);

    // Determine the form field to update
    const formField = group ? getFormFieldForGroup(group) : tileId;

    // Check if this is a multi-select field
    if (this.multiSelectFields.includes(sectionId) || this.isMultiSelectGroup(group)) {
      this.handleMultiSelectToggle(sectionId, tileId, isSelected, value);
    } else {
      // Single-select: update form field directly
      if (isSelected) {
        updateFormField(formField, value);
      } else {
        // Clear the field if deselected
        updateFormField(formField, '');
      }
    }

    // Trigger state update callback
    this.onStateUpdate(sessionState.form);

    // Auto-rebuild sections and summary
    this.autoBuildSectionsFromState();
    this.buildCustomerSummary();
  }

  /**
   * Handle input change from survey UI
   * @param {string} sectionId - Section ID
   * @param {string} inputId - Input ID
   * @param {string} value - New input value
   */
  handleInputChange(sectionId, inputId, value) {
    console.log(`[SurveyBridge] Input change: ${sectionId}/${inputId} = ${value}`);

    // Map input IDs to form fields
    const fieldMapping = {
      bedrooms: 'bedrooms',
      bathrooms: 'bathrooms',
      occupancy: 'occupancy',
      loftAccess: 'loftAccess',
      parking: 'parking',
      pumpLocation: 'pumpLocation'
    };

    const formField = fieldMapping[inputId] || inputId;
    updateFormField(formField, value);

    this.onStateUpdate(sessionState.form);
    this.autoBuildSectionsFromState();
    this.buildCustomerSummary();
  }

  /**
   * Handle toggle change from survey UI
   * @param {string} sectionId - Section ID
   * @param {string} toggleId - Toggle ID
   * @param {boolean} isSelected - Whether toggle is now on
   */
  handleToggleChange(sectionId, toggleId, isSelected) {
    console.log(`[SurveyBridge] Toggle change: ${sectionId}/${toggleId} = ${isSelected}`);

    // Special handling for hazards and flags
    const hazardToggles = Object.values(HAZARD_TOGGLES);
    
    if (hazardToggles.includes(toggleId)) {
      const currentHazards = sessionState.form.hazards || [];
      
      if (isSelected) {
        if (!currentHazards.includes(toggleId)) {
          updateFormField('hazards', [...currentHazards, toggleId]);
        }
      } else {
        updateFormField('hazards', currentHazards.filter(h => h !== toggleId));
      }
    }

    this.onStateUpdate(sessionState.form);
    this.autoBuildSectionsFromState();
    this.buildCustomerSummary();
  }

  /**
   * Handle multi-select toggle
   */
  handleMultiSelectToggle(sectionId, tileId, isSelected, value) {
    if (!this.multiSelectValues[sectionId]) {
      this.multiSelectValues[sectionId] = [];
    }

    if (isSelected) {
      if (!this.multiSelectValues[sectionId].includes(value)) {
        this.multiSelectValues[sectionId].push(value);
      }
    } else {
      this.multiSelectValues[sectionId] = this.multiSelectValues[sectionId].filter(v => v !== value);
    }

    // Store multi-select values using updateFormField for consistency
    if (sectionId === 'issues') {
      updateFormField('_issues', [...this.multiSelectValues[sectionId]]);
    } else if (sectionId === 'requirements') {
      updateFormField('_requirements', [...this.multiSelectValues[sectionId]]);
    }
  }

  /**
   * Check if a group is multi-select
   */
  isMultiSelectGroup(group) {
    const multiSelectGroups = ['issues', 'requirements', 'hazards'];
    return multiSelectGroups.includes(group);
  }

  /**
   * Build depot sections from current sessionState
   */
  autoBuildSectionsFromState() {
    const f = sessionState.form;

    // Build Needs section
    const needsLines = [];
    if (f.propertyType) needsLines.push(`• ${this.capitalize(f.propertyType)} property;`);
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
    if (f.pumpLocation) sysCharLines.push(`• Pump location: ${f.pumpLocation};`);
    const systemCharacteristics = sysCharLines.join('\n');

    // Build Working at Heights section
    let workingAtHeights = '';
    if (f.loftAccess) {
      workingAtHeights = `• Loft access: ${f.loftAccess};`;
    } else {
      workingAtHeights = '• Working at height requirements to be confirmed (loft access / flue route);';
    }

    // Check for scaffolding in hazards
    if (f.hazards && f.hazards.includes(HAZARD_TOGGLES.SCAFFOLDING_REQUIRED)) {
      workingAtHeights += '\n• Scaffolding required;';
    }

    // Build Flue section
    let flueText = '';
    if (f.flueType) {
      flueText = `• Flue type: ${f.flueType};`;
      if (f.flueType === 'asbestos') {
        flueText += '\n• ⚠️ Asbestos flue - specialist removal required;';
      }
    }

    // Build External Hazards section
    const hazardLines = [];
    if (f.hazards && f.hazards.length > 0) {
      f.hazards.forEach(h => {
        const hazardLabels = {
          [HAZARD_TOGGLES.SCAFFOLDING_REQUIRED]: 'Scaffolding required for access',
          [HAZARD_TOGGLES.RESTRICTED_ACCESS]: 'Restricted access to property',
          [HAZARD_TOGGLES.ASBESTOS_PRESENT]: '⚠️ Asbestos present - specialist removal required'
        };
        hazardLines.push(`• ${hazardLabels[h] || h};`);
      });
    }
    const externalHazards = hazardLines.join('\n');

    // Build Delivery Notes section
    let deliveryNotes = '';
    if (f.parking) {
      deliveryNotes = `• Parking: ${f.parking};`;
    }

    // Build Restrictions to Work section
    const restrictionsLines = [];
    if (f.hazards && f.hazards.includes(HAZARD_TOGGLES.RESTRICTED_ACCESS)) {
      restrictionsLines.push('• Restricted access - confirm arrangements;');
    }
    if (f.microbore === MICROBORE_VALUES.YES) {
      restrictionsLines.push('• Microbore pipework present - may need adapters or replacement;');
    }
    const restrictionsToWork = restrictionsLines.join('\n');

    // Build Pipework section
    let pipeworkText = '';
    if (f.microbore) {
      pipeworkText = `• Microbore: ${f.microbore === MICROBORE_VALUES.YES ? 'Yes - 8-10mm pipes present' : f.microbore === MICROBORE_VALUES.NO ? 'No - standard 15mm+ pipes' : 'Unknown'};`;
    }
    if (f.pumpLocation) {
      pipeworkText += `\n• Pump location: ${f.pumpLocation};`;
    }

    // Update sessionState sections
    updateSections({
      Needs: needsText,
      WorkingAtHeights: workingAtHeights,
      SystemCharacteristics: systemCharacteristics,
      Flue: flueText,
      DeliveryNotes: deliveryNotes,
      ExternalHazards: externalHazards,
      RestrictionsToWork: restrictionsToWork,
      Pipework: pipeworkText
    });

    // Render to UI
    this.renderSectionsToUI();
    this.onSectionsUpdate(sessionState.sections);
  }

  /**
   * Build customer-friendly summary
   */
  buildCustomerSummary() {
    const f = sessionState.form;
    const rec = sessionState.recommendation;
    const engineerChoiceId = sessionState.engineerChoiceId;

    const lines = [];

    // Basic property info
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
      const pressureDescriptions = {
        poor: 'Your water pressure is poor, which may affect hot water delivery.',
        adequate: 'Your water pressure is adequate.',
        good: 'Your water pressure is good.'
      };
      lines.push(pressureDescriptions[f.waterPressure] || `Your water pressure is ${f.waterPressure}.`);
    }

    // Add issues if present
    const issues = f._issues || [];
    if (issues.length > 0) {
      const issueLabels = {
        'cold-radiators': 'cold radiators',
        'noise': 'a noisy system',
        'leaking': 'leaking issues',
        'low-pressure': 'low pressure',
        'poor-flow': 'poor flow rate',
        'inefficient': 'high energy bills',
        'no-hot-water': 'no hot water',
        'breakdown': 'frequent breakdowns'
      };
      const issueTexts = issues.map(i => issueLabels[i] || i);
      if (issueTexts.length === 1) {
        lines.push(`You mentioned experiencing ${issueTexts[0]}.`);
      } else {
        lines.push(`You mentioned experiencing ${issueTexts.slice(0, -1).join(', ')} and ${issueTexts[issueTexts.length - 1]}.`);
      }
    }

    // Add requirements if present
    const requirements = f._requirements || [];
    if (requirements.length > 0) {
      const reqLabels = {
        'efficiency': 'energy efficiency',
        'reliability': 'reliability',
        'performance': 'high performance',
        'space-saving': 'space saving',
        'smart-controls': 'smart controls',
        'future-proof': 'future proofing',
        'quiet': 'quiet operation',
        'budget': 'budget friendliness'
      };
      const reqTexts = requirements.map(r => reqLabels[r] || r);
      lines.push(`Your priorities include ${reqTexts.join(', ')}.`);
    }

    // Add recommendation if available
    let chosenOption = null;
    if (rec && Array.isArray(rec.options)) {
      if (engineerChoiceId) {
        chosenOption = rec.options.find(
          opt => opt.id === engineerChoiceId || opt.key === engineerChoiceId || opt.code === engineerChoiceId
        ) || null;
      }
      if (!chosenOption && rec.bestOption) {
        chosenOption = rec.bestOption;
      }
      if (chosenOption && chosenOption.title) {
        lines.push('');
        lines.push(`Based on your home and hot water needs, we have recommended: ${chosenOption.title}.`);
        if (Array.isArray(chosenOption.keyBenefits) && chosenOption.keyBenefits.length) {
          lines.push(`We chose this option because:\n• ${chosenOption.keyBenefits.join('\n• ')}`);
        }
      }
    }

    sessionState.customerSummary = lines.join('\n');

    // Update UI
    const summaryEl = document.getElementById('customer-summary-text');
    if (summaryEl) {
      if (sessionState.customerSummary) {
        summaryEl.textContent = sessionState.customerSummary;
      } else {
        summaryEl.innerHTML = '<span style="color: var(--muted); font-style: italic;">Customer summary will appear here after completing the survey...</span>';
      }
    }

    this.onSummaryUpdate(sessionState.customerSummary);
  }

  /**
   * Render sessionState sections to the notes output UI
   */
  renderSectionsToUI() {
    Object.entries(sessionState.sections).forEach(([key, value]) => {
      const el = document.getElementById(`section-${key}`);
      if (el) {
        el.textContent = value || '';
      }
    });
  }

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Initialize from existing sessionState
   * Returns survey UI state object
   */
  getInitialStateFromSession() {
    const f = sessionState.form;
    const selections = {};
    const inputs = {};

    // Map form fields to tile selections
    if (f.propertyType) {
      selections['property'] = { [f.propertyType]: f.propertyType };
    }
    if (f.currentSystemType) {
      selections['current-system'] = { [f.currentSystemType]: f.currentSystemType };
    }
    if (f.cylinderType) {
      selections['cylinder'] = { [f.cylinderType]: f.cylinderType };
    }
    if (f.waterPressure) {
      selections['water-pressure'] = { [f.waterPressure]: f.waterPressure };
    }
    if (f.microbore) {
      selections['pipework'] = { [`microbore-${f.microbore}`]: f.microbore };
    }
    if (f.flueType) {
      selections['flue'] = { [f.flueType]: f.flueType };
    }

    // Map inputs
    if (f.bedrooms) inputs['property-bedrooms'] = f.bedrooms;
    if (f.bathrooms) inputs['property-bathrooms'] = f.bathrooms;
    if (f.occupancy) inputs['property-occupancy'] = f.occupancy;
    if (f.loftAccess) inputs['access-loftAccess'] = f.loftAccess;
    if (f.parking) inputs['access-parking'] = f.parking;
    if (f.pumpLocation) inputs['pipework-pumpLocation'] = f.pumpLocation;

    return { selections, inputs };
  }

  /**
   * Sync survey UI state to sessionState
   * @param {Object} surveyState - Full survey UI state
   */
  syncFromSurveyState(surveyState) {
    // This is called when loading saved survey state
    // Iterate through all selections and inputs to update sessionState
    
    if (surveyState.selections) {
      Object.entries(surveyState.selections).forEach(([sectionId, tiles]) => {
        Object.entries(tiles).forEach(([tileId, value]) => {
          // Determine the form field and update it
          this.handleTileToggle(sectionId, tileId, true, value, null);
        });
      });
    }

    if (surveyState.inputs) {
      Object.entries(surveyState.inputs).forEach(([key, value]) => {
        const [sectionId, inputId] = key.split('-');
        this.handleInputChange(sectionId, inputId, value);
      });
    }

    if (surveyState.toggles) {
      Object.entries(surveyState.toggles).forEach(([key, isSelected]) => {
        if (isSelected) {
          const [sectionId, toggleId] = key.split('-');
          this.handleToggleChange(sectionId, toggleId, true);
        }
      });
    }
  }
}

export default SurveyBridge;
