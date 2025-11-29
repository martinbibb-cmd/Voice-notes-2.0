/**
 * Survey UI Component
 * Renders a Notes-elite style grid tile survey interface
 * Pure UI component with event emitters for tile selections
 */

import { DEFAULT_SURVEY_SCHEMA, getTileValue, getFormFieldForGroup } from './survey-options-parser.js';

/**
 * @typedef {Object} SurveyUIOptions
 * @property {Object} schema - Survey schema defining sections and tiles
 * @property {Function} onTileToggle - Callback when tile is toggled (sectionId, tileId, isSelected, value)
 * @property {Function} onInputChange - Callback when input value changes (sectionId, inputId, value)
 * @property {Function} onToggleChange - Callback when toggle is changed (sectionId, toggleId, isSelected)
 * @property {Object} initialState - Initial selection state
 */

export default class SurveyUI {
  /**
   * @param {HTMLElement} container - Container element to render into
   * @param {SurveyUIOptions} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.schema = options.schema || DEFAULT_SURVEY_SCHEMA;
    this.onTileToggle = options.onTileToggle || (() => {});
    this.onInputChange = options.onInputChange || (() => {});
    this.onToggleChange = options.onToggleChange || (() => {});
    
    // Track selections per section
    this.selections = options.initialState || {};
    this.inputValues = {};
    this.toggleStates = {};
    
    // Track current section
    this.currentSectionId = this.schema.sections[0]?.id || null;
    
    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the complete survey UI
   */
  render() {
    this.container.innerHTML = `
      <div class="survey-container" id="survey-ui-root">
        ${this.renderProgress()}
        ${this.renderNavigation()}
        <div class="survey-sections-wrapper">
          ${this.schema.sections.map(section => this.renderSection(section)).join('')}
        </div>
        ${this.renderQuickActions()}
      </div>
    `;

    // Show first section by default
    this.showSection(this.currentSectionId);
  }

  /**
   * Render progress bar
   */
  renderProgress() {
    const completedSections = this.getCompletedSectionsCount();
    const totalSections = this.schema.sections.length;
    const percentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    return `
      <div class="survey-progress">
        <div class="survey-progress-bar">
          <div class="survey-progress-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="survey-progress-text">${completedSections}/${totalSections} sections</span>
      </div>
    `;
  }

  /**
   * Render section navigation bar
   */
  renderNavigation() {
    return `
      <nav class="survey-nav">
        ${this.schema.sections.map(section => {
          const selectionCount = this.getSectionSelectionCount(section.id);
          const hasSelections = selectionCount > 0;
          
          return `
            <button 
              class="survey-nav-btn ${section.id === this.currentSectionId ? 'active' : ''} ${hasSelections ? 'has-selections' : ''}"
              data-section-id="${section.id}"
            >
              <span>${section.icon || '📋'}</span>
              <span>${section.title}</span>
              ${hasSelections ? `<span class="nav-badge">${selectionCount}</span>` : ''}
            </button>
          `;
        }).join('')}
      </nav>
    `;
  }

  /**
   * Render a single section
   */
  renderSection(section) {
    return `
      <section 
        class="survey-section" 
        id="survey-section-${section.id}"
        data-section-id="${section.id}"
      >
        <div class="survey-section-header">
          <h3>${section.icon || '📋'} ${section.title}</h3>
          ${section.description ? `<p>${section.description}</p>` : ''}
        </div>

        ${section.tiles && section.tiles.length > 0 ? this.renderTileGrid(section) : ''}
        ${section.inputs && section.inputs.length > 0 ? this.renderInputs(section) : ''}
        ${section.toggles && section.toggles.length > 0 ? this.renderToggles(section) : ''}
        
        ${this.renderSectionSummary(section)}
      </section>
    `;
  }

  /**
   * Render tile grid for a section
   */
  renderTileGrid(section) {
    // Group tiles by their group property
    const groups = {};
    section.tiles.forEach(tile => {
      const group = tile.group || 'default';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(tile);
    });

    // If multiple groups, render with group headers
    if (Object.keys(groups).length > 1 || section.multiSelect) {
      return Object.entries(groups).map(([groupName, tiles]) => `
        <div class="survey-multi-select-group">
          ${groupName !== 'default' ? `<h4>${this.formatGroupName(groupName)}</h4>` : ''}
          <div class="survey-tile-grid">
            ${tiles.map(tile => this.renderTile(tile, section)).join('')}
          </div>
        </div>
      `).join('');
    }

    return `
      <div class="survey-tile-grid">
        ${section.tiles.map(tile => this.renderTile(tile, section)).join('')}
      </div>
    `;
  }

