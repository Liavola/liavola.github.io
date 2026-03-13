import { AudioFeedback } from "./audio.js";

export class CounterApp {
  constructor() {
    this.counters = [];
    this.nextId = 1;
    this.selectedBackground = "";
    this.customImages = [];
    this.selectedBackgroundType = "default";
    this.selectedBackgroundId = null;
    this.dailyTarget = 10;
    this.weeklyProgress = {};
    this.currentWeekOffset = 0;
    this.personalBest = 0;
    this.personalBestDate = null;
    this.lastPersonalBestCelebration = null;
    this.celebrationTimeout = null;
    this.personalBestTimeout = null;
    this.lastCelebrationDate = null;

    // New state
    this.selectedCounterId = null;
    this.progressView = "week";
    this.currentMonthOffset = 0;

    this.celebrationGifs = [
      "https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif",
      "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
      "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
      "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
      "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif",
      "https://media1.tenor.com/m/EmZ0N3llkAkAAAAC/cat-cats.gif",
      "https://media1.tenor.com/m/_4nl1Qq1RKcAAAAd/partying-cat-party.gif",
      "https://media.tenor.com/UI64UNgFasgAAAAj/elgatitolover-elgatitoloves.gif",
    ];

    this.audioFeedback = new AudioFeedback();
    this.init();
  }

  // ─── Initialization ───────────────────────────────────────────────────────

  init() {
    this.bindEvents();
    this.loadCounters();
    this.loadSettings();
    this.loadProgress();
    this.initializeWeeklyView();
    this.setupFontDropdown();
    if (this.counters.length === 0) this.addCounter();
    // Auto-select first counter for keyboard use
    if (this.counters.length > 0) this.selectCounter(this.counters[0].id);
  }

  setupFontDropdown() {
    const fontSelect = document.getElementById("fontSelect");
    fontSelect.querySelectorAll("option").forEach((option) => {
      option.style.fontFamily = option.value;
    });
    fontSelect.style.fontFamily = fontSelect.value;
  }

  bindEvents() {
    const bind = (id, event, handler) =>
      document.getElementById(id).addEventListener(event, handler);

    bind("addCounterBtn", "click", () => this.addCounter());
    bind("resetCountersBtn", "click", () => this.resetAllCounters());
    bind("bgColorInput", "input", this.updateBackgroundColor.bind(this));
    bind("fontSelect", "change", this.updateFontFamily.bind(this));
    bind("resetStylesBtn", "click", this.resetStyles.bind(this));
    bind("toggleSettingsBtn", "click", () => this.toggleSettings());
    bind("closeSettingsBtn", "click", () => this.closeSettings());
    bind("textColorInput", "input", this.updateTextColor.bind(this));
    bind("customImageInput", "change", this.handleCustomImageUpload.bind(this));
    bind("dailyTargetInput", "input", this.updateDailyTarget.bind(this));
    bind("toggleProgressBtn", "click", () => this.toggleProgress());
    bind("toggleProgressBtnHeader", "click", () => this.toggleProgress());
    bind("closeProgressBtn", "click", () => this.closeProgress());
    bind("closeCelebrationBtn", "click", () => this.closeCelebration());
    bind("prevWeekBtn", "click", () => this.navigateWeek(-1));
    bind("nextWeekBtn", "click", () => this.navigateWeek(1));
    bind("goToCurrentWeekBtn", "click", () => this.goToCurrentWeek());
    bind("closePersonalBestBtn", "click", () =>
      this.closePersonalBestCelebration(),
    );
    bind("prevMonthBtn", "click", () => this.navigateMonth(-1));
    bind("nextMonthBtn", "click", () => this.navigateMonth(1));

    const audioToggleBtn = document.getElementById("toggleAudioBtn");
    if (audioToggleBtn) {
      audioToggleBtn.addEventListener("click", (e) => this.toggleAudio(e));
    }

    const volumeControl = document.getElementById("volumeControl");
    if (volumeControl) {
      volumeControl.addEventListener("input", (e) => this.updateVolume(e));
    }

    document.querySelectorAll(".image-option").forEach((option) => {
      if (!option.classList.contains("custom-upload")) {
        option.addEventListener("click", () =>
          this.selectBackgroundImage(option),
        );
      }
    });

    document.querySelector(".custom-upload").addEventListener("click", () => {
      document.getElementById("customImageInput").click();
    });

    // Progress view tabs
    document.querySelectorAll(".progress-tab").forEach((tab) => {
      tab.addEventListener("click", () =>
        this.switchProgressView(tab.dataset.view),
      );
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));
  }

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────────

