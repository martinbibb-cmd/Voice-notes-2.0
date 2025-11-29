/**
 * Survey Options Parser
 * Parses markdown-formatted survey options and converts to structured data
 * Used to define survey sections, tiles, and their relationships
 */

/**
 * Default survey schema - defines sections, tiles, and mappings
 * This can be overridden or extended by parsing an Options.md file
 */
export const DEFAULT_SURVEY_SCHEMA = {
  sections: [
    {
      id: 'property',
      title: 'Property Details',
      icon: '🏠',
      description: 'Basic property information',
      tiles: [
        { id: 'detached', label: 'Detached', icon: '🏡', group: 'propertyType' },
        { id: 'semi', label: 'Semi-detached', icon: '🏘️', group: 'propertyType' },
        { id: 'mid-terrace', label: 'Mid-terrace', icon: '🏠', group: 'propertyType' },
        { id: 'end-terrace', label: 'End-terrace', icon: '🏚️', group: 'propertyType' },
        { id: 'flat', label: 'Flat', icon: '🏢', group: 'propertyType' },
        { id: 'bungalow', label: 'Bungalow', icon: '🏠', group: 'propertyType' }
      ],
      inputs: [
        { id: 'bedrooms', label: 'Bedrooms', type: 'number', min: 1, max: 10 },
        { id: 'bathrooms', label: 'Bathrooms', type: 'number', min: 1, max: 5 },
        { id: 'occupancy', label: 'Occupants', type: 'number', min: 1, max: 12 }
      ]
    },
    {
      id: 'current-system',
      title: 'Current System',
      icon: '🔧',
      description: 'Existing heating system details',
      tiles: [
        { id: 'regular', label: 'Regular Boiler', icon: '🔥', sublabel: 'Heat only + cylinder', group: 'currentSystemType' },
        { id: 'combi', label: 'Combi Boiler', icon: '⚡', sublabel: 'On-demand hot water', group: 'currentSystemType' },
        { id: 'system', label: 'System Boiler', icon: '🌡️', sublabel: 'Sealed + cylinder', group: 'currentSystemType' },
        { id: 'back-boiler', label: 'Back Boiler', icon: '🔶', sublabel: 'Behind fireplace', group: 'currentSystemType' },
        { id: 'electric', label: 'Electric Boiler', icon: '⚡', group: 'currentSystemType' }
      ]
    },
    {
      id: 'cylinder',
      title: 'Cylinder & Storage',
      icon: '🛢️',
      description: 'Hot water storage details',
      tiles: [
        { id: 'vented', label: 'Vented Cylinder', icon: '🔵', sublabel: 'Tank in loft', group: 'cylinderType' },
        { id: 'unvented', label: 'Unvented Cylinder', icon: '🔴', sublabel: 'Mains pressure', group: 'cylinderType' },
        { id: 'none', label: 'No Cylinder', icon: '❌', sublabel: 'Combi system', group: 'cylinderType' },
        { id: 'thermal-store', label: 'Thermal Store', icon: '🟠', group: 'cylinderType' },
        { id: 'mixergy', label: 'Mixergy', icon: '🟢', sublabel: 'Smart cylinder', group: 'cylinderType' }
      ]
    },
    {
      id: 'water-pressure',
      title: 'Water & Pressure',
      icon: '💧',
      description: 'Water pressure and flow information',
      tiles: [
        { id: 'poor', label: 'Poor Pressure', icon: '💧', variant: 'warning', group: 'waterPressure' },
        { id: 'adequate', label: 'Adequate', icon: '💧', group: 'waterPressure' },
        { id: 'good', label: 'Good Pressure', icon: '💦', group: 'waterPressure' }
      ]
    },
    {
      id: 'pipework',
      title: 'Pipework',
      icon: '🔩',
      description: 'Pipework characteristics',
      tiles: [
        { id: 'microbore-yes', label: 'Microbore', icon: '📏', sublabel: '8-10mm pipes', value: 'yes', group: 'microbore' },
        { id: 'microbore-no', label: 'Standard', icon: '📐', sublabel: '15mm+ pipes', value: 'no', group: 'microbore' },
        { id: 'microbore-unknown', label: 'Unknown', icon: '❓', value: 'unknown', group: 'microbore' }
      ],
      inputs: [
        { id: 'pumpLocation', label: 'Pump Location', type: 'text', placeholder: 'e.g., Airing cupboard, loft' }
      ]
    },
    {
      id: 'flue',
      title: 'Flue',
      icon: '🏭',
      description: 'Flue type and considerations',
      tiles: [
        { id: 'balanced', label: 'Balanced Flue', icon: '➡️', group: 'flueType' },
        { id: 'open', label: 'Open Flue', icon: '⬆️', group: 'flueType' },
        { id: 'vertical', label: 'Vertical Flue', icon: '⬆️', group: 'flueType' },
        { id: 'asbestos', label: 'Asbestos Flue', icon: '⚠️', variant: 'danger', group: 'flueType' }
      ]
    },
    {
      id: 'access',
      title: 'Access & Restrictions',
      icon: '🚪',
      description: 'Site access and working restrictions',
      inputs: [
        { id: 'loftAccess', label: 'Loft Access', type: 'text', placeholder: 'e.g., Easy access, ladder needed' },
        { id: 'parking', label: 'Parking', type: 'text', placeholder: 'e.g., Driveway, street parking' }
      ],
      toggles: [
        { id: 'scaffoldingRequired', label: 'Scaffolding Required' },
        { id: 'restrictedAccess', label: 'Restricted Access' },
        { id: 'asbestosPresent', label: 'Asbestos Present', variant: 'danger' }
      ]
    },
    {
      id: 'issues',
      title: 'Issues & Problems',
      icon: '⚠️',
      description: 'Current system issues',
      multiSelect: true,
      tiles: [
        { id: 'cold-radiators', label: 'Cold Radiators', icon: '❄️', variant: 'warning' },
        { id: 'noise', label: 'Noisy System', icon: '🔊', variant: 'warning' },
        { id: 'leaking', label: 'Leaking', icon: '💧', variant: 'danger' },
        { id: 'low-pressure', label: 'Low Pressure', icon: '📉', variant: 'warning' },
        { id: 'poor-flow', label: 'Poor Flow', icon: '🚿' },
        { id: 'inefficient', label: 'High Bills', icon: '💰', variant: 'warning' },
        { id: 'no-hot-water', label: 'No Hot Water', icon: '🚫', variant: 'danger' },
        { id: 'breakdown', label: 'Frequent Breakdowns', icon: '🔧', variant: 'danger' }
      ]
    },
    {
      id: 'requirements',
      title: 'Customer Requirements',
      icon: '✨',
      description: 'What the customer wants',
      multiSelect: true,
      tiles: [
        { id: 'efficiency', label: 'Energy Efficient', icon: '🌱' },
        { id: 'reliability', label: 'Reliable', icon: '🛡️' },
        { id: 'performance', label: 'High Performance', icon: '🚀' },
        { id: 'space-saving', label: 'Space Saving', icon: '📦' },
        { id: 'smart-controls', label: 'Smart Controls', icon: '📱' },
        { id: 'future-proof', label: 'Future Proof', icon: '🔮' },
        { id: 'quiet', label: 'Quiet Operation', icon: '🔇' },
        { id: 'budget', label: 'Budget Friendly', icon: '💵' }
      ]
    }
  ]
};

