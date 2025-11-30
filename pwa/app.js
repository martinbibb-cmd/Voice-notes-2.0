(function () {
  const timeSlots = ["09:00", "11:00", "13:00", "15:00", "17:00"];

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
      chunks: []
    },
    aiMessages: []
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
    AppState.currentAppointmentId = null;
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

    if (AppState.currentAppointmentId) {
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
      const id = `appt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      AppState.appointments.push({
        id,
        ...apptData
      });
      AppState.currentAppointmentId = id;
    }

    renderTimeSlots();
    closeAppointmentModal();

    if (startSurveyAfter) {
      const appt = AppState.appointments.find(
        (a) => a.id === AppState.currentAppointmentId
      );
      startSurveyForAppointment(appt);
    }
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
      document.createTextNode(" Enable real-time AI transcript cleanup")
    );

    const reprocessBtn = document.createElement("button");
    reprocessBtn.textContent = "Reprocess transcript";
    reprocessBtn.addEventListener("click", () => {
      reprocessTranscript();
    });

    controlsDiv.appendChild(realtimeLabel);
    controlsDiv.appendChild(reprocessBtn);

    transcriptPanel.appendChild(controlsDiv);
    wrapper.appendChild(transcriptPanel);

    container.appendChild(wrapper);

    // Start timer UI if active
    updateRecordingStatus();
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
          // TODO: send blob to your existing ASR endpoint, update AppState.transcript
          console.log("Audio blob ready. Size:", blob.size);
          fakeTranscriptionFromBlob(blob);
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

  function fakeTranscriptionFromBlob(blob) {
    // Stub to show something happens. Replace with real ASR call.
    AppState.transcript =
      AppState.transcript +
      (AppState.transcript ? "\n" : "") +
      "[Transcript stub] Audio captured, length " +
      Math.round(blob.size / 1024) +
      " KB.";
    const box = $("transcript-box");
    if (box) {
      box.textContent = AppState.transcript;
    }
  }

  function reprocessTranscript() {
    // TODO: send AppState.transcript to AI endpoint for cleanup only.
    alert("Reprocess transcript stub – wire this to your AI cleanup endpoint.");
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
    // Minimal context; extend this with whatever JSON you want.
    return {
      currentView: AppState.currentView,
      surveyStep: AppState.surveyStep,
      currentSessionId: AppState.currentSessionId,
      transcript: AppState.transcript
      // TODO: include structured survey JSON once sections are added
    };
  }

  function sendAIRequest(text) {
    // Stub: call your existing AI API endpoint
    const context = buildAIContext();
    pushAIMessage("assistant", "Thinking…");

    // Replace URL with your actual endpoint in voice-notes-2.0
    fetch("/api/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        context,
        mode: "explain_only" // hint to backend not to change data
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Agent error");
        return res.json();
      })
      .then((data) => {
        // Expect { reply: "text..." }
        AppState.aiMessages.pop(); // remove "Thinking…"
        pushAIMessage("assistant", data.reply || "(No reply text)");
      })
      .catch((err) => {
        console.error(err);
        AppState.aiMessages.pop(); // remove "Thinking…"
        pushAIMessage(
          "assistant",
          "Sorry, I couldn't reach the agent. Check the /api/agent endpoint wiring."
        );
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
