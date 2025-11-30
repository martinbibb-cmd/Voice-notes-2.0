(function () {
  const timeSlots = ["09:00", "11:00", "13:00", "15:00", "17:00"];

  // ---- API config: voice-notes-2 worker ----
  // Base URL for your Cloudflare Worker
  const API_BASE = "https://voice-notes-2.martinbibb.workers.dev";

  // NOTE: if your worker uses different paths, change these three:
  const AGENT_ENDPOINT = API_BASE + "/agent";                // Q&A / helper
  const ASR_ENDPOINT = API_BASE + "/transcribe";             // audio → text
  const CLEANUP_ENDPOINT = API_BASE + "/cleanup-transcript"; // transcript cleanup only
  // ------------------------------------------

  const AppState = {
    currentView: "diary", // diary | survey | settings
    currentDay: new Date(),
    diaryMode: "day",
    appointments: [], // { id, dateKey, time, customerName, postcode, systemType, leadId, hasRecording, hasPhotos, surveyComplete, address, phone, notes }
    currentSessionId: null,
    currentAppointmentId: null,
    surveyStep: 1,
    maxStep: 8,
    transcript: "",
    recording: {
      isActive: false,
      startTime: null,
      timerId: null,
      mediaRecorder: null,
      chunks: [],
      lastBlob: null
    },
    aiMessages: [],
    photos: [],               // <- saved photos for step 2
    pendingPhoto: null,       // <- photo being captured but not saved yet
    selectedPhotoId: null     // <- which photo is selected in step 2
  };

  function $(id) {
    return document.getElementById(id);
  }

  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDayLabel(date) {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  }

  function init() {
    wireTopBar();
    wireDiary();
    wireSurvey();
    wireAppointmentsModal();
    wireAIPanel();
    loadInitialView();
    registerServiceWorker();
  }

  function wireTopBar() {
    $("app-home-btn").addEventListener("click", () => {
      switchView("diary");
    });

    $("save-btn").addEventListener("click", () => {
      // TODO: hook to your backend save
      console.log("Save clicked: appointments+survey JSON", AppState);
      alert("Save stub – wire this to your backend later.");
    });

    $("settings-btn").addEventListener("click", () => {
      switchView("settings");
    });

    $("session-select").addEventListener("change", (e) => {
      const value = e.target.value;
      if (value === "new") {
        createNewSession();
      } else if (value === "from-diary") {
        // TODO: implement "choose appointment" to load session
        alert("Load from diary – to be implemented.");
      } else if (value === "by-customer") {
        // TODO: implement customer search
        alert("Load by customer – to be implemented.");
      }
      e.target.value = "new";
    });

    $("ai-toggle-btn").addEventListener("click", () => {
      toggleAIPanel(true);
    });
  }

  function loadInitialView() {
    renderDiary();
    renderSurveyStepBar();
    renderSurveyContent();
    updateSurveyFooter();
    updateViewVisibility();
  }

  function switchView(view) {
    AppState.currentView = view;
    updateViewVisibility();
  }

  function updateViewVisibility() {
    const views = [
      ["diary", "view-diary"],
      ["survey", "view-survey"],
      ["settings", "view-settings"]
    ];
    views.forEach(([name, id]) => {
      const el = $(id);
      if (AppState.currentView === name) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    });
  }

  // ------------- Diary -------------

  function wireDiary() {
    $("prev-day-btn").addEventListener("click", () => {
      AppState.currentDay.setDate(AppState.currentDay.getDate() - 1);
      renderDiary();
    });
    $("next-day-btn").addEventListener("click", () => {
      AppState.currentDay.setDate(AppState.currentDay.getDate() + 1);
      renderDiary();
    });

    document.querySelectorAll(".view-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".view-toggle-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        AppState.diaryMode = btn.dataset.mode;
        renderDiary();
      });
    });

    // Seed an empty appointments array; optionally load from storage/DB later
  }

  function renderDiary() {
    const dateLabel = AppState.currentDay.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    $("current-day-label").textContent = dateLabel;

    renderDayList();
    renderTimeSlots();
  }

  function renderDayList() {
    const ul = $("day-list");
    ul.innerHTML = "";
    for (let offset = -1; offset <= 3; offset++) {
      const d = new Date(AppState.currentDay);
      d.setDate(d.getDate() + offset);
      const li = document.createElement("li");
      li.textContent = formatDayLabel(d);
      li.dataset.dateKey = formatDateKey(d);
      if (formatDateKey(d) === formatDateKey(AppState.currentDay)) {
        li.classList.add("active");
      }
      li.addEventListener("click", () => {
        AppState.currentDay = d;
        renderDiary();
      });
      ul.appendChild(li);
    }
  }

  function renderTimeSlots() {
    const container = $("time-slot-list");
    container.innerHTML = "";
    const dayKey = formatDateKey(AppState.currentDay);

    timeSlots.forEach((time) => {
      const card = document.createElement("div");
      card.className = "time-slot-card";
      const appt = AppState.appointments.find(
        (a) => a.dateKey === dayKey && a.time === time
      );

      if (appt) {
        card.classList.add("booked");
      }

      const mainDiv = document.createElement("div");
      mainDiv.className = "slot-main";

      const timeSpan = document.createElement("span");
      timeSpan.className = "slot-time";
      timeSpan.textContent = time;

      const subSpan = document.createElement("span");
      subSpan.className = "slot-sub";
      if (appt) {
        subSpan.textContent = `${appt.customerName || "Unnamed"}, ${
          appt.postcode || "No postcode"
        }`;
      } else {
        subSpan.textContent = "Empty – tap to add appointment";
      }

      mainDiv.appendChild(timeSpan);
      mainDiv.appendChild(subSpan);

      const badgesDiv = document.createElement("div");
      badgesDiv.className = "slot-badges";

      if (appt) {
        if (appt.systemType) {
          const sysBadge = document.createElement("span");
          sysBadge.className = "badge";
          sysBadge.textContent = appt.systemType;
          badgesDiv.appendChild(sysBadge);
        }
        if (appt.hasRecording) {
          const b = document.createElement("span");
          b.className = "badge";
          b.textContent = "🎙";
          badgesDiv.appendChild(b);
        }
        if (appt.hasPhotos) {
          const b = document.createElement("span");
          b.className = "badge";
          b.textContent = "📷";
          badgesDiv.appendChild(b);
        }
        if (appt.surveyComplete) {
          const b = document.createElement("span");
          b.className = "badge";
          b.textContent = "✅";
          badgesDiv.appendChild(b);
        }
      }

      card.appendChild(mainDiv);
      card.appendChild(badgesDiv);

      card.addEventListener("click", () => {
        openAppointmentModal(dayKey, time, appt ? appt.id : null);
      });

      container.appendChild(card);
    });
  }

  // ------------- Appointment modal -------------

  function wireAppointmentsModal() {
    $("appointment-modal-close").addEventListener("click", closeAppointmentModal);
    $("appointment-modal").addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop")) {
        closeAppointmentModal();
      }
    });

    $("appt-save-btn").addEventListener("click", () => {
      saveAppointmentFromModal(false);
    });
    $("appt-start-survey-btn").addEventListener("click", () => {
      saveAppointmentFromModal(true);
    });
  }

  function openAppointmentModal(dateKey, time, appointmentId) {
    AppState.currentAppointmentId = appointmentId || null;
    const modal = $("appointment-modal");
    modal.classList.remove("hidden");

    // Fill fields
    let appt = null;
    if (appointmentId) {
      appt = AppState.appointments.find((a) => a.id === appointmentId) || null;
    }

    $("appointment-modal-title").textContent = `${dateKey} ${time}`;
    $("appt-customer-name").value = appt?.customerName || "";
    $("appt-lead-id").value = appt?.leadId || "";
    $("appt-address").value = appt?.address || "";
    $("appt-postcode").value = appt?.postcode || "";
    $("appt-phone").value = appt?.phone || "";
    $("appt-notes").value = appt?.notes || "";
    $("appt-system-type").value = appt?.systemType || "";
    modal.dataset.dateKey = dateKey;
    modal.dataset.time = time;
  }

  function closeAppointmentModal() {
    const modal = $("appointment-modal");
    modal.classList.add("hidden");
  }

  function saveAppointmentFromModal(startSurveyAfter) {
    const modal = $("appointment-modal");
    const dateKey = modal.dataset.dateKey;
    const time = modal.dataset.time;

    const apptData = {
      dateKey,
      time,
      customerName: $("appt-customer-name").value.trim(),
      leadId: $("appt-lead-id").value.trim(),
      address: $("appt-address").value.trim(),
      postcode: $("appt-postcode").value.trim(),
      phone: $("appt-phone").value.trim(),
      notes: $("appt-notes").value.trim(),
      systemType: $("appt-system-type").value,
      hasRecording: false,
      hasPhotos: false,
      surveyComplete: false
    };

    let targetId = AppState.currentAppointmentId;

    if (targetId) {
      // Update existing appointment
      const idx = AppState.appointments.findIndex(
        (a) => a.id === AppState.currentAppointmentId
      );
      if (idx !== -1) {
        AppState.appointments[idx] = {
          ...AppState.appointments[idx],
          ...apptData
        };
      }
    } else {
      // Create new appointment
      targetId = `appt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      AppState.appointments.push({
        id: targetId,
        ...apptData
      });
    }

    AppState.currentAppointmentId = targetId;
    renderTimeSlots();

    if (startSurveyAfter) {
      const appt = AppState.appointments.find((a) => a.id === targetId);
      startSurveyForAppointment(appt);
    }

    // Only close the modal after we've started the survey (if requested)
    closeAppointmentModal();
  }

  function startSurveyForAppointment(appt) {
    if (!appt) return;
    AppState.currentSessionId = appt.leadId || appt.id;
    switchView("survey");
    AppState.surveyStep = 1;
    renderSurveyStepBar();
    renderSurveyContent();
    updateSurveyFooter();
  }

  function createNewSession() {
    AppState.currentSessionId = `session_${Date.now()}`;
    AppState.surveyStep = 1;
    switchView("survey");
    renderSurveyStepBar();
    renderSurveyContent();
    updateSurveyFooter();
  }

  // ------------- Survey -------------

  function wireSurvey() {
    $("survey-back-btn").addEventListener("click", () => {
      if (AppState.surveyStep > 1) {
        AppState.surveyStep--;
        renderSurveyStepBar();
        renderSurveyContent();
        updateSurveyFooter();
      }
    });

    $("survey-next-btn").addEventListener("click", () => {
      if (AppState.surveyStep < AppState.maxStep) {
        AppState.surveyStep++;
        renderSurveyStepBar();
        renderSurveyContent();
        updateSurveyFooter();
      }
    });
  }

  function renderSurveyStepBar() {
    const bar = $("survey-step-bar");
    bar.innerHTML = "";
    const labels = [
      "Start",
      "Photos",
      "Wants & needs",
      "Current system",
      "Solutions",
      "Safety",
      "Consolidation",
      "Presentation"
    ];

    for (let i = 1; i <= AppState.maxStep; i++) {
      const pill = document.createElement("button");
      pill.className = "step-pill";
      if (i === AppState.surveyStep) pill.classList.add("active");
      pill.textContent = `${i}. ${labels[i - 1]}`;
      pill.dataset.step = i;
      pill.addEventListener("click", () => {
        AppState.surveyStep = i;
        renderSurveyStepBar();
        renderSurveyContent();
        updateSurveyFooter();
      });
      bar.appendChild(pill);
    }
  }

  function renderSurveyContent() {
    const container = $("survey-content");
    container.innerHTML = "";

    switch (AppState.surveyStep) {
      case 1:
        renderStep1(container);
        break;
      case 2:
        renderStep2(container);
        break;
      default:
        renderPlaceholderStep(container, AppState.surveyStep);
        break;
    }
  }

  // Step 1 – recording + transcript
  function renderStep1(container) {
    const wrapper = document.createElement("div");
    wrapper.className = "step-columns";

    const consentPanel = document.createElement("div");
    consentPanel.className = "step-panel";

    const consentTitle = document.createElement("h3");
    consentTitle.textContent = "Consent & recording";
    consentPanel.appendChild(consentTitle);

    const consentText = document.createElement("p");
    consentText.textContent =
      "Script: “Is it okay if I record our conversation to make accurate notes about your heating system? The recording is only used to build your quote and installation notes.”";
    consentPanel.appendChild(consentText);

    const playBtnRow = document.createElement("div");
    playBtnRow.className = "button-row";
    const playBtn = document.createElement("button");
    playBtn.textContent = "Play script (optional)";
    playBtn.addEventListener("click", () => {
      // TODO: hook to TTS if desired
      alert("TTS stub – implement if you want spoken consent.");
    });
    playBtnRow.appendChild(playBtn);
    consentPanel.appendChild(playBtnRow);

    const recordBtnRow = document.createElement("div");
    recordBtnRow.className = "button-row";
    const startBtn = document.createElement("button");
    startBtn.textContent = "Start recording";
    const stopBtn = document.createElement("button");
    stopBtn.textContent = "Stop";

    startBtn.addEventListener("click", () => {
      startRecording();
      updateRecordingStatus();
    });
    stopBtn.addEventListener("click", () => {
      stopRecording();
      updateRecordingStatus();
    });

    recordBtnRow.appendChild(startBtn);
    recordBtnRow.appendChild(stopBtn);
    consentPanel.appendChild(recordBtnRow);

    const statusLine = document.createElement("div");
    statusLine.className = "status-line";
    statusLine.innerHTML = `
      Mic: <span id="mic-status-pill" class="status-pill ${AppState.recording.isActive ? "on" : "off"}">
        ${AppState.recording.isActive ? "On" : "Off"}
      </span>
      &nbsp;&nbsp; Timer: <span id="record-timer">00:00</span>
    `;
    consentPanel.appendChild(statusLine);

    wrapper.appendChild(consentPanel);

    const transcriptPanel = document.createElement("div");
    transcriptPanel.className = "step-panel";

    const transcriptTitle = document.createElement("h3");
    transcriptTitle.textContent = "Live transcript";
    transcriptPanel.appendChild(transcriptTitle);

    const transcriptBox = document.createElement("div");
    transcriptBox.id = "transcript-box";
    transcriptBox.textContent =
      AppState.transcript || "Transcript will appear here while you speak…";
    transcriptPanel.appendChild(transcriptBox);

    const controlsDiv = document.createElement("div");
    controlsDiv.className = "button-row";

    const realtimeLabel = document.createElement("label");
    realtimeLabel.style.fontSize = "0.85rem";
    const realtimeCheckbox = document.createElement("input");
    realtimeCheckbox.type = "checkbox";
    realtimeCheckbox.id = "realtime-cleanup";
    realtimeLabel.appendChild(realtimeCheckbox);
    realtimeLabel.appendChild(
      document.createTextNode(" Enable real-time AI transcript cleanup (online only when used)")
    );

    const transcribeBtn = document.createElement("button");
    transcribeBtn.textContent = "Transcribe audio online";
    transcribeBtn.addEventListener("click", () => {
      if (!AppState.recording.lastBlob) {
        alert("No recording available yet. Start and stop a recording first.");
        return;
      }
      transcribeCurrentRecording();
    });

    const reprocessBtn = document.createElement("button");
    reprocessBtn.textContent = "Reprocess transcript (online)";
    reprocessBtn.addEventListener("click", () => {
      reprocessTranscript();
    });

    controlsDiv.appendChild(realtimeLabel);
    controlsDiv.appendChild(transcribeBtn);
    controlsDiv.appendChild(reprocessBtn);

    transcriptPanel.appendChild(controlsDiv);
    wrapper.appendChild(transcriptPanel);

    container.appendChild(wrapper);

    // Start timer UI if active
    updateRecordingStatus();
  }

  function ensureSelectedPhoto() {
    if (!AppState.photos.length) {
      AppState.selectedPhotoId = null;
      return;
    }
    if (
      !AppState.selectedPhotoId ||
      !AppState.photos.some((p) => p.id === AppState.selectedPhotoId)
    ) {
      AppState.selectedPhotoId = AppState.photos[0].id;
    }
  }

  function openPhotoFilePicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) {
        document.body.removeChild(input);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        // Create pending photo record and start GPS lookup
        AppState.pendingPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          dataUrl,
          type: "",
          notes: "",
          lat: null,
          lng: null,
          createdAt: new Date().toISOString()
        };
        AppState.selectedPhotoId = AppState.pendingPhoto.id;
        capturePhotoLocation();
        renderSurveyContent();
      };
      reader.onerror = () => {
        console.error("FileReader error", reader.error);
        alert("Failed to read the selected image file. Please try again.");
      };
      reader.readAsDataURL(file);
      document.body.removeChild(input);
    });

    input.click();
  }

  function capturePhotoLocation() {
    if (!navigator.geolocation || !AppState.pendingPhoto) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!AppState.pendingPhoto) return;
        AppState.pendingPhoto.lat = pos.coords.latitude;
        AppState.pendingPhoto.lng = pos.coords.longitude;
        renderSurveyContent();
      },
      (err) => {
        console.warn("Geolocation error", err);
        // Leave lat/lng null; user can still save photo without GPS.
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  function savePendingPhoto(typeValue, notesValue) {
    if (!AppState.pendingPhoto) return;
    AppState.pendingPhoto.type = typeValue;
    AppState.pendingPhoto.notes = notesValue || "";

    AppState.photos.push(AppState.pendingPhoto);
    AppState.pendingPhoto = null;
    ensureSelectedPhoto();
    renderSurveyContent();
  }

  function getSelectedPhoto() {
    if (AppState.pendingPhoto && AppState.selectedPhotoId === AppState.pendingPhoto.id) {
      return AppState.pendingPhoto;
    }
    return AppState.photos.find((p) => p.id === AppState.selectedPhotoId) || null;
  }

  function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000; // metres
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function getBoilerPhoto() {
    // First photo tagged as boiler or "boiler-like"
    return (
      AppState.photos.find((p) => (p.type || "").toLowerCase() === "boiler") ||
      null
    );
  }

  function renderStep2(container) {
    ensureSelectedPhoto();

    const wrapper = document.createElement("div");
    wrapper.className = "photos-layout";

    // --- Top row: controls + thumbnails ---

    const topRow = document.createElement("div");
    topRow.className = "photos-top";

    const leftControls = document.createElement("div");
    leftControls.className = "photos-controls";

    const takeBtn = document.createElement("button");
    takeBtn.textContent = "Take photo";
    takeBtn.className = "primary";
    takeBtn.addEventListener("click", openPhotoFilePicker);
    leftControls.appendChild(takeBtn);

    const hint = document.createElement("p");
    hint.className = "photos-hint";
    hint.textContent =
      "Capture each key part (boiler, flue, gas meter, windows, drains). GPS and type are set before saving.";
    leftControls.appendChild(hint);

    topRow.appendChild(leftControls);

    const thumbStrip = document.createElement("div");
    thumbStrip.className = "photos-thumbnails";

    // Pending photo thumbnail (if any)
    if (AppState.pendingPhoto) {
      const ph = AppState.pendingPhoto;
      const thumb = document.createElement("div");
      thumb.className = "photo-thumb pending";
      if (AppState.selectedPhotoId === ph.id) thumb.classList.add("active");
      thumb.innerHTML = `
        <div class="thumb-label">New (unsaved)</div>
        <img src="${ph.dataUrl}" alt="New photo">
      `;
      thumb.addEventListener("click", () => {
        AppState.selectedPhotoId = ph.id;
        renderSurveyContent();
      });
      thumbStrip.appendChild(thumb);
    }

    // Saved photos thumbnails
    AppState.photos.forEach((p) => {
      const thumb = document.createElement("div");
      thumb.className = "photo-thumb";
      if (AppState.selectedPhotoId === p.id) thumb.classList.add("active");
      thumb.innerHTML = `
        <div class="thumb-label">${p.type || "Untyped"}</div>
        <img src="${p.dataUrl}" alt="${p.type || "Photo"}">
      `;
      thumb.addEventListener("click", () => {
        AppState.selectedPhotoId = p.id;
        renderSurveyContent();
      });
      thumbStrip.appendChild(thumb);
    });

    topRow.appendChild(thumbStrip);
    wrapper.appendChild(topRow);

    // --- Middle row: large preview + annotation panel ---

    const midRow = document.createElement("div");
    midRow.className = "photos-middle";

    const previewPanel = document.createElement("div");
    previewPanel.className = "step-panel photos-preview";

    const annotationPanel = document.createElement("div");
    annotationPanel.className = "step-panel photos-annotate";

    const selected = getSelectedPhoto();

    if (!selected) {
      const noPhoto = document.createElement("p");
      noPhoto.textContent =
        "No photos yet. Tap 'Take photo' to capture your first picture.";
      previewPanel.appendChild(noPhoto);
    } else {
      const img = document.createElement("img");
      img.src = selected.dataUrl;
      img.alt = selected.type || "Photo";
      img.className = "photos-preview-img";
      previewPanel.appendChild(img);
    }

    const annTitle = document.createElement("h3");
    annTitle.textContent = "Annotate & save";
    annotationPanel.appendChild(annTitle);

    if (!selected) {
      const msg = document.createElement("p");
      msg.textContent = "Capture a photo to set its type, GPS and notes before saving.";
      annotationPanel.appendChild(msg);
    } else {
      const isPending =
        AppState.pendingPhoto && selected.id === AppState.pendingPhoto.id;

      const typeField = document.createElement("div");
      typeField.className = "field";
      const typeLabel = document.createElement("label");
      typeLabel.textContent = "Photo type";
      typeLabel.htmlFor = "photo-type-select";
      const typeSelect = document.createElement("select");
      typeSelect.id = "photo-type-select";
      [
        "",
        "Boiler",
        "Flue",
        "Window",
        "Gas meter",
        "Drain",
        "Cylinder",
        "Controls",
        "Other"
      ].forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt || "Select…";
        if ((selected.type || "") === opt) {
          o.selected = true;
        }
        typeSelect.appendChild(o);
      });
      typeField.appendChild(typeLabel);
      typeField.appendChild(typeSelect);
      annotationPanel.appendChild(typeField);

      const notesField = document.createElement("div");
      notesField.className = "field";
      const notesLabel = document.createElement("label");
      notesLabel.textContent = "Notes";
      notesLabel.htmlFor = "photo-notes-input";
      const notesInput = document.createElement("textarea");
      notesInput.id = "photo-notes-input";
      notesInput.rows = 3;
      notesInput.value = selected.notes || "";
      notesField.appendChild(notesLabel);
      notesField.appendChild(notesInput);
      annotationPanel.appendChild(notesField);

      const gpsInfo = document.createElement("p");
      gpsInfo.className = "gps-info";
      if (selected.lat != null && selected.lng != null) {
        gpsInfo.textContent = `GPS: ${selected.lat.toFixed(
          5
        )}, ${selected.lng.toFixed(5)}`;
      } else if (isPending) {
        gpsInfo.textContent =
          "Getting GPS position… (you can still save without GPS if needed)";
      } else {
        gpsInfo.textContent = "GPS not available for this photo.";
      }
      annotationPanel.appendChild(gpsInfo);

      const btnRow = document.createElement("div");
      btnRow.className = "button-row";

      if (isPending) {
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save photo";
        saveBtn.className = "primary";
        saveBtn.addEventListener("click", () => {
          const typeValue = typeSelect.value;
          if (!typeValue) {
            alert("Please set a photo type before saving.");
            return;
          }
          savePendingPhoto(typeValue, notesInput.value);
        });
        btnRow.appendChild(saveBtn);
      } else {
        // Future: could add delete / retake here.
        const infoBtn = document.createElement("button");
        infoBtn.textContent = "Photo saved";
        infoBtn.disabled = true;
        btnRow.appendChild(infoBtn);
      }

      annotationPanel.appendChild(btnRow);
    }

    midRow.appendChild(previewPanel);
    midRow.appendChild(annotationPanel);
    wrapper.appendChild(midRow);

    // --- Bottom: GPS & crow-flies distance table ---

    const bottom = document.createElement("div");
    bottom.className = "step-panel photos-table-panel";

    const boilerPhoto = getBoilerPhoto();

    const tableTitle = document.createElement("h3");
    tableTitle.textContent = "Photos & distances (crow-flies)";
    bottom.appendChild(tableTitle);

    const table = document.createElement("table");
    table.className = "photos-table";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>#</th>
        <th>Type</th>
        <th>Lat</th>
        <th>Lng</th>
        <th>Distance from boiler (m)</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    AppState.photos.forEach((p, idx) => {
      const tr = document.createElement("tr");
      const tdIdx = document.createElement("td");
      tdIdx.textContent = String(idx + 1);
      const tdType = document.createElement("td");
      tdType.textContent = p.type || "Untyped";

      const tdLat = document.createElement("td");
      tdLat.textContent =
        p.lat != null ? p.lat.toFixed(5) : "-";

      const tdLng = document.createElement("td");
      tdLng.textContent =
        p.lng != null ? p.lng.toFixed(5) : "-";

      const tdDist = document.createElement("td");
      if (boilerPhoto && p.id === boilerPhoto.id) {
        // This is the boiler photo itself
        tdDist.textContent = "-";
      } else if (
        boilerPhoto &&
        p.lat != null &&
        p.lng != null &&
        boilerPhoto.lat != null &&
        boilerPhoto.lng != null
      ) {
        const d = haversineDistanceMeters(
          boilerPhoto.lat,
          boilerPhoto.lng,
          p.lat,
          p.lng
        );
        tdDist.textContent = d.toFixed(1);
      } else if (!boilerPhoto) {
        tdDist.textContent = "Set a boiler photo first";
      } else {
        tdDist.textContent = "-";
      }

      tr.appendChild(tdIdx);
      tr.appendChild(tdType);
      tr.appendChild(tdLat);
      tr.appendChild(tdLng);
      tr.appendChild(tdDist);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    bottom.appendChild(table);

    wrapper.appendChild(bottom);

    container.appendChild(wrapper);
  }

  function renderPlaceholderStep(container, stepNumber) {
    const panel = document.createElement("div");
    panel.className = "step-panel";
    const title = document.createElement("h3");
    title.textContent = `Step ${stepNumber} placeholder`;
    const p = document.createElement("p");
    p.textContent =
      "This step will contain the structured sections (checklists, dropdowns, etc.). For now it's just a placeholder.";
    panel.appendChild(title);
    panel.appendChild(p);
    container.appendChild(panel);
  }

  function updateSurveyFooter() {
    $("survey-progress").textContent = `Step ${AppState.surveyStep} of ${AppState.maxStep}`;
    $("survey-back-btn").disabled = AppState.surveyStep === 1;
    $("survey-next-btn").disabled = AppState.surveyStep === AppState.maxStep;
  }

  // ------------- Recording & transcript -------------

  function startRecording() {
    if (AppState.recording.isActive) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Recording not supported in this browser.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        AppState.recording.mediaRecorder = mediaRecorder;
        AppState.recording.chunks = [];
        mediaRecorder.ondataavailable = (e) => {
          AppState.recording.chunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(AppState.recording.chunks, { type: "audio/webm" });
          console.log("Audio blob ready. Size:", blob.size);
          AppState.recording.lastBlob = blob;

          // Local-first behaviour:
          // Just update the transcript box with a friendly note.
          applyTranscriptText(
            "[Audio captured locally. Use 'Transcribe audio online' if you want a full transcript.]",
            "append"
          );
        };
        mediaRecorder.start();
        AppState.recording.isActive = true;
        AppState.recording.startTime = Date.now();
        startRecordingTimer();
        updateRecordingStatus();
      })
      .catch((err) => {
        console.error("getUserMedia error", err);
        alert("Unable to access microphone.");
      });
  }

  function stopRecording() {
    if (!AppState.recording.isActive) return;
    AppState.recording.isActive = false;
    if (AppState.recording.mediaRecorder) {
      AppState.recording.mediaRecorder.stop();
    }
    stopRecordingTimer();
    updateRecordingStatus();
  }

  function startRecordingTimer() {
    stopRecordingTimer();
    AppState.recording.timerId = setInterval(() => {
      const timerEl = $("record-timer");
      if (!timerEl || !AppState.recording.startTime) return;
      const secs = Math.floor((Date.now() - AppState.recording.startTime) / 1000);
      const m = String(Math.floor(secs / 60)).padStart(2, "0");
      const s = String(secs % 60).padStart(2, "0");
      timerEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  function stopRecordingTimer() {
    if (AppState.recording.timerId) {
      clearInterval(AppState.recording.timerId);
      AppState.recording.timerId = null;
    }
  }

  function updateRecordingStatus() {
    const pill = $("mic-status-pill");
    const timerEl = $("record-timer");
    if (!pill || !timerEl) return;
    if (AppState.recording.isActive) {
      pill.classList.remove("off");
      pill.classList.add("on");
      pill.textContent = "On";
    } else {
      pill.classList.remove("on");
      pill.classList.add("off");
      pill.textContent = "Off";
    }
  }

  function applyTranscriptText(text, mode) {
    if (!text) return;
    if (mode === "replace") {
      AppState.transcript = text;
    } else {
      AppState.transcript = AppState.transcript
        ? AppState.transcript + "\n" + text
        : text;
    }
    const box = $("transcript-box");
    if (box) {
      box.textContent = AppState.transcript;
    }
  }

  function sendAudioForTranscription(blob) {
    // Sends audio to the worker ASR endpoint.
    // If your worker expects a different payload, adjust this to match.
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("source", "pwa-diary-prototype");

    return fetch(ASR_ENDPOINT, {
      method: "POST",
      body: formData
    })
      .then((res) => {
        if (!res.ok) throw new Error("ASR request failed with " + res.status);
        return res.json();
      })
      .then((data) => {
        // Try multiple common keys so it works with your existing worker:
        const text =
          data.text ||
          data.transcript ||
          data.cleanedText ||
          data.result ||
          "";
        if (!text) {
          throw new Error("ASR response did not contain transcript text");
        }
        return text;
      });
  }

  function transcribeCurrentRecording() {
    const blob = AppState.recording.lastBlob;
    if (!blob) {
      alert("No recording available to transcribe.");
      return;
    }

    // Optional: add a small "working..." note
    applyTranscriptText("[Transcribing audio online…]", "append");

    sendAudioForTranscription(blob)
      .then((text) => {
        applyTranscriptText(text, "append");
      })
      .catch((err) => {
        console.error("ASR error", err);
        applyTranscriptText(
          "[ASR error] Audio captured but could not be transcribed. Check worker logs.",
          "append"
        );
      });
  }

  // Keep this name in case other code still calls it:
  function fakeTranscriptionFromBlob(blob) {
    AppState.recording.lastBlob = blob;
    applyTranscriptText(
      "[Audio captured locally. Use 'Transcribe audio online' if you want a full transcript.]",
      "append"
    );
  }

  function reprocessTranscript() {
    const text = (AppState.transcript || "").trim();
    if (!text) {
      alert("No transcript to clean yet.");
      return;
    }

    fetch(CLEANUP_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        source: "pwa-diary-prototype"
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Cleanup request failed with " + res.status);
        return res.json();
      })
      .then((data) => {
        const cleaned =
          data.text ||
          data.cleaned ||
          data.cleanedText ||
          data.result ||
          "";
        if (!cleaned) {
          throw new Error("Cleanup response did not contain cleaned text");
        }
        applyTranscriptText(cleaned, "replace");
      })
      .catch((err) => {
        console.error("Transcript cleanup error", err);
        alert("Sorry, I couldn't clean up the transcript. Check the worker logs.");
      });
  }

  // ------------- AI panel -------------

  function wireAIPanel() {
    $("ai-close-btn").addEventListener("click", () => toggleAIPanel(false));
    $("ai-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("ai-input");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      pushAIMessage("user", text);
      sendAIRequest(text);
    });
  }

  function toggleAIPanel(show) {
    const panel = $("ai-panel");
    if (show) {
      panel.classList.remove("hidden");
    } else {
      panel.classList.add("hidden");
    }
  }

  function pushAIMessage(role, text) {
    AppState.aiMessages.push({ role, text });
    renderAIMessages();
  }

  function renderAIMessages() {
    const container = $("ai-messages");
    container.innerHTML = "";
    AppState.aiMessages.forEach((msg) => {
      const row = document.createElement("div");
      row.className = `ai-message ${msg.role}`;
      const bubble = document.createElement("div");
      bubble.className = "ai-bubble";
      bubble.textContent = msg.text;
      row.appendChild(bubble);
      container.appendChild(row);
    });
    container.scrollTop = container.scrollHeight;
  }

  function buildAIContext() {
    return {
      currentView: AppState.currentView,
      surveyStep: AppState.surveyStep,
      currentSessionId: AppState.currentSessionId,
      transcript: AppState.transcript,
      currentAppointmentId: AppState.currentAppointmentId,
      photosSummary: AppState.photos.map((p) => ({
        id: p.id,
        type: p.type,
        lat: p.lat,
        lng: p.lng
      }))
    };
  }

  function sendAIRequest(text) {
    const context = buildAIContext();

    // Add a "Thinking…" placeholder while waiting for the worker response
    const thinkingIndex = AppState.aiMessages.push({
      role: "assistant",
      text: "Thinking…"
    }) - 1;
    renderAIMessages();

    fetch(AGENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        context,
        mode: "explain-only" // hint to your worker: natural language only, no state changes
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Agent request failed with " + res.status);
        return res.json();
      })
      .then((data) => {
        const reply =
          data.reply ||
          data.text ||
          data.answer ||
          "(Agent responded, but no reply text field was found.)";

        // Replace the "Thinking…" entry
        AppState.aiMessages[thinkingIndex] = {
          role: "assistant",
          text: reply
        };
        renderAIMessages();
      })
      .catch((err) => {
        console.error("Agent error", err);
        AppState.aiMessages[thinkingIndex] = {
          role: "assistant",
          text:
            "Sorry, I couldn't reach the agent. Check the voice-notes-2 worker /agent endpoint."
        };
        renderAIMessages();
      });
  }

  // ------------- PWA service worker -------------

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("sw.js")
        .then(() => console.log("Service worker registered"))
        .catch((err) => console.warn("Service worker registration failed", err));
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