  /**
   * Render a single tile
   */
  renderTile(tile, section) {
    const isSelected = this.isTileSelected(section.id, tile.id);
    const variantClass = tile.variant ? `tile-${tile.variant}` : '';

    return `
      <div 
        class="survey-tile ${isSelected ? 'selected' : ''} ${variantClass}"
        data-section-id="${section.id}"
        data-tile-id="${tile.id}"
        data-group="${tile.group || ''}"
        data-value="${getTileValue(tile)}"
        data-multi-select="${section.multiSelect || false}"
      >
        <span class="survey-tile-icon">${tile.icon || '📌'}</span>
        <span class="survey-tile-label">${tile.label}</span>
        ${tile.sublabel ? `<span class="survey-tile-sublabel">${tile.sublabel}</span>` : ''}
      </div>
    `;
  }

  /**
   * Render input fields for a section
   */
  renderInputs(section) {
    return section.inputs.map(input => {
      const value = this.inputValues[`${section.id}-${input.id}`] || '';
      
      if (input.type === 'textarea') {
        return `
          <div class="survey-tile-input">
            <label for="survey-input-${section.id}-${input.id}">${input.label}</label>
            <textarea
              id="survey-input-${section.id}-${input.id}"
              data-section-id="${section.id}"
              data-input-id="${input.id}"
              placeholder="${input.placeholder || ''}"
            >${value}</textarea>
          </div>
        `;
      }

      return `
        <div class="survey-tile-input">
          <label for="survey-input-${section.id}-${input.id}">${input.label}</label>
          <input
            type="${input.type || 'text'}"
            id="survey-input-${section.id}-${input.id}"
            data-section-id="${section.id}"
            data-input-id="${input.id}"
            value="${value}"
            placeholder="${input.placeholder || ''}"
            ${input.min !== undefined ? `min="${input.min}"` : ''}
            ${input.max !== undefined ? `max="${input.max}"` : ''}
          />
        </div>
      `;
    }).join('');
  }