/**
 * Parse Options.md content into survey schema
 * @param {string} markdown - The markdown content to parse
 * @returns {object} Parsed survey schema
 */
export function parseOptionsMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    console.warn('No markdown content provided, using default schema');
    return DEFAULT_SURVEY_SCHEMA;
  }

  const sections = [];
  let currentSection = null;
  let currentTiles = [];
  let currentInputs = [];
  let currentToggles = [];

  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Section header (## Section Name)
    if (line.startsWith('## ')) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          ...currentSection,
          tiles: currentTiles,
          inputs: currentInputs,
          toggles: currentToggles.length > 0 ? currentToggles : undefined
        });
      }

      // Parse section header
      const headerMatch = line.match(/^## (.+?)(?:\s*\{(.+?)\})?$/);
      const title = headerMatch ? headerMatch[1].trim() : line.slice(3).trim();
      const meta = headerMatch && headerMatch[2] ? parseMetaString(headerMatch[2]) : {};

      currentSection = {
        id: meta.id || toKebabCase(title),
        title: title,
        icon: meta.icon || '📋',
        description: meta.description || '',
        multiSelect: meta.multiSelect === 'true'
      };
      currentTiles = [];
      currentInputs = [];
      currentToggles = [];
      continue;
    }

    // Skip if no current section
    if (!currentSection) continue;

    // Tile definition (- [icon] Label {meta})
    const tileMatch = line.match(/^[-*]\s*(?:\[(.+?)\])?\s*(.+?)(?:\s*\{(.+?)\})?$/);
    if (tileMatch) {
      const icon = tileMatch[1] || '📌';
      const label = tileMatch[2].trim();
      const meta = tileMatch[3] ? parseMetaString(tileMatch[3]) : {};

      currentTiles.push({
        id: meta.id || toKebabCase(label),
        label: label,
        icon: icon,
        sublabel: meta.sublabel,
        group: meta.group,
        value: meta.value,
        variant: meta.variant
      });
      continue;
    }

    // Input definition (> input: label {type: text, ...})
    const inputMatch = line.match(/^>\s*input:\s*(.+?)(?:\s*\{(.+?)\})?$/);
    if (inputMatch) {
      const label = inputMatch[1].trim();
      const meta = inputMatch[2] ? parseMetaString(inputMatch[2]) : {};

      currentInputs.push({
        id: meta.id || toKebabCase(label),
        label: label,
        type: meta.type || 'text',
        placeholder: meta.placeholder,
        min: meta.min ? parseInt(meta.min) : undefined,
        max: meta.max ? parseInt(meta.max) : undefined
      });
      continue;
    }

    // Toggle definition (> toggle: label {variant})
    const toggleMatch = line.match(/^>\s*toggle:\s*(.+?)(?:\s*\{(.+?)\})?$/);
    if (toggleMatch) {
      const label = toggleMatch[1].trim();
      const meta = toggleMatch[2] ? parseMetaString(toggleMatch[2]) : {};

      currentToggles.push({
        id: meta.id || toKebabCase(label),
        label: label,
        variant: meta.variant
      });
      continue;
    }
  }

  // Save last section
  if (currentSection) {
    sections.push({
      ...currentSection,
      tiles: currentTiles,
      inputs: currentInputs,
      toggles: currentToggles.length > 0 ? currentToggles : undefined
    });
  }

  return { sections };
}

/**
 * Parse meta string like "id: foo, icon: 🏠" into object
 */
function parseMetaString(metaStr) {
  const result = {};
  const pairs = metaStr.split(',');

  for (const pair of pairs) {
    const [key, value] = pair.split(':').map(s => s.trim());
    if (key && value) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Get tile value for sessionState mapping
 * @param {object} tile - Tile definition
 * @returns {string} Value to use for form state
 */
export function getTileValue(tile) {
  return tile.value || tile.id;
}

/**
 * Get the form field name for a tile group
 * @param {string} group - Group name
 * @returns {string} Form field name
 */
export function getFormFieldForGroup(group) {
  const mappings = {
    propertyType: 'propertyType',
    currentSystemType: 'currentSystemType',
    cylinderType: 'cylinderType',
    waterPressure: 'waterPressure',
    microbore: 'microbore',
    flueType: 'flueType'
  };

  return mappings[group] || group;
}

export default {
  DEFAULT_SURVEY_SCHEMA,
  parseOptionsMarkdown,
  getTileValue,
  getFormFieldForGroup
};