  handleKeyboard(e) {
    // Don't intercept when user is typing
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    if (this.selectedCounterId === null) return;

    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      this.incrementCounter(this.selectedCounterId);
    } else if (e.key === "-") {
      e.preventDefault();
      this.decrementCounter(this.selectedCounterId);
    } else if (e.key === "Escape") {
      this.selectCounter(null);
    } else if (e.key === "Tab") {
      // Cycle through counters
      e.preventDefault();
      const currentIndex = this.counters.findIndex(
        (c) => c.id === this.selectedCounterId,
      );
      const nextIndex = e.shiftKey
        ? (currentIndex - 1 + this.counters.length) % this.counters.length
        : (currentIndex + 1) % this.counters.length;
      this.selectCounter(this.counters[nextIndex].id);
    }
  }

  selectCounter(id) {
    document
      .querySelectorAll(".counter")
      .forEach((el) => el.classList.remove("counter-selected"));
    this.selectedCounterId = id;
    if (id !== null) {
      document
        .querySelector(`.counter[data-id="${id}"]`)
        ?.classList.add("counter-selected");
    }
  }

  // ─── Settings Panel ───────────────────────────────────────────────────────

  toggleSettings() {
    document.getElementById("settingsPanel").classList.toggle("open");
  }

  closeSettings() {
    document.getElementById("settingsPanel").classList.remove("open");
  }

  toggleAudio(e) {
    const isEnabled = this.audioFeedback.toggle();
    e.target.textContent = isEnabled ? "🔊 Audio On" : "🔇 Audio Off";
    e.target.style.background = isEnabled ? "#42479e" : "#7f8c8d";
    this.saveSettings();
  }

  updateVolume(e) {
    this.audioFeedback.setVolume(e.target.value / 100);
    this.saveSettings();
  }

  // ─── Counter Operations ───────────────────────────────────────────────────

  addCounter() {
    const counter = {
      id: this.nextId++,
      count: 0,
      name: `Counter ${this.counters.length + 1}`,
    };
    this.counters.push(counter);
    this.renderCounter(counter);
    this.updateTotal();
    this.saveCounters();
    this.audioFeedback.playAdd();
    this.selectCounter(counter.id);
  }

  deleteCounter(id) {
    if (this.counters.length <= 1) {
      alert("You must have at least one counter!");
      return;
    }
    if (confirm("Are you sure you want to delete this counter?")) {
      const deletedIndex = this.counters.findIndex((c) => c.id === id);
      this.counters = this.counters.filter((c) => c.id !== id);
      document.querySelector(`[data-id="${id}"]`).remove();
      this.updateTotal();
      this.updateDailyProgress();
      this.saveCounters();
      // Select adjacent counter if the deleted one was selected
      if (this.selectedCounterId === id) {
        const newIndex = Math.min(deletedIndex, this.counters.length - 1);
        this.selectCounter(this.counters[newIndex]?.id ?? null);
      }
    }
  }

  incrementCounter(id) {
    const counter = this.counters.find((c) => c.id === id);
    if (counter) {
      counter.count++;
      this.updateCounterDisplay(id, counter.count);
      this.animateCounter(id);
      this.updateTotal();
      this.updateDailyProgress();
      this.saveCounters();
      this.audioFeedback.playIncrement();
    }
  }

  decrementCounter(id) {
    const counter = this.counters.find((c) => c.id === id);
    if (counter && counter.count > 0) {
      counter.count--;
      this.updateCounterDisplay(id, counter.count);
      this.animateCounter(id);
      this.updateTotal();
      this.updateDailyProgress();
      this.saveCounters();
      this.audioFeedback.playDecrement();
    }
  }

  resetCounter(id) {
    if (confirm("Reset this counter to 0?")) {
      const counter = this.counters.find((c) => c.id === id);
      if (counter) {
        counter.count = 0;
        this.updateCounterDisplay(id, 0);

        const today = this.getCurrentDayKey();
        const totalToday = this.counters.reduce((sum, c) => sum + c.count, 0);
        if (
          totalToday < this.dailyTarget &&
          this.lastCelebrationDate === today
        ) {
          this.lastCelebrationDate = null;
        }

        this.updateTotal();
        this.updateDailyProgress();
        this.saveCounters();
        this.saveProgress();
        this.audioFeedback.playReset();
      }
    }
  }

  resetAllCounters() {
    if (
      confirm(
        "Are you sure you want to reset all counters to 0? This cannot be undone.",
      )
    ) {
      this.counters.forEach((counter) => {
        counter.count = 0;
        this.updateCounterDisplay(counter.id, 0);
      });

      const today = this.getCurrentDayKey();
      if (this.lastCelebrationDate === today) {
        this.lastCelebrationDate = null;
      }

      this.updateTotal();
      this.updateDailyProgress();
      this.saveCounters();
      this.saveProgress();
      this.audioFeedback.playReset();
    }
  }

  renderCounter(counter) {
    const container = document.getElementById("countersContainer");
    const div = document.createElement("div");
    div.className = "counter";
    div.dataset.id = counter.id;

    div.innerHTML = `
      <div class="counter-header">
        <div class="counter-title" onclick="app.editCounterName(${counter.id})">${counter.name}</div>
        <div class="counter-actions">
          <button class="reset-counter" onclick="app.resetCounter(${counter.id})" title="Reset counter">↻</button>
          <button class="delete-counter" onclick="app.deleteCounter(${counter.id})" title="Delete counter">×</button>
        </div>
      </div>
      <div class="counter-controls">
        <button class="counter-btn minus" onclick="app.decrementCounter(${counter.id})">−</button>
        <div class="count-display" onclick="app.editCountValue(${counter.id})" title="Click to edit count">${counter.count}</div>
        <button class="counter-btn plus" onclick="app.incrementCounter(${counter.id})">+</button>
      </div>
      <div class="counter-keyboard-hint">⌨ Active</div>
    `;

    // Click on card body (not buttons) to select for keyboard
    div.addEventListener("click", (e) => {
      if (
        !e.target.closest("button") &&
        !e.target.classList.contains("count-input")
      ) {
        this.selectCounter(counter.id);
      }
    });

    container.appendChild(div);
  }

  editCounterName(id) {
    const counter = this.counters.find((c) => c.id === id);
    const titleElement = document.querySelector(
      `[data-id="${id}"] .counter-title`,
    );
    if (!counter || !titleElement) return;

    const input = document.createElement("input");
    input.className = "counter-title-input";
    input.value = counter.name;
    input.maxLength = 20;

    titleElement.replaceWith(input);
    input.focus();
    input.select();

    const save = () => {
      const newName = input.value.trim() || counter.name;
      counter.name = newName;

      const newTitle = document.createElement("div");
      newTitle.className = "counter-title";
      newTitle.onclick = () => this.editCounterName(id);
      newTitle.textContent = newName;

      input.replaceWith(newTitle);
      this.saveCounters();
    };

    input.addEventListener("blur", save);
    input.addEventListener("keypress", (e) => e.key === "Enter" && save());
  }

  editCountValue(id) {
    const counter = this.counters.find((c) => c.id === id);
    const displayElement = document.querySelector(
      `[data-id="${id}"] .count-display`,
    );
    if (!counter || !displayElement) return;

    const input = document.createElement("input");
    input.type = "number";
    input.className = "count-input";
    input.value = counter.count;
    input.min = "0";

    displayElement.replaceWith(input);
    input.focus();
    input.select();

    const save = () => {
      const newCount = parseInt(input.value);

      if (isNaN(newCount) || newCount < 0) {
        alert("Please enter a valid positive number");
        input.focus();
        return;
      }

      const oldCount = counter.count;
      counter.count = newCount;

      const newDisplay = document.createElement("div");
      newDisplay.className = "count-display";
      newDisplay.onclick = () => this.editCountValue(id);
      newDisplay.title = "Click to edit count";
      newDisplay.textContent = newCount;

      input.replaceWith(newDisplay);
      this.animateCounter(id);
      this.updateTotal();
      this.updateDailyProgress();
      this.saveCounters();

      if (newCount > oldCount) {
        this.audioFeedback.playIncrement();
      } else if (newCount < oldCount) {
        this.audioFeedback.playDecrement();
      }
    };

    input.addEventListener("blur", save);
    input.addEventListener("keypress", (e) => e.key === "Enter" && save());
  }

  updateCounterDisplay(id, count) {
    const el = document.querySelector(`[data-id="${id}"] .count-display`);
    if (el) el.textContent = count;
  }

  animateCounter(id) {
    const el = document.querySelector(`[data-id="${id}"] .count-display`);
    if (el) {
      el.classList.add("animate");
      setTimeout(() => el.classList.remove("animate"), 200);
    }
  }

  updateTotal() {
    const total = this.counters.reduce((sum, c) => sum + c.count, 0);
    document.getElementById("totalCount").textContent = total;
  }

  // ─── Data Model Helpers (backward-compatible with old number format) ───────

  getDayTotal(dateKey) {
    const val = this.weeklyProgress[dateKey];
    if (!val) return 0;
    if (typeof val === "number") return val;
    return val.total || 0;
  }

  getDayCounters(dateKey) {
    const val = this.weeklyProgress[dateKey];
    if (!val || typeof val === "number") return {};
    return val.counters || {};
  }

  getDayNote(dateKey) {
    const val = this.weeklyProgress[dateKey];
    if (!val || typeof val === "number") return "";
    return val.note || "";
  }

  setDayNote(dateKey, text) {
    const current = this.weeklyProgress[dateKey];
    if (!current) {
      this.weeklyProgress[dateKey] = { total: 0, counters: {}, note: text };
    } else if (typeof current === "number") {
      this.weeklyProgress[dateKey] = {
        total: current,
        counters: {},
        note: text,
      };
    } else {
      this.weeklyProgress[dateKey].note = text;
    }
    this.saveProgress();
  }

  // ─── Progress Tracking ────────────────────────────────────────────────────

  getCurrentDayKey() {
    return this.formatDate(new Date());
  }

  formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  formatDateDisplay(date) {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  isToday(date) {
    return date.toDateString() === new Date().toDateString();
  }

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  updateDailyProgress() {
    const today = this.getCurrentDayKey();
    const totalToday = this.counters.reduce((sum, c) => sum + c.count, 0);
    const oldTotal = this.getDayTotal(today);

    // Build per-counter snapshot
    const counterSnapshot = {};
    this.counters.forEach((c) => {
      counterSnapshot[c.name] = c.count;
    });

    // Preserve any existing note
    const existingNote = this.getDayNote(today);

    this.weeklyProgress[today] = {
      total: totalToday,
      counters: counterSnapshot,
      note: existingNote,
    };

    if (
      oldTotal < this.dailyTarget &&
      totalToday >= this.dailyTarget &&
      this.lastCelebrationDate !== today
    ) {
      this.showCelebration();
      this.lastCelebrationDate = today;
    }

    this.updatePersonalBest();
    this.updateWeeklyView();
    this.saveProgress();
  }

  updatePersonalBest() {
    const today = this.getCurrentDayKey();
    const keys = Object.keys(this.weeklyProgress);
    const maxCount =
      keys.length > 0 ? Math.max(...keys.map((k) => this.getDayTotal(k))) : 0;
    const maxDate = keys.find((k) => this.getDayTotal(k) === maxCount) || today;

    const oldBest = this.personalBest;

    if (maxCount !== this.personalBest) {
      this.personalBest = maxCount;
      this.personalBestDate = maxDate;

      document.getElementById("personalBestCount").textContent =
        this.personalBest;
      document.getElementById("personalBestDate").textContent =
        maxCount > 0
          ? this.formatDateDisplay(new Date(maxDate))
          : "No record yet";
    }

    const anyDayCompleted = keys.some(
      (k) => this.getDayTotal(k) >= this.dailyTarget,
    );
    if (maxCount > oldBest && anyDayCompleted) {
      if (this.lastPersonalBestCelebration !== today) {
        this.lastPersonalBestCelebration = today;
        this.showPersonalBestCelebration(maxCount);
        this.audioFeedback.playCelebration();
        this.saveProgress();
      }
    }
  }

  updateDailyTarget() {
    this.dailyTarget =
      parseInt(document.getElementById("dailyTargetInput").value) || 10;
    this.updateWeeklyView();
    this.saveProgress();
  }

  navigateWeek(direction) {
    this.currentWeekOffset += direction;
    this.initializeWeeklyView();
    document.getElementById("nextWeekBtn").disabled =
      this.currentWeekOffset >= 0;
  }

  goToCurrentWeek() {
    this.currentWeekOffset = 0;
    this.initializeWeeklyView();
    document.getElementById("nextWeekBtn").disabled = true;
  }

  toggleProgress() {
    const panel = document.getElementById("progressPanel");
    panel.classList.toggle("open");

    if (panel.classList.contains("open")) {
      this.switchProgressView("week");
      this.currentWeekOffset = 0;
      this.initializeWeeklyView();
      document.getElementById("nextWeekBtn").disabled = true;
      this.updateWeeklyView();
    }
  }

  closeProgress() {
    document.getElementById("progressPanel").classList.remove("open");
  }

  // ─── Progress View Switcher ────────────────────────────────────────────────

  switchProgressView(view) {
    this.progressView = view;

    document.querySelectorAll(".progress-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.view === view);
    });

    document.getElementById("weekView").style.display =
      view === "week" ? "" : "none";
    document.getElementById("monthView").style.display =
      view === "month" ? "" : "none";
    document.getElementById("averagesView").style.display =
      view === "averages" ? "" : "none";

    if (view === "month") {
      this.currentMonthOffset = 0;
      this.renderMonthView();
    } else if (view === "averages") {
      this.renderAveragesView();
    }
  }

  // ─── Weekly View ──────────────────────────────────────────────────────────

  initializeWeeklyView() {
    const today = new Date();
    const viewDate = new Date(today);
    viewDate.setDate(today.getDate() + this.currentWeekOffset * 7);

    const monday = this.getMonday(viewDate);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const weekNumber = this.getWeekNumber(monday);

    if (this.currentWeekOffset === 0) {
      document.getElementById("weekTitle").textContent = "This Week";
    } else if (this.currentWeekOffset === -1) {
      document.getElementById("weekTitle").textContent = "Last Week";
    } else {
      document.getElementById("weekTitle").textContent =
        `${Math.abs(this.currentWeekOffset)} Weeks Ago`;
    }

    document.getElementById("weekNumber").textContent = `Week ${weekNumber}`;

    const formatShortDate = (date) => {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    };

    document.getElementById("dateRange").textContent =
      monday.getMonth() === friday.getMonth()
        ? `${monday.getDate()} - ${formatShortDate(friday)}`
        : `${formatShortDate(monday)} - ${formatShortDate(friday)}`;

    const goToCurrentBtn = document.getElementById("goToCurrentWeekBtn");
    if (goToCurrentBtn) {
      goToCurrentBtn.style.display =
        this.currentWeekOffset === 0 ? "none" : "block";
    }

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const dayNames = ["mon", "tue", "wed", "thu", "fri"];

    days.forEach((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);

      document.getElementById(`${dayNames[index]}-date`).textContent =
        date.getDate();

      const dayCard = document.querySelector(`[data-day="${day}"]`);
      dayCard.classList.remove("today", "future-day");

      if (this.isToday(date)) dayCard.classList.add("today");
      if (date > today) dayCard.classList.add("future-day");
    });

    this.updateWeeklyView();
  }

  updateWeeklyView() {
    const today = new Date();
    const viewDate = new Date(today);
    viewDate.setDate(today.getDate() + this.currentWeekOffset * 7);

    const monday = this.getMonday(viewDate);
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const dayNames = ["mon", "tue", "wed", "thu", "fri"];

    let weeklyTotal = 0;
    let daysCompleted = 0;
    let daysWithData = 0;

    days.forEach((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dateKey = this.formatDate(date);
      const count = this.getDayTotal(dateKey);
      const isFuture = date > today;

      document.getElementById(`${dayNames[index]}-count`).textContent = count;

      // Per-counter breakdown
      const breakdownEl = document.getElementById(
        `${dayNames[index]}-breakdown`,
      );
      if (breakdownEl) {
        const counterEntries = Object.entries(this.getDayCounters(dateKey));
        if (counterEntries.length > 1) {
          breakdownEl.innerHTML = counterEntries
            .map(
              ([name, cnt]) =>
                `<div class="breakdown-item">${this.truncateName(name, 9)}: ${cnt}</div>`,
            )
            .join("");
        } else {
          breakdownEl.innerHTML = "";
        }
      }

      // Day note area
      const noteArea = document.getElementById(`${dayNames[index]}-note-area`);
      if (noteArea) {
        const note = this.getDayNote(dateKey);
        if (note) {
          noteArea.innerHTML = `<div class="day-note-text" data-datekey="${dateKey}">${note}</div>`;
          noteArea
            .querySelector(".day-note-text")
            .addEventListener("click", () =>
              this.editDayNote(dateKey, noteArea),
            );
        } else if (!isFuture) {
          noteArea.innerHTML = `<button class="day-note-btn" title="Add note">✏</button>`;
          noteArea
            .querySelector(".day-note-btn")
            .addEventListener("click", () =>
              this.editDayNote(dateKey, noteArea),
            );
        } else {
          noteArea.innerHTML = "";
        }
      }

      const dayCard = document.querySelector(`[data-day="${day}"]`);
      if (count >= this.dailyTarget) {
        dayCard.classList.add("target-met");
        daysCompleted++;
      } else {
        dayCard.classList.remove("target-met");
      }

      weeklyTotal += count;
      if (count > 0) daysWithData++;
    });

    const weeklyAvg =
      daysWithData > 0 ? Math.round(weeklyTotal / daysWithData) : 0;

    document.getElementById("weeklyTotal").textContent = weeklyTotal;
    document.getElementById("weeklyTarget").textContent = this.dailyTarget * 5;
    document.getElementById("weeklyAverage").textContent = weeklyAvg;
    document.getElementById("daysCompleted").textContent = `${daysCompleted}/5`;

    const anyDayCompleted = Object.keys(this.weeklyProgress).some(
      (k) => this.getDayTotal(k) >= this.dailyTarget,
    );
    document.getElementById("personalBestSection").style.display =
      anyDayCompleted ? "" : "none";
  }

  truncateName(name, maxLen) {
    return name.length > maxLen ? name.slice(0, maxLen) + "…" : name;
  }

  // ─── Day Notes ────────────────────────────────────────────────────────────

  editDayNote(dateKey, noteArea) {
    const existingNote = this.getDayNote(dateKey);

    const textarea = document.createElement("textarea");
    textarea.className = "day-note-input";
    textarea.value = existingNote;
    textarea.placeholder = "Add a note…";
    textarea.maxLength = 100;

    noteArea.innerHTML = "";
    noteArea.appendChild(textarea);
    textarea.focus();

    const save = () => {
      this.setDayNote(dateKey, textarea.value.trim());
      this.updateWeeklyView();
    };

    textarea.addEventListener("blur", save);
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        save();
      }
      if (e.key === "Escape") save();
    });
  }

  // ─── Month View ───────────────────────────────────────────────────────────

  navigateMonth(direction) {
    this.currentMonthOffset += direction;
    this.renderMonthView();
  }

  renderMonthView() {
    const today = new Date();
    const targetMonth = new Date(
      today.getFullYear(),
      today.getMonth() + this.currentMonthOffset,
      1,
    );
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    document.getElementById("monthTitle").textContent =
      `${monthNames[month]} ${year}`;
    document.getElementById("nextMonthBtn").disabled =
      this.currentMonthOffset >= 0;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startMonday = this.getMonday(firstDay);
    const endMonday = this.getMonday(lastDay);

    let html = '<div class="month-col-headers">';
    ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((d) => {
      html += `<div class="month-col-header">${d}</div>`;
    });
    html += "</div>";

    let weekStart = new Date(startMonday);
    while (weekStart <= endMonday) {
      html += '<div class="month-week-row">';
      for (let i = 0; i < 5; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);

        const inMonth =
          date.getMonth() === month && date.getFullYear() === year;
        const isFuture = date > today;
        const isToday = this.isToday(date);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const count = this.getDayTotal(dateKey);
        const targetMet = count >= this.dailyTarget && count > 0;

        if (!inMonth) {
          html += '<div class="month-day-cell outside-month"></div>';
        } else {
          let classes = "month-day-cell";
          if (isFuture) classes += " future-day";
          else if (isToday) classes += " today";
          if (targetMet && !isFuture) classes += " target-met";

          html += `<div class="${classes}">
            <div class="month-cell-date">${date.getDate()}</div>
            <div class="month-cell-count">${count > 0 ? count : "–"}</div>
          </div>`;
        }
      }
      html += "</div>";
      weekStart.setDate(weekStart.getDate() + 7);
    }

    document.getElementById("monthCalendar").innerHTML = html;
  }

  // ─── Averages View ────────────────────────────────────────────────────────

  renderAveragesView() {
    const container = document.getElementById("averagesSummary");

    const allEntries = Object.keys(this.weeklyProgress)
      .filter((k) => this.getDayTotal(k) > 0)
      .map((k) => ({ date: k, total: this.getDayTotal(k) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (allEntries.length === 0) {
      container.innerHTML =
        '<p class="no-data">No data yet. Start tracking to see averages!</p>';
      return;
    }

    const calcAvg = (entries) =>
      entries.length === 0
        ? 0
        : Math.round(entries.reduce((s, e) => s + e.total, 0) / entries.length);

    const getWeekKey = (dateStr) =>
      this.formatDate(this.getMonday(new Date(dateStr + "T12:00:00")));

    const today = new Date();
    const thisWeekKey = this.formatDate(this.getMonday(today));

    const fourWeeksAgo = new Date(today);
    fourWeeksAgo.setDate(today.getDate() - 28);

    const thisWeekEntries = allEntries.filter(
      (e) => getWeekKey(e.date) === thisWeekKey,
    );
    const last4WeeksEntries = allEntries.filter(
      (e) =>
        new Date(e.date) >= fourWeeksAgo && getWeekKey(e.date) !== thisWeekKey,
    );

    // Group by week
    const byWeek = {};
    allEntries.forEach((e) => {
      const wk = getWeekKey(e.date);
      if (!byWeek[wk]) byWeek[wk] = [];
      byWeek[wk].push(e);
    });

    const sortedWeeks = Object.keys(byWeek)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 16);
    const shortMonth = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const fmt = (d) => `${d.getDate()} ${shortMonth[d.getMonth()]}`;

    let html = "";

    // Summary cards
    html += '<div class="averages-summary-cards">';
    html += this._avgCard(
      "This Week",
      calcAvg(thisWeekEntries),
      thisWeekEntries.length,
    );
    html += this._avgCard(
      "Last 4 Weeks",
      calcAvg(last4WeeksEntries),
      last4WeeksEntries.length,
    );
    html += this._avgCard("All Time", calcAvg(allEntries), allEntries.length);
    html += "</div>";

    // Weekly breakdown list
    html += '<div class="weekly-breakdown-title">Weekly Averages</div>';
    html += '<div class="weekly-breakdown-list">';

    sortedWeeks.forEach((wk) => {
      const entries = byWeek[wk];
      const avg = calcAvg(entries);
      const mon = new Date(wk + "T12:00:00");
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      const isCurrent = wk === thisWeekKey;

      html += `<div class="breakdown-week-row${isCurrent ? " current-week-row" : ""}">
        <div class="breakdown-week-label">${fmt(mon)} – ${fmt(fri)}</div>
        <div class="breakdown-week-avg">
          <span class="avg-number">${avg}</span>
          <span class="avg-days">avg (${entries.length}d)</span>
        </div>
      </div>`;
    });

    html += "</div>";
    container.innerHTML = html;
  }

  _avgCard(label, value, days) {
    return `<div class="avg-card">
      <div class="avg-label">${label}</div>
      <div class="avg-value">${value}</div>
      <div class="avg-sub">${days} day${days !== 1 ? "s" : ""}</div>
    </div>`;
  }

  // ─── Celebrations ─────────────────────────────────────────────────────────

  showCelebration() {
    const modal = document.getElementById("celebrationModal");
    const img = document.getElementById("celebrationImage");

    img.src =
      this.celebrationGifs[
        Math.floor(Math.random() * this.celebrationGifs.length)
      ];
    modal.classList.add("show");
    this.showPyro();
    this.audioFeedback.playCelebration();

    clearTimeout(this.celebrationTimeout);
    this.celebrationTimeout = setTimeout(() => this.closeCelebration(), 10000);
  }

  closeCelebration() {
    document.getElementById("celebrationModal").classList.remove("show");
    setTimeout(() => this.hidePyro(), 500);
    clearTimeout(this.celebrationTimeout);
    this.celebrationTimeout = null;
  }

  showPersonalBestCelebration(newRecord) {
    const modal = document.getElementById("personalBestModal");
    document.getElementById("newRecordText").textContent =
      `New Personal Best: ${newRecord}! 🏆`;

    modal.classList.add("show");
    this.showPyro();
    this.audioFeedback.playCelebration();

    clearTimeout(this.personalBestTimeout);
    this.personalBestTimeout = setTimeout(
      () => this.closePersonalBestCelebration(),
      8000,
    );
  }

  closePersonalBestCelebration() {
    document.getElementById("personalBestModal").classList.remove("show");
    setTimeout(() => this.hidePyro(), 500);
    clearTimeout(this.personalBestTimeout);
    this.personalBestTimeout = null;
  }

  showPyro() {
    const pyro = document.querySelector(".pyro");
    if (pyro) {
      pyro.classList.remove("active");
      void pyro.offsetWidth;
      pyro.classList.add("active");
    }
  }

  hidePyro() {
    document.querySelector(".pyro")?.classList.remove("active");
  }

  // ─── Background & Styling ─────────────────────────────────────────────────

  updateBackgroundColor() {
    const bgColor = document.getElementById("bgColorInput").value;
    document.body.style.backgroundColor = bgColor;
    this.autoAdjustTextColor(bgColor);
    this.saveSettings();
  }

  updateTextColor() {
    document.body.style.color = document.getElementById("textColorInput").value;
    this.saveSettings();
  }

  updateFontFamily() {
    const selectedFont = document.getElementById("fontSelect").value;
    document.body.style.fontFamily = selectedFont;
    document.getElementById("fontSelect").style.fontFamily = selectedFont;
    this.saveSettings();
  }

  resetStyles() {
    Object.assign(document.body.style, {
      backgroundColor: "#f5f5f5",
      backgroundImage: "",
      fontFamily: "",
      color: "#333333",
    });

    document.getElementById("bgColorInput").value = "#f5f5f5";
    document.getElementById("textColorInput").value = "#333333";
    document.getElementById("fontSelect").value = "'Open Sans', sans-serif";
    document.getElementById("fontSelect").style.fontFamily =
      "'Open Sans', sans-serif";

    document
      .querySelectorAll(".image-option, .custom-image-option")
      .forEach((opt) => opt.classList.remove("selected"));
    document
      .querySelector('.image-option[data-image=""]')
      .classList.add("selected");

    this.selectedBackground = "";
    this.selectedBackgroundType = "default";
    this.selectedBackgroundId = null;
    this.customImages = [];
    this.renderCustomImages();
    this.audioFeedback = new AudioFeedback();

    localStorage.removeItem("counterAppSettings");
  }

  calculateLuminance(color) {
    let r, g, b;

    if (color.startsWith("#")) {
      const hex = color.replace("#", "");
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith("rgb")) {
      const rgb = color.match(/\d+/g);
      r = parseInt(rgb[0]);
      g = parseInt(rgb[1]);
      b = parseInt(rgb[2]);
    } else {
      return 0.5;
    }

    const toLinear = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  autoAdjustTextColor(backgroundColor) {
    const textColor =
      this.calculateLuminance(backgroundColor) > 0.5 ? "#333333" : "#ffffff";
    document.body.style.color = textColor;
    document.getElementById("textColorInput").value = textColor;
    return textColor;
  }

  selectBackgroundImage(option) {
    document
      .querySelectorAll(".image-option, .custom-image-option")
      .forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");

    const imageUrl = option.dataset.image;
    this.selectedBackground = imageUrl;
    this.selectedBackgroundType = "default";
    this.selectedBackgroundId = null;

    if (imageUrl) {
      Object.assign(document.body.style, {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      });
      document.body.style.color = "#ffffff";
      document.getElementById("textColorInput").value = "#ffffff";
    } else {
      document.body.style.backgroundImage = "";
      this.autoAdjustTextColor(
        document.body.style.backgroundColor || "#f5f5f5",
      );
    }

    this.saveSettings();
  }

  handleCustomImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Please select an image smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageId = Date.now().toString();
      this.customImages.push({
        id: imageId,
        data: e.target.result,
        name: file.name,
      });
      this.renderCustomImages();
      this.selectBackgroundImageById(imageId);
      this.saveSettings();
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  renderCustomImages() {
    const container = document.getElementById("customImagesContainer");

    if (this.customImages.length === 0) {
      container.innerHTML = "";
      return;
    }

    let html =
      '<div class="custom-images-label">Custom Images:</div><div class="custom-images-grid">';

    this.customImages.forEach((image) => {
      html += `
        <div class="custom-image-option" data-custom-id="${image.id}">
          <img src="${image.data}" alt="${image.name}" title="${image.name}">
          <button class="custom-image-delete" onclick="app.deleteCustomImage('${image.id}')" title="Delete image">×</button>
        </div>
      `;
    });

    html += "</div>";
    container.innerHTML = html;

    document.querySelectorAll(".custom-image-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        if (!e.target.classList.contains("custom-image-delete")) {
          this.selectBackgroundImageById(option.dataset.customId);
        }
      });
    });
  }

  selectBackgroundImageById(imageId) {
    document
      .querySelectorAll(".image-option, .custom-image-option")
      .forEach((opt) => opt.classList.remove("selected"));

    const customImage = this.customImages.find((img) => img.id === imageId);
    if (!customImage) return;

    document
      .querySelector(`[data-custom-id="${imageId}"]`)
      .classList.add("selected");
    this.selectedBackground = customImage.data;
    this.selectedBackgroundType = "custom";
    this.selectedBackgroundId = imageId;

    Object.assign(document.body.style, {
      backgroundImage: `url(${customImage.data})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    });
    document.body.style.color = "#ffffff";
    document.getElementById("textColorInput").value = "#ffffff";

    this.saveSettings();
  }

  deleteCustomImage(imageId) {
    if (confirm("Are you sure you want to delete this custom image?")) {
      this.customImages = this.customImages.filter((img) => img.id !== imageId);

      if (
        this.selectedBackgroundType === "custom" &&
        this.selectedBackgroundId === imageId
      ) {
        this.selectBackgroundImage(document.querySelector('[data-image=""]'));
      }

      this.renderCustomImages();
      this.saveSettings();
    }
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  saveCounters() {
    localStorage.setItem("counterAppData", JSON.stringify(this.counters));
  }

  loadCounters() {
    const saved = localStorage.getItem("counterAppData");
    if (saved) {
      this.counters = JSON.parse(saved);
      this.nextId = Math.max(...this.counters.map((c) => c.id), 0) + 1;
      this.counters.forEach((counter) => this.renderCounter(counter));
      this.updateTotal();
    }
  }

  saveSettings() {
    const settings = {
      backgroundColor: document.body.style.backgroundColor,
      backgroundImage: this.selectedBackground,
      backgroundType: this.selectedBackgroundType || "default",
      backgroundId: this.selectedBackgroundId || null,
      fontFamily: document.body.style.fontFamily,
      textColor: document.body.style.color,
      customImages: this.customImages,
      dailyTarget: this.dailyTarget,
      audioEnabled: this.audioFeedback.isEnabled(),
      audioVolume: this.audioFeedback.volume,
    };
    localStorage.setItem("counterAppSettings", JSON.stringify(settings));
  }

  loadSettings() {
    const saved = localStorage.getItem("counterAppSettings");
    if (!saved) {
      document.querySelector('[data-image=""]')?.classList.add("selected");
      return;
    }

    const settings = JSON.parse(saved);

    if (settings.backgroundColor) {
      document.body.style.backgroundColor = settings.backgroundColor;
      document.getElementById("bgColorInput").value = settings.backgroundColor;
    }

    if (settings.textColor) {
      document.body.style.color = settings.textColor;
      document.getElementById("textColorInput").value = settings.textColor;
    } else if (settings.backgroundColor) {
      this.autoAdjustTextColor(settings.backgroundColor);
    }

    if (settings.customImages) {
      this.customImages = settings.customImages;
      this.renderCustomImages();
    }

    this.selectedBackgroundType = settings.backgroundType || "default";
    this.selectedBackgroundId = settings.backgroundId || null;

    if (settings.backgroundImage !== undefined) {
      this.selectedBackground = settings.backgroundImage;

      if (settings.backgroundImage) {
        Object.assign(document.body.style, {
          backgroundImage: `url(${settings.backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        });

        if (this.selectedBackgroundType === "custom") {
          document
            .querySelector(`[data-custom-id="${this.selectedBackgroundId}"]`)
            ?.classList.add("selected");
        } else {
          document
            .querySelector(`[data-image="${settings.backgroundImage}"]`)
            ?.classList.add("selected");
        }
      } else {
        document.querySelector('[data-image=""]')?.classList.add("selected");
      }
    }

    if (settings.fontFamily) {
      document.body.style.fontFamily = settings.fontFamily;
      document.getElementById("fontSelect").value = settings.fontFamily;
      document.getElementById("fontSelect").style.fontFamily =
        settings.fontFamily;
    }

    if (settings.dailyTarget) {
      this.dailyTarget = settings.dailyTarget;
      document.getElementById("dailyTargetInput").value = settings.dailyTarget;
    }

    if (settings.audioEnabled !== undefined) {
      this.audioFeedback.enabled = settings.audioEnabled;
      const audioBtn = document.getElementById("toggleAudioBtn");
      if (audioBtn) {
        audioBtn.textContent = settings.audioEnabled
          ? "🔊 Audio On"
          : "🔇 Audio Off";
        audioBtn.style.background = settings.audioEnabled
          ? "#42479e"
          : "#7f8c8d";
      }
    }

    if (settings.audioVolume !== undefined) {
      this.audioFeedback.setVolume(settings.audioVolume);
      const volumeControl = document.getElementById("volumeControl");
      if (volumeControl) volumeControl.value = settings.audioVolume * 100;
    }
  }

  saveProgress() {
    localStorage.setItem(
      "counterAppProgress",
      JSON.stringify({
        weeklyProgress: this.weeklyProgress,
        lastCelebrationDate: this.lastCelebrationDate,
        dailyTarget: this.dailyTarget,
        personalBest: this.personalBest,
        personalBestDate: this.personalBestDate,
        lastPersonalBestCelebration: this.lastPersonalBestCelebration,
      }),
    );
  }

  loadProgress() {
    const saved = localStorage.getItem("counterAppProgress");
    if (!saved) return;

    const data = JSON.parse(saved);
    this.weeklyProgress = data.weeklyProgress || {};
    this.lastCelebrationDate = data.lastCelebrationDate || null;
    this.dailyTarget = data.dailyTarget || 10;
    this.personalBest = data.personalBest || 0;
    this.personalBestDate = data.personalBestDate || null;
    this.lastPersonalBestCelebration = data.lastPersonalBestCelebration || null;

    document.getElementById("dailyTargetInput").value = this.dailyTarget;

    if (this.personalBest > 0) {
      document.getElementById("personalBestCount").textContent =
        this.personalBest;
      if (this.personalBestDate) {
        document.getElementById("personalBestDate").textContent =
          this.formatDateDisplay(new Date(this.personalBestDate));
      }
    }

    const anyDayCompleted = Object.keys(this.weeklyProgress).some(
      (k) => this.getDayTotal(k) >= this.dailyTarget,
    );
    document.getElementById("personalBestSection").style.display =
      anyDayCompleted ? "" : "none";
  }
}
