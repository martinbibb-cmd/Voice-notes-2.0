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

export function resetSessionState() {
  sessionState.metadata = {
    sessionId: '',
    createdAt: new Date().toISOString(),
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
