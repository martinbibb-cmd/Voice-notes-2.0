/**
 * Diary Module
 * Handles the diary view with customer details entry and appointment management
 * Implements file saving with lead number folder structure
 */

import { sessionState, updateSessionMetadata, updateFormField } from './appState.js';

// U-Value lookup tables based on building age and construction type
const U_VALUES = {
  walls: {
    'solid-uninsulated': 2.1,
    'solid-insulated': 0.6,
    'cavity-uninsulated': 1.5,
    'cavity-filled': 0.5,
    'timber-frame': 0.4,
    'modern-insulated': 0.3
  },
  glazing: {
    'single': 5.0,
    'old-double': 3.0,
    'modern-double': 1.6,
    'triple': 1.0
  },
  roof: {
    'none': 2.3,
    '100mm': 0.4,
    '200mm': 0.2,
    '270mm+': 0.15,
    'flat-uninsulated': 1.5,
    'flat-insulated': 0.25
  },
  floor: {
    'suspended-uninsulated': 0.7,
    'suspended-insulated': 0.25,
    'solid-uninsulated': 0.8,
    'solid-insulated': 0.25
  }
};

// Default U-values by building age
const AGE_DEFAULTS = {
  'pre-1900': { walls: 'solid-uninsulated', glazing: 'single', roof: 'none', floor: 'suspended-uninsulated' },
  '1900-1929': { walls: 'solid-uninsulated', glazing: 'single', roof: 'none', floor: 'suspended-uninsulated' },
  '1930-1949': { walls: 'cavity-uninsulated', glazing: 'single', roof: 'none', floor: 'suspended-uninsulated' },
  '1950-1965': { walls: 'cavity-uninsulated', glazing: 'single', roof: 'none', floor: 'solid-uninsulated' },
  '1966-1975': { walls: 'cavity-uninsulated', glazing: 'single', roof: '100mm', floor: 'solid-uninsulated' },
  '1976-1990': { walls: 'cavity-uninsulated', glazing: 'old-double', roof: '100mm', floor: 'solid-uninsulated' },
  '1991-2005': { walls: 'cavity-filled', glazing: 'modern-double', roof: '200mm', floor: 'solid-insulated' },
  '2006-2012': { walls: 'cavity-filled', glazing: 'modern-double', roof: '270mm+', floor: 'solid-insulated' },
  '2013-present': { walls: 'modern-insulated', glazing: 'modern-double', roof: '270mm+', floor: 'solid-insulated' }
};

/**
 * Store diary data in session state
 */
export function saveDiaryToSession() {
  const diaryData = {
    leadNumber: document.getElementById('lead-number')?.value || '',
    appointmentDate: document.getElementById('appointment-date')?.value || '',
    appointmentTime: document.getElementById('appointment-time')?.value || '',
    customerName: document.getElementById('diary-customer-name')?.value || '',
    customerPhone: document.getElementById('diary-customer-phone')?.value || '',
    customerEmail: document.getElementById('diary-customer-email')?.value || '',
    customerAddress: document.getElementById('diary-customer-address')?.value || '',
    customerPostcode: document.getElementById('diary-customer-postcode')?.value || '',
    propertyType: document.getElementById('diary-property-type')?.value || '',
    bedrooms: document.getElementById('diary-bedrooms')?.value || '',
    bathrooms: document.getElementById('diary-bathrooms')?.value || '',
    occupants: document.getElementById('diary-occupants')?.value || '',
    systemType: document.querySelector('input[name="diary-system-type"]:checked')?.value || '',
    cylinderType: document.querySelector('input[name="diary-cylinder-type"]:checked')?.value || '',
    coils: document.querySelector('input[name="diary-coils"]:checked')?.value || '',
    secondHeatSource: document.querySelector('input[name="diary-second-heat"]:checked')?.value || '',
    notes: document.getElementById('diary-notes')?.value || ''
  };

  // Update session metadata
  updateSessionMetadata({
    sessionId: diaryData.leadNumber || `session_${Date.now()}`,
    customerName: diaryData.customerName,
    customerAddress: diaryData.customerAddress,
    leadNumber: diaryData.leadNumber
  });

  // Store in session state
  sessionState.diary = diaryData;

  return diaryData;
}

/**
 * Load diary data from session state
 */
