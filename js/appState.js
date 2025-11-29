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
  recommendation: null,
  quote: null,
  presentation: null,
  customerSummary: '',
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
  sessionState.quote = null;
  sessionState.presentation = null;
  sessionState.customerSummary = '';
}
