export const appState = {
  transcript: "",
  sections: {},
  checklistStatus: {},
  materials: [],
};

export function resetAppState() {
  appState.transcript = "";
  appState.sections = {};
  appState.checklistStatus = {};
  appState.materials = [];
}

// Single source of truth for the whole session
export const sessionState = {
  metadata: {
    sessionId: '',
    createdAt: new Date().toISOString(),
    leadNumber: '',
    customerName: '',
    customerAddress: '',
  },
  // Diary / Appointment data
  diary: {
    leadNumber: '',
    appointmentDate: '',
    appointmentTime: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerPostcode: '',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    occupants: '',
    systemType: '',
    cylinderType: '',
    coils: '',
    secondHeatSource: '',
    notes: '',
  },
  transcript: {
    raw: '',
    processed: '',
  },
  form: {
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    occupancy: '',
    currentSystemType: '',
    cylinderType: '',
    waterPressure: '',
    microbore: '',
    pumpLocation: '',
    flueType: '',
    hazards: [],
    parking: '',
    loftAccess: '',
  },
  // Heat loss calculator data
  heatLoss: {
    calculated: null,
    fabric: null,
    ventilation: null,
    wallU: null,
    glazingU: null,
    roofU: null,
    floorU: null,
    dimensions: {
      width: null,
      length: null,
      ceilingHeight: null
    },
    areas: {
      wall: null,
      window: null,
      roof: null,
      floor: null
    },
    buildingAge: '',
    flowTemp: ''
  },
  // Safety checks data
  safety: {
    safetyIssues: [],
    ladderWork: [],
    accessEquipment: [],
    roofConcerns: [],
    earthingSystem: '',
    earthImpedance: '',
    electrics: [],
    gasMeterLocation: '',
    gasPipeSize: '',
    gasLeakSigns: [],
    accessHazards: [],
    safetyNotes: ''
  },
  // EPC data
  epc: {
    file: null,
    rating: '',
    recommendations: [],
    heatLoss: null,
    currentSystem: ''
  },
  sections: {
    Needs: '',
    WorkingAtHeights: '',
    SystemCharacteristics: '',
    ComponentsThatRequireAssistance: '',
    RestrictionsToWork: '',
    ExternalHazards: '',
    DeliveryNotes: '',
    OfficeNotes: '',
    NewBoilerAndControls: '',
    Flue: '',
    Pipework: '',
    Disruption: '',
    CustomerActions: '',
    FuturePlans: '',
  },
  // System recommendation + quoting
  recommendation: null,    // raw JSON from System-recommendation
  engineerChoiceId: null,  // id of the option we ACTUALLY recommended (e.g. "option_a")

  quote: null,             // later: gold/silver/bronze detail
  presentation: null,
  customerSummary: '',

  // Manual spec – what manuals this job will require
  manualSpec: {
    items: [
      // Example item shape (see buildManualSpecFromRecommendation)
      // {
      //   id: 'wb_4000_25kw_install',
      //   kind: 'boiler-install',
      //   brand: 'Worcester Bosch',
      //   model: 'Greenstar 4000 25kW',
      //   fuel: 'natural-gas',
      //   systemType: 'combi',
      //   language: 'en-GB',
      //   lookupKey: 'worcester_4000_25kw_install',
      //   notes: 'Engineer install manual'
      // }
    ]
  },
};

export function updateSessionMetadata(partial) {
  sessionState.metadata = { ...sessionState.metadata, ...partial };
}

export function updateFormField(field, value) {
  sessionState.form[field] = value;
}

export function updateTranscript(rawText, processedText = null) {
  sessionState.transcript.raw = rawText;
  if (processedText !== null) {
    sessionState.transcript.processed = processedText;
  }
}

export function updateSections(partialSections) {
  sessionState.sections = { ...sessionState.sections, ...partialSections };
}

export function setRecommendation(recJson) {
  sessionState.recommendation = recJson;
}

export function setEngineerChoiceId(optionId) {
  sessionState.engineerChoiceId = optionId;
}

export function setManualSpecItems(items) {
  sessionState.manualSpec.items = items || [];
}

export function updateDiary(partial) {
  sessionState.diary = { ...sessionState.diary, ...partial };
}

export function updateHeatLoss(partial) {
  sessionState.heatLoss = { ...sessionState.heatLoss, ...partial };
}

export function updateSafety(partial) {
  sessionState.safety = { ...sessionState.safety, ...partial };
}

export function resetSessionState() {
  sessionState.metadata = {
    sessionId: '',
    createdAt: new Date().toISOString(),
    leadNumber: '',
    customerName: '',
    customerAddress: '',
  };
  sessionState.diary = {
    leadNumber: '',
    appointmentDate: '',
    appointmentTime: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerPostcode: '',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    occupants: '',
    systemType: '',
    cylinderType: '',
    coils: '',
    secondHeatSource: '',
    notes: '',
  };
  sessionState.transcript = {
    raw: '',
    processed: '',
  };
  sessionState.form = {
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    occupancy: '',
    currentSystemType: '',
    cylinderType: '',
    waterPressure: '',
    microbore: '',
    pumpLocation: '',
    flueType: '',
    hazards: [],
    parking: '',
    loftAccess: '',
  };
  sessionState.heatLoss = {
    calculated: null,
    fabric: null,
    ventilation: null,
    wallU: null,
    glazingU: null,
    roofU: null,
    floorU: null,
    dimensions: { width: null, length: null, ceilingHeight: null },
    areas: { wall: null, window: null, roof: null, floor: null },
    buildingAge: '',
    flowTemp: ''
  };
  sessionState.safety = {
    safetyIssues: [],
    ladderWork: [],
    accessEquipment: [],
    roofConcerns: [],
    earthingSystem: '',
    earthImpedance: '',
    electrics: [],
    gasMeterLocation: '',
    gasPipeSize: '',
    gasLeakSigns: [],
    accessHazards: [],
    safetyNotes: ''
  };
  sessionState.epc = {
    file: null,
    rating: '',
    recommendations: [],
    heatLoss: null,
    currentSystem: ''
  };
  sessionState.sections = {
    Needs: '',
    WorkingAtHeights: '',
    SystemCharacteristics: '',
    ComponentsThatRequireAssistance: '',
    RestrictionsToWork: '',
    ExternalHazards: '',
    DeliveryNotes: '',
    OfficeNotes: '',
    NewBoilerAndControls: '',
    Flue: '',
    Pipework: '',
    Disruption: '',
    CustomerActions: '',
    FuturePlans: '',
  };
  sessionState.recommendation = null;
  sessionState.engineerChoiceId = null;
  sessionState.quote = null;
  sessionState.presentation = null;
  sessionState.customerSummary = '';
  sessionState.manualSpec = { items: [] };
}
