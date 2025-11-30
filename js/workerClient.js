/**
 * Worker Client for Voice Notes 2.0
 * Handles communication with the Cloudflare Worker for AI processing
 * Supports Anthropic, OpenAI, and Together AI providers
 */

// Configuration
let workerUrl = 'https://depot-voice-notes.martinbibb.workers.dev';
let preferredProvider = 'openai';
let requestTimeout = 30000; // 30 seconds

// Storage key for settings
const WORKER_SETTINGS_KEY = 'voiceNotes2.workerSettings';

/**
 * Load saved settings from localStorage
 */
function loadSettings() {
  try {
    const saved = localStorage.getItem(WORKER_SETTINGS_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.workerUrl) workerUrl = settings.workerUrl;
      if (settings.preferredProvider) preferredProvider = settings.preferredProvider;
      if (settings.requestTimeout) requestTimeout = settings.requestTimeout;
    }
  } catch (e) {
    console.warn('Failed to load worker settings:', e);
  }
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
  try {
    localStorage.setItem(WORKER_SETTINGS_KEY, JSON.stringify({
      workerUrl,
      preferredProvider,
      requestTimeout
    }));
  } catch (e) {
    console.warn('Failed to save worker settings:', e);
  }
}

// Load settings on module initialization
loadSettings();

/**
 * Set the worker URL endpoint
 * @param {string} url - The Cloudflare Worker URL
 */
export function setWorkerUrl(url) {
  if (url && typeof url === 'string') {
    workerUrl = url.replace(/\/$/, ''); // Remove trailing slash
    saveSettings();
  }
}

/**
 * Get the current worker URL
 * @returns {string} The current worker URL
 */
export function getWorkerUrl() {
  return workerUrl;
}

/**
 * Set the preferred AI provider
 * @param {string} provider - 'openai', 'anthropic', or 'together'
 */
export function setPreferredProvider(provider) {
  const validProviders = ['openai', 'anthropic', 'together'];
  if (validProviders.includes(provider.toLowerCase())) {
    preferredProvider = provider.toLowerCase();
    saveSettings();
  }
}

/**
 * Get the current preferred provider
 * @returns {string} The preferred provider
 */
export function getPreferredProvider() {
  return preferredProvider;
}

/**
 * Set the request timeout
 * @param {number} timeout - Timeout in milliseconds
 */
export function setRequestTimeout(timeout) {
  if (typeof timeout === 'number' && timeout > 0) {
    requestTimeout = timeout;
    saveSettings();
  }
}

/**
 * Make a request to the worker with timeout and retry
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function workerRequest(endpoint, options = {}) {
  const url = `${workerUrl}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Worker request failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout - worker did not respond in time');
    }

    throw error;
  }
}

/**
 * Check worker health and provider status
 * @returns {Promise<object>} Health status and provider availability
 */
export async function checkWorkerHealth() {
  try {
    return await workerRequest('/health');
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      providers: {
        anthropic: false,
        openai: false,
        together: false
      }
    };
  }
}

/**
 * Get available providers and their models
 * @returns {Promise<object>} Provider information
 */
export async function getProviders() {
  return workerRequest('/providers');
}

/**
 * Analyze text and extract structured sections
 * This is the main function for processing survey transcripts
 * 
 * @param {string} text - The transcript text to analyze
 * @param {object} schema - Schema with expectedSections, depotSections, etc.
 * @param {string} provider - Override the preferred provider
 * @returns {Promise<object>} Analyzed sections and summary
 */
export async function analyseText(text, schema = {}, provider = null) {
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return {
      summary: '',
      sections: [],
      checklistHits: [],
      materials: []
    };
  }

  try {
    const body = {
      transcript: text,
      expectedSections: schema.expectedSections || schema.sections || schema.depotSections,
      alreadyCaptured: schema.alreadyCaptured || [],
      depotSections: schema.depotSections,
      provider: provider || preferredProvider
    };

    const result = await workerRequest('/text', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    // Normalize the response format
    return normalizeAnalysisResult(result);
  } catch (error) {
    console.error('Text analysis failed:', error);

    // Return empty result on failure
    return {
      summary: '',
      sections: [],
      checklistHits: [],
      materials: [],
      error: error.message
    };
  }
}