  /**
   * Render toggle switches for a section
   */
  renderToggles(section) {
    return section.toggles.map(toggle => {
      const isSelected = this.toggleStates[`${section.id}-${toggle.id}`] || false;
      
      return `
        <div 
          class="survey-toggle-tile ${isSelected ? 'selected' : ''}"
          data-section-id="${section.id}"
          data-toggle-id="${toggle.id}"
        >
          <span class="survey-toggle-label">${toggle.label}</span>
          <div class="survey-toggle-switch"></div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render section summary showing current selections
   */
  renderSectionSummary(section) {
    const selections = this.getSectionSelections(section.id);
    if (selections.length === 0) return '';

    return `
      <div class="survey-section-summary">
        <h4>Current Selections</h4>
        <ul>
          ${selections.map(sel => `<li>${sel}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  /**
   * Render quick action buttons
   */
  renderQuickActions() {
    return `
      <div class="survey-quick-actions">
        <button class="survey-quick-btn secondary" data-action="prev-section">
          ← Previous
        </button>
        <button class="survey-quick-btn" data-action="next-section">
          Next →
        </button>
        <button class="survey-quick-btn secondary" data-action="clear-section">
          Clear Section
        </button>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Navigation buttons
    this.container.addEventListener('click', (e) => {
      const navBtn = e.target.closest('.survey-nav-btn');
      if (navBtn) {
        const sectionId = navBtn.dataset.sectionId;
        this.showSection(sectionId);
        return;
      }

      // Tile clicks
      const tile = e.target.closest('.survey-tile');
      if (tile) {
        this.handleTileClick(tile);
        return;
      }

      // Toggle clicks
      const toggle = e.target.closest('.survey-toggle-tile');
      if (toggle) {
        this.handleToggleClick(toggle);
        return;
      }

      // Quick action buttons
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        this.handleQuickAction(actionBtn.dataset.action);
        return;
      }
    });

    // Input changes
    this.container.addEventListener('input', (e) => {
      const input = e.target.closest('[data-input-id]');
      if (input) {
        this.handleInputChange(input);
      }
    });
  }

  /**
   * Handle tile click
   */
  handleTileClick(tileEl) {
    const sectionId = tileEl.dataset.sectionId;
    const tileId = tileEl.dataset.tileId;
    const group = tileEl.dataset.group;
    const value = tileEl.dataset.value;
    const isMultiSelect = tileEl.dataset.multiSelect === 'true';

    // Check if already selected
    const isCurrentlySelected = tileEl.classList.contains('selected');

    if (isMultiSelect) {
      // Multi-select: toggle this tile
      if (isCurrentlySelected) {
        tileEl.classList.remove('selected');
        this.removeSelection(sectionId, tileId);
      } else {
        tileEl.classList.add('selected');
        this.addSelection(sectionId, tileId, value);
      }
    } else if (group) {
      // Single-select within group: deselect others in group
      const groupTiles = this.container.querySelectorAll(
        `.survey-tile[data-section-id="${sectionId}"][data-group="${group}"]`
      );
      groupTiles.forEach(t => {
        t.classList.remove('selected');
        this.removeSelection(sectionId, t.dataset.tileId);
      });

      // Select this one (unless toggling off)
      if (!isCurrentlySelected) {
        tileEl.classList.add('selected');
        this.addSelection(sectionId, tileId, value);
      }
    } else {
      // No group: simple toggle
      if (isCurrentlySelected) {
        tileEl.classList.remove('selected');
        this.removeSelection(sectionId, tileId);
      } else {
        tileEl.classList.add('selected');
        this.addSelection(sectionId, tileId, value);
      }
    }

    // Emit event
    const newSelected = tileEl.classList.contains('selected');
    this.onTileToggle(sectionId, tileId, newSelected, value, group);

    // Update UI
    this.updateProgress();
    this.updateNavigation();
    this.updateSectionSummary(sectionId);
  }

  /**
   * Handle toggle click
   */
  handleToggleClick(toggleEl) {
    const sectionId = toggleEl.dataset.sectionId;
    const toggleId = toggleEl.dataset.toggleId;

    const isCurrentlySelected = toggleEl.classList.contains('selected');
    
    if (isCurrentlySelected) {
      toggleEl.classList.remove('selected');
      this.toggleStates[`${sectionId}-${toggleId}`] = false;
    } else {
      toggleEl.classList.add('selected');
      this.toggleStates[`${sectionId}-${toggleId}`] = true;
    }

    this.onToggleChange(sectionId, toggleId, !isCurrentlySelected);
    this.updateProgress();
    this.updateNavigation();
  }

  /**
   * Handle input change
   */
  handleInputChange(inputEl) {
    const sectionId = inputEl.dataset.sectionId;
    const inputId = inputEl.dataset.inputId;
    const value = inputEl.value;

    this.inputValues[`${sectionId}-${inputId}`] = value;
    this.onInputChange(sectionId, inputId, value);
    this.updateProgress();
    this.updateNavigation();
  }

  /**
   * Handle quick action button
   */
  handleQuickAction(action) {
    const sections = this.schema.sections;
    const currentIndex = sections.findIndex(s => s.id === this.currentSectionId);

    switch (action) {
      case 'prev-section':
        if (currentIndex > 0) {
          this.showSection(sections[currentIndex - 1].id);
        }
        break;
      case 'next-section':
        if (currentIndex < sections.length - 1) {
          this.showSection(sections[currentIndex + 1].id);
        }
        break;
      case 'clear-section':
        this.clearSection(this.currentSectionId);
        break;
    }
  }

  /**
   * Show a specific section
   */
  showSection(sectionId) {
    this.currentSectionId = sectionId;

    // Update nav buttons
    this.container.querySelectorAll('.survey-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sectionId === sectionId);
    });

    // Show/hide sections
    this.container.querySelectorAll('.survey-section').forEach(section => {
      section.classList.toggle('active', section.dataset.sectionId === sectionId);
    });
  }

  /**
   * Clear all selections in a section
   */
  clearSection(sectionId) {
    // Clear tiles
    this.container.querySelectorAll(`.survey-tile[data-section-id="${sectionId}"]`).forEach(tile => {
      tile.classList.remove('selected');
    });

    // Clear toggles
    this.container.querySelectorAll(`.survey-toggle-tile[data-section-id="${sectionId}"]`).forEach(toggle => {
      toggle.classList.remove('selected');
    });

    // Clear inputs
    this.container.querySelectorAll(`[data-section-id="${sectionId}"][data-input-id]`).forEach(input => {
      input.value = '';
    });

    // Clear state
    delete this.selections[sectionId];
    Object.keys(this.inputValues).forEach(key => {
      if (key.startsWith(`${sectionId}-`)) {
        delete this.inputValues[key];
      }
    });
    Object.keys(this.toggleStates).forEach(key => {
      if (key.startsWith(`${sectionId}-`)) {
        delete this.toggleStates[key];
      }
    });

    this.updateProgress();
    this.updateNavigation();
    this.updateSectionSummary(sectionId);
  }

  /**
   * Add a selection
   */
  addSelection(sectionId, tileId, value) {
    if (!this.selections[sectionId]) {
      this.selections[sectionId] = {};
    }
    this.selections[sectionId][tileId] = value;
  }

  /**
   * Remove a selection
   */
  removeSelection(sectionId, tileId) {
    if (this.selections[sectionId]) {
      delete this.selections[sectionId][tileId];
    }
  }

  /**
   * Check if a tile is selected
   */
  isTileSelected(sectionId, tileId) {
    return !!(this.selections[sectionId] && this.selections[sectionId][tileId]);
  }

  /**
   * Get selection count for a section
   */
  getSectionSelectionCount(sectionId) {
    const tileCount = this.selections[sectionId] ? Object.keys(this.selections[sectionId]).length : 0;
    
    let inputCount = 0;
    Object.keys(this.inputValues).forEach(key => {
      if (key.startsWith(`${sectionId}-`) && this.inputValues[key]) {
        inputCount++;
      }
    });

    let toggleCount = 0;
    Object.keys(this.toggleStates).forEach(key => {
      if (key.startsWith(`${sectionId}-`) && this.toggleStates[key]) {
        toggleCount++;
      }
    });

    return tileCount + inputCount + toggleCount;
  }

  /**
   * Get list of selections for summary
   */
  getSectionSelections(sectionId) {
    const selections = [];

    // Tiles
    if (this.selections[sectionId]) {
      const section = this.schema.sections.find(s => s.id === sectionId);
      Object.keys(this.selections[sectionId]).forEach(tileId => {
        const tile = section?.tiles?.find(t => t.id === tileId);
        if (tile) {
          selections.push(`${tile.icon || '✓'} ${tile.label}`);
        }
      });
    }

    // Inputs
    Object.keys(this.inputValues).forEach(key => {
      if (key.startsWith(`${sectionId}-`) && this.inputValues[key]) {
        const inputId = key.replace(`${sectionId}-`, '');
        selections.push(`📝 ${inputId}: ${this.inputValues[key]}`);
      }
    });

    // Toggles
    Object.keys(this.toggleStates).forEach(key => {
      if (key.startsWith(`${sectionId}-`) && this.toggleStates[key]) {
        const toggleId = key.replace(`${sectionId}-`, '');
        const section = this.schema.sections.find(s => s.id === sectionId);
        const toggle = section?.toggles?.find(t => t.id === toggleId);
        if (toggle) {
          selections.push(`✅ ${toggle.label}`);
        }
      }
    });

    return selections;
  }

  /**
   * Get completed sections count
   */
  getCompletedSectionsCount() {
    return this.schema.sections.filter(section => 
      this.getSectionSelectionCount(section.id) > 0
    ).length;
  }

  /**
   * Update progress bar
   */
  updateProgress() {
    const completedSections = this.getCompletedSectionsCount();
    const totalSections = this.schema.sections.length;
    const percentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    const progressFill = this.container.querySelector('.survey-progress-fill');
    const progressText = this.container.querySelector('.survey-progress-text');

    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    if (progressText) {
      progressText.textContent = `${completedSections}/${totalSections} sections`;
    }
  }

  /**
   * Update navigation badges
   */
  updateNavigation() {
    this.container.querySelectorAll('.survey-nav-btn').forEach(btn => {
      const sectionId = btn.dataset.sectionId;
      const count = this.getSectionSelectionCount(sectionId);
      const hasSelections = count > 0;

      btn.classList.toggle('has-selections', hasSelections);

      let badge = btn.querySelector('.nav-badge');
      if (hasSelections) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'nav-badge';
          btn.appendChild(badge);
        }
        badge.textContent = count;
      } else if (badge) {
        badge.remove();
      }
    });
  }

