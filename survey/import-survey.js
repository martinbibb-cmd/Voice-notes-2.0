/**
 * Survey Import Module
 * Loader to embed the Notes-elite style survey UI into Voice-notes-2.0
 * This file acts as the main entry point for the survey component
 */

import SurveyUI from './survey-ui.js';
import SurveyBridge from './survey-bridge.js';
import { DEFAULT_SURVEY_SCHEMA, parseOptionsMarkdown } from './survey-options-parser.js';

// Store references to the survey UI and bridge instances
let surveyUIInstance = null;
let surveyBridgeInstance = null;

/**
 * Render the survey UI into a container element
 * @param {HTMLElement} container - Container element to render into
 * @param {Object} options - Configuration options
 * @param {Object} options.schema - Custom survey schema (optional)
 * @param {string} options.optionsMarkdown - Markdown string to parse for schema (optional)
 * @param {Object} options.initialState - Initial selection state (optional)
 * @param {Function} options.onStateChange - Callback when survey state changes (optional)
 * @returns {Object} - Object with surveyUI and bridge references
 */
export function renderSurvey(container, options = {}) {
  if (!container) {
    console.error('[Survey] No container element provided');
    return null;
  }

  console.log('[Survey] Initializing survey UI...');

  // Parse schema from markdown if provided
  let schema = options.schema || DEFAULT_SURVEY_SCHEMA;
  if (options.optionsMarkdown) {
    schema = parseOptionsMarkdown(options.optionsMarkdown);
  }

  // Create the bridge to connect UI to sessionState
  surveyBridgeInstance = new SurveyBridge({
    onStateUpdate: (formState) => {
      console.log('[Survey] Form state updated:', formState);
      if (options.onStateChange) {
        options.onStateChange(getSurveyState());
      }
    },
    onSectionsUpdate: (sections) => {
      console.log('[Survey] Sections updated');
    },
    onSummaryUpdate: (summary) => {
      console.log('[Survey] Summary updated');
    }
  });

  // Get initial state from existing sessionState if not provided
  const initialState = options.initialState || surveyBridgeInstance.getInitialStateFromSession();

  // Create the survey UI
  surveyUIInstance = new SurveyUI(container, {
    schema: schema,
    initialState: initialState.selections || {},
    onTileToggle: (sectionId, tileId, isSelected, value, group) => {
      surveyBridgeInstance.handleTileToggle(sectionId, tileId, isSelected, value, group);
    },
    onInputChange: (sectionId, inputId, value) => {
      surveyBridgeInstance.handleInputChange(sectionId, inputId, value);
    },
    onToggleChange: (sectionId, toggleId, isSelected) => {
      surveyBridgeInstance.handleToggleChange(sectionId, toggleId, isSelected);
    }
  });

  // Set initial input values if available
  if (initialState.inputs) {
    Object.entries(initialState.inputs).forEach(([key, value]) => {
      const [sectionId, inputId] = key.split('-');
      const inputEl = container.querySelector(`#survey-input-${sectionId}-${inputId}`);
      if (inputEl) {
        inputEl.value = value;
      }
    });
  }

  console.log('[Survey] Survey UI initialized successfully');

  return {
    surveyUI: surveyUIInstance,
    bridge: surveyBridgeInstance
  };
}

/**
 * Get the current survey state
 * @returns {Object} Current survey state
 */
export function getSurveyState() {
  if (!surveyUIInstance) {
    return null;
  }
  return surveyUIInstance.getState();
}

/**
 * Set the survey state from saved data
 * @param {Object} state - Saved survey state
 */
export function setSurveyState(state) {
  if (!surveyUIInstance) {
    console.warn('[Survey] Survey UI not initialized');
    return;
  }
  surveyUIInstance.setState(state);
  
  // Also sync to sessionState
  if (surveyBridgeInstance) {
    surveyBridgeInstance.syncFromSurveyState(state);
  }
}

/**
 * Destroy the survey UI
 */
export function destroySurvey() {
  if (surveyUIInstance) {
    surveyUIInstance.destroy();
    surveyUIInstance = null;
  }
  surveyBridgeInstance = null;
}

/**
 * Get the default survey schema
 * @returns {Object} Default survey schema
 */
export function getDefaultSchema() {
  return DEFAULT_SURVEY_SCHEMA;
}

/**
 * Parse an Options.md file to create a custom schema
 * @param {string} markdown - Markdown content
 * @returns {Object} Parsed schema
 */
export function parseSchema(markdown) {
  return parseOptionsMarkdown(markdown);
}

/**
 * Auto-initialize survey if a survey container exists in the DOM
 */
export function autoInit() {
  const container = document.getElementById('survey-container');
  if (container) {
    console.log('[Survey] Auto-initializing survey in #survey-container');
    renderSurvey(container);
  }
}

// Export for use as a module
export default {
  renderSurvey,
  getSurveyState,
  setSurveyState,
  destroySurvey,
  getDefaultSchema,
  parseSchema,
  autoInit
};