export function loadDiaryFromSession() {
  if (!sessionState.diary) return;

  const d = sessionState.diary;
  if (d.leadNumber) document.getElementById('lead-number').value = d.leadNumber;
  if (d.appointmentDate) document.getElementById('appointment-date').value = d.appointmentDate;
  if (d.appointmentTime) document.getElementById('appointment-time').value = d.appointmentTime;
  if (d.customerName) document.getElementById('diary-customer-name').value = d.customerName;
  if (d.customerPhone) document.getElementById('diary-customer-phone').value = d.customerPhone;
  if (d.customerEmail) document.getElementById('diary-customer-email').value = d.customerEmail;
  if (d.customerAddress) document.getElementById('diary-customer-address').value = d.customerAddress;
  if (d.customerPostcode) document.getElementById('diary-customer-postcode').value = d.customerPostcode;
  if (d.propertyType) document.getElementById('diary-property-type').value = d.propertyType;
  if (d.bedrooms) document.getElementById('diary-bedrooms').value = d.bedrooms;
  if (d.bathrooms) document.getElementById('diary-bathrooms').value = d.bathrooms;
  if (d.occupants) document.getElementById('diary-occupants').value = d.occupants;
  if (d.notes) document.getElementById('diary-notes').value = d.notes;

  // Set radio buttons
  if (d.systemType) {
    const radio = document.querySelector(`input[name="diary-system-type"][value="${d.systemType}"]`);
    if (radio) radio.checked = true;
  }
  if (d.cylinderType) {
    const radio = document.querySelector(`input[name="diary-cylinder-type"][value="${d.cylinderType}"]`);
    if (radio) radio.checked = true;
  }
  if (d.coils) {
    const radio = document.querySelector(`input[name="diary-coils"][value="${d.coils}"]`);
    if (radio) radio.checked = true;
  }
}

/**
 * Sync diary data to survey form
 */
export function syncDiaryToSurvey() {
  const diaryData = saveDiaryToSession();

  // Sync to survey Customer & Property tab
  const customerName = document.getElementById('customer-name');
  const customerAddress = document.getElementById('customer-address');
  const propertyType = document.getElementById('property-type');
  const bedrooms = document.getElementById('property-bedrooms');
  const bathrooms = document.getElementById('property-bathrooms');
  const occupants = document.getElementById('property-occupants');

  if (customerName && diaryData.customerName) customerName.value = diaryData.customerName;
  if (customerAddress && diaryData.customerAddress) customerAddress.value = diaryData.customerAddress;
  if (propertyType && diaryData.propertyType) propertyType.value = diaryData.propertyType;
  if (bedrooms && diaryData.bedrooms) bedrooms.value = diaryData.bedrooms;
  if (bathrooms && diaryData.bathrooms) bathrooms.value = diaryData.bathrooms;
  if (occupants && diaryData.occupants) occupants.value = diaryData.occupants;

  // Sync system type to current system tab
  if (diaryData.systemType) {
    const radio = document.querySelector(`input[name="existing-boiler-type"][value="${diaryData.systemType}"]`);
    if (radio) radio.checked = true;
  }

  // Sync cylinder type
  if (diaryData.cylinderType && diaryData.cylinderType !== 'na') {
    const radio = document.querySelector(`input[name="existing-cylinder"][value="${diaryData.cylinderType}"]`);
    if (radio) radio.checked = true;
  }

  // Sync coils
  if (diaryData.coils) {
    const radio = document.querySelector(`input[name="cylinder-coils"][value="${diaryData.coils}"]`);
    if (radio) radio.checked = true;
  }

  // Update appState form fields
  updateFormField('propertyType', diaryData.propertyType);
  updateFormField('bedrooms', diaryData.bedrooms);
  updateFormField('bathrooms', diaryData.bathrooms);
  updateFormField('occupancy', diaryData.occupants);
  updateFormField('currentSystemType', diaryData.systemType);
  updateFormField('cylinderType', diaryData.cylinderType);
}

/**
 * Calculate heat loss based on property measurements and U-values
 */