  /**
   * Update section summary
   */
  updateSectionSummary(sectionId) {
    const sectionEl = this.container.querySelector(`#survey-section-${sectionId}`);
    if (!sectionEl) return;

    let summaryEl = sectionEl.querySelector('.survey-section-summary');
    const selections = this.getSectionSelections(sectionId);

    if (selections.length === 0) {
      if (summaryEl) {
        summaryEl.remove();
      }
      return;
    }

    const summaryHtml = `
      <div class="survey-section-summary">
        <h4>Current Selections</h4>
        <ul>
          ${selections.map(sel => `<li>${sel}</li>`).join('')}
        </ul>
      </div>
    `;

    if (summaryEl) {
      summaryEl.outerHTML = summaryHtml;
    } else {
      sectionEl.insertAdjacentHTML('beforeend', summaryHtml);
    }
  }

  /**
   * Format group name for display
   */
  formatGroupName(group) {
    return group
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Get all current state
   */
  getState() {
    return {
      selections: this.selections,
      inputs: this.inputValues,
      toggles: this.toggleStates,
      currentSection: this.currentSectionId
    };
  }

  /**
   * Set state from saved data
   */
  setState(state) {
    if (state.selections) {
      this.selections = state.selections;
    }
    if (state.inputs) {
      this.inputValues = state.inputs;
    }
    if (state.toggles) {
      this.toggleStates = state.toggles;
    }
    if (state.currentSection) {
      this.currentSectionId = state.currentSection;
    }

    // Re-render with new state
    this.render();
    this.attachEventListeners();
  }

  /**
   * Destroy the component
   */
  destroy() {
    this.container.innerHTML = '';
    this.selections = {};
    this.inputValues = {};
    this.toggleStates = {};
  }
}

// Export for use in other modules
export { SurveyUI };