/**
 * Normalize the analysis result to a consistent format
 * @param {object} result - Raw result from worker
 * @returns {object} Normalized result
 */
function normalizeAnalysisResult(result) {
  const normalized = {
    summary: result.summary || '',
    sections: [],
    checklistHits: result.checklistHits || [],
    materials: result.materials || []
  };

  // Handle sections array format
  if (Array.isArray(result.sections)) {
    normalized.sections = result.sections.map(section => ({
      section: section.section || section.name || 'Unknown',
      plainText: section.plainText || section.content || '',
      naturalLanguage: section.naturalLanguage || section.summary || ''
    }));
  } else if (typeof result.sections === 'object') {
    // Handle object format (key-value pairs)
    normalized.sections = Object.entries(result.sections).map(([key, value]) => ({
      section: key,
      plainText: typeof value === 'string' ? value : value.plainText || '',
      naturalLanguage: typeof value === 'object' ? value.naturalLanguage || '' : ''
    }));
  }

  return normalized;
}

/**
 * Call a specific AI provider directly
 * @param {string} provider - 'openai', 'anthropic', or 'together'
 * @param {array} messages - Array of message objects
 * @param {object} options - Additional options (model, maxTokens, etc.)
 * @returns {Promise<object>} API response
 */
export async function callProvider(provider, messages, options = {}) {
  const endpoint = `/api/${provider.toLowerCase()}`;

  return workerRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ messages, options })
  });
}

/**
 * Call Anthropic Claude API
 * @param {array} messages - Array of message objects
 * @param {object} options - Options like model, system prompt, etc.
 * @returns {Promise<object>} Claude response
 */
export async function callAnthropic(messages, options = {}) {
  return callProvider('anthropic', messages, options);
}

/**
 * Call OpenAI GPT API
 * @param {array} messages - Array of message objects
 * @param {object} options - Options like model, temperature, etc.
 * @returns {Promise<object>} GPT response
 */
export async function callOpenAI(messages, options = {}) {
  return callProvider('openai', messages, options);
}

/**
 * Call Together AI API
 * @param {array} messages - Array of message objects
 * @param {object} options - Options like model, etc.
 * @returns {Promise<object>} Together AI response
 */
export async function callTogether(messages, options = {}) {
  return callProvider('together', messages, options);
}

// Session management functions

/**
 * Save a session to the worker database
 * @param {object} sessionData - Session data to save
 * @returns {Promise<object>} Save result
 */
export async function saveSession(sessionData) {
  return workerRequest('/sessions', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });
}

/**
 * Load a session from the worker database
 * @param {string} sessionId - Session ID to load
 * @returns {Promise<object>} Session data
 */
export async function loadSession(sessionId) {
  return workerRequest(`/sessions/${encodeURIComponent(sessionId)}`);
}

/**
 * Update a session in the worker database
 * @param {string} sessionId - Session ID to update
 * @param {object} sessionData - Updated session data
 * @returns {Promise<object>} Update result
 */
export async function updateSession(sessionId, sessionData) {
  return workerRequest(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PUT',
    body: JSON.stringify(sessionData)
  });
}

/**
 * Delete a session from the worker database
 * @param {string} sessionId - Session ID to delete
 * @returns {Promise<object>} Delete result
 */
export async function deleteSession(sessionId) {
  return workerRequest(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE'
  });
}

/**
 * List all sessions from the worker database
 * @param {number} limit - Maximum number of sessions to return
 * @returns {Promise<object>} List of sessions
 */
export async function listSessions(limit = 50) {
  return workerRequest(`/sessions?limit=${limit}`);
}

// Export configuration getters/setters for external access
export const config = {
  get workerUrl() { return workerUrl; },
  set workerUrl(url) { setWorkerUrl(url); },
  get preferredProvider() { return preferredProvider; },
  set preferredProvider(provider) { setPreferredProvider(provider); },
  get requestTimeout() { return requestTimeout; },
  set requestTimeout(timeout) { setRequestTimeout(timeout); }
};