export function calculateHeatLoss() {
  // Get U-values from selections
  const wallConstruction = document.getElementById('wall-construction')?.value;
  const glazingType = document.getElementById('glazing-type')?.value;
  const roofInsulation = document.getElementById('roof-insulation')?.value;
  const floorInsulation = document.getElementById('floor-insulation')?.value;

  // Get areas
  const wallArea = parseFloat(document.getElementById('wall-area')?.value) || 0;
  const windowArea = parseFloat(document.getElementById('window-area')?.value) || 0;
  const roofArea = parseFloat(document.getElementById('roof-area')?.value) || 0;
  const floorArea = parseFloat(document.getElementById('ground-floor-area')?.value) || 0;

  // Get temperature difference (indoor 21°C, outdoor assume -3°C for UK design conditions)
  const flowTemp = parseInt(document.getElementById('flow-temp')?.value) || 70;
  const indoorTemp = 21;
  const outdoorTemp = -3;
  const deltaT = indoorTemp - outdoorTemp;

  // Get U-values
  const wallU = U_VALUES.walls[wallConstruction] || 1.5;
  const glazingU = U_VALUES.glazing[glazingType] || 3.0;
  const roofU = U_VALUES.roof[roofInsulation] || 0.4;
  const floorU = U_VALUES.floor[floorInsulation] || 0.5;

  // Calculate fabric heat loss (Q = U × A × ΔT)
  const wallLoss = wallU * (wallArea - windowArea) * deltaT;
  const windowLoss = glazingU * windowArea * deltaT;
  const roofLoss = roofU * roofArea * deltaT;
  const floorLoss = floorU * floorArea * deltaT;

  // Total fabric loss
  let totalFabricLoss = wallLoss + windowLoss + roofLoss + floorLoss;

  // Add ventilation heat loss (approximate)
  // Assume 0.5 air changes per hour, volume = floor area * 2.4m ceiling height
  const volume = floorArea * 2.4;
  const airChanges = 0.5;
  const ventilationLoss = 0.33 * volume * airChanges * deltaT;

  // Total heat loss in Watts, convert to kW
  const totalHeatLoss = (totalFabricLoss + ventilationLoss) / 1000;

  // Add 10% safety margin
  const finalHeatLoss = totalHeatLoss * 1.1;

  // Display result
  const resultInput = document.getElementById('heat-loss-result');
  if (resultInput) {
    resultInput.value = finalHeatLoss.toFixed(1);
  }

  // Store in session
  sessionState.heatLoss = {
    calculated: finalHeatLoss,
    fabric: totalFabricLoss / 1000,
    ventilation: ventilationLoss / 1000,
    wallU, glazingU, roofU, floorU,
    areas: { wall: wallArea, window: windowArea, roof: roofArea, floor: floorArea }
  };

  return finalHeatLoss;
}

/**
 * Set default U-values based on building age
 */
export function setDefaultsFromAge(age) {
  const defaults = AGE_DEFAULTS[age];
  if (!defaults) return;

  const wallSelect = document.getElementById('wall-construction');
  const glazingSelect = document.getElementById('glazing-type');
  const roofSelect = document.getElementById('roof-insulation');
  const floorSelect = document.getElementById('floor-insulation');

  if (wallSelect) wallSelect.value = defaults.walls;
  if (glazingSelect) glazingSelect.value = defaults.glazing;
  if (roofSelect) roofSelect.value = defaults.roof;
  if (floorSelect) floorSelect.value = defaults.floor;
}

/**
 * Create job folder structure for saving
 */
export function getJobFolderName() {
  const leadNumber = document.getElementById('lead-number')?.value || '';
  const customerName = document.getElementById('diary-customer-name')?.value || '';
  const date = new Date().toISOString().split('T')[0];

  if (leadNumber) {
    return sanitizeFilename(leadNumber);
  } else if (customerName) {
    return sanitizeFilename(`${customerName}_${date}`);
  }
  return `Job_${date}`;
}

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

/**
 * Export job with folder structure
 */
export async function exportJobWithFolderStructure(jobData, contentType, contentBlob) {
  const folderName = getJobFolderName();
  
  // Generate filename based on content type
  let filename;
  switch (contentType) {
    case 'transcript':
      filename = `${folderName}_transcript.txt`;
      break;
    case 'survey':
      filename = `${folderName}_survey.json`;
      break;
    case 'photos':
      filename = `${folderName}_photos.zip`;
      break;
    case 'session':
      filename = `${folderName}_complete.json`;
      break;
    default:
      filename = `${folderName}_${contentType}.json`;
  }

  // Download file
  const url = URL.createObjectURL(contentBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Initialize diary module event listeners
 */
export function initDiary() {
  // Start Appointment button
  const startBtn = document.getElementById('start-appointment-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const leadNumber = document.getElementById('lead-number')?.value;
      if (!leadNumber) {
        alert('Please enter a Lead Number before starting the appointment.');
        document.getElementById('lead-number')?.focus();
        return;
      }

      // Save diary data
      saveDiaryToSession();

      // Sync to survey
      syncDiaryToSurvey();

      // Switch to Survey tab
      const surveyTab = document.querySelector('.tab[data-tab="survey"]');
      if (surveyTab) {
        surveyTab.click();
      }

      // Show confirmation
      console.log('Appointment started for lead:', leadNumber);
    });
  }

  // Save Diary button
  const saveBtn = document.getElementById('save-diary-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveDiaryToSession();
      localStorage.setItem('voiceNotes2_diary', JSON.stringify(sessionState.diary));
      alert('Customer details saved!');
    });
  }

  // Coils radio buttons - show/hide second heat source
  const coilRadios = document.querySelectorAll('input[name="diary-coils"]');
  const secondHeatGroup = document.getElementById('second-heat-source-group');
  coilRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (secondHeatGroup) {
        secondHeatGroup.style.display = radio.value === 'twin' ? 'block' : 'none';
      }
    });
  });

  // Also handle in survey current system tab
  const surveyCoilRadios = document.querySelectorAll('input[name="cylinder-coils"]');
  const secondHeatSection = document.getElementById('second-heat-source-section');
  surveyCoilRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (secondHeatSection) {
        secondHeatSection.style.display = radio.value === 'twin' ? 'block' : 'none';
      }
    });
  });

  // Building age selection - set default U-values
  const buildingAgeSelect = document.getElementById('building-age');
  if (buildingAgeSelect) {
    buildingAgeSelect.addEventListener('change', (e) => {
      setDefaultsFromAge(e.target.value);
    });
  }

  // Calculate heat loss button
  const calcBtn = document.getElementById('calculate-heat-loss-btn');
  if (calcBtn) {
    calcBtn.addEventListener('click', calculateHeatLoss);
  }

  // EPC upload handler
  const epcUpload = document.getElementById('epc-upload');
  if (epcUpload) {
    epcUpload.addEventListener('change', handleEpcUpload);
  }

  // EPC search button
  const epcSearchBtn = document.getElementById('search-epc-btn');
  if (epcSearchBtn) {
    epcSearchBtn.addEventListener('click', () => {
      const postcode = document.getElementById('epc-postcode')?.value;
      if (postcode) {
        window.open(`https://www.gov.uk/find-energy-certificate?postcode=${encodeURIComponent(postcode)}`, '_blank');
      } else {
        window.open('https://www.gov.uk/find-energy-certificate', '_blank');
      }
    });
  }

  // Load saved diary data
  try {
    const savedDiary = localStorage.getItem('voiceNotes2_diary');
    if (savedDiary) {
      sessionState.diary = JSON.parse(savedDiary);
      loadDiaryFromSession();
    }
  } catch (e) {
    console.warn('Could not load saved diary data:', e);
  }

  console.log('[Diary] Module initialized');
}

/**
 * Handle EPC file upload
 */
async function handleEpcUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const displayEl = document.getElementById('epc-data-display');
  if (!displayEl) return;

  displayEl.style.display = 'block';
  displayEl.innerHTML = '<p>Processing EPC document...</p>';

  try {
    // For now, just show that file was uploaded
    // In a real implementation, this would use OCR or PDF parsing
    displayEl.innerHTML = `
      <h5 style="margin: 0 0 8px 0; color: #10b981;">📄 EPC Uploaded: ${file.name}</h5>
      <p style="margin: 0; color: var(--muted); font-size: 0.9rem;">
        Manual entry required. Please review the certificate and enter values in the U-value dropdowns above.
      </p>
      <p style="margin: 8px 0 0 0; font-size: 0.85rem;">
        <strong>Tip:</strong> Look for the "Main heating" and "Walls", "Roof", "Floor", "Windows" sections in the EPC.
      </p>
    `;

    // Store file reference in session
    sessionState.epcFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('EPC upload error:', error);
    displayEl.innerHTML = `<p style="color: var(--danger);">Error processing file: ${error.message}</p>`;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initDiary, 200);
  });
} else {
  setTimeout(initDiary, 200);
}

// Export for use by other modules
export default {
  initDiary,
  saveDiaryToSession,
  loadDiaryFromSession,
  syncDiaryToSurvey,
  calculateHeatLoss,
  setDefaultsFromAge,
  getJobFolderName,
  exportJobWithFolderStructure
};
