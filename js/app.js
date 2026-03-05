import { AudioFeedback } from './audio.js';

export class CounterApp {
  constructor() {
    this.counters = [];
    this.nextId = 1;
    this.selectedBackground = '';
    this.customImages = [];
    this.selectedBackgroundType = 'default';
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

    this.celebrationGifs = [
      'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif',
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
      'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif',
      'https://media1.tenor.com/m/EmZ0N3llkAkAAAAC/cat-cats.gif',
      'https://media1.tenor.com/m/_4nl1Qq1RKcAAAAd/partying-cat-party.gif',
      'https://media.tenor.com/UI64UNgFasgAAAAj/elgatitolover-elgatitoloves.gif',
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
  }

  setupFontDropdown() {
    const fontSelect = document.getElementById('fontSelect');
    fontSelect.querySelectorAll('option').forEach(option => {
      option.style.fontFamily = option.value;
    });
    fontSelect.style.fontFamily = fontSelect.value;
  }

  bindEvents() {
    const bind = (id, event, handler) =>
      document.getElementById(id).addEventListener(event, handler);

    bind('addCounterBtn',      'click', () => this.addCounter());
    bind('resetCountersBtn',   'click', () => this.resetAllCounters());
    bind('bgColorInput',       'input', this.updateBackgroundColor.bind(this));
    bind('fontSelect',         'change', this.updateFontFamily.bind(this));
    bind('resetStylesBtn',     'click', this.resetStyles.bind(this));
    bind('toggleSettingsBtn',  'click', () => this.toggleSettings());
    bind('closeSettingsBtn',   'click', () => this.closeSettings());
    bind('textColorInput',     'input', this.updateTextColor.bind(this));
    bind('customImageInput',   'change', this.handleCustomImageUpload.bind(this));
    bind('dailyTargetInput',   'input', this.updateDailyTarget.bind(this));
    bind('toggleProgressBtn',  'click', () => this.toggleProgress());
    bind('closeProgressBtn',   'click', () => this.closeProgress());
    bind('closeCelebrationBtn','click', () => this.closeCelebration());
    bind('prevWeekBtn',        'click', () => this.navigateWeek(-1));
    bind('nextWeekBtn',        'click', () => this.navigateWeek(1));
    bind('goToCurrentWeekBtn', 'click', () => this.goToCurrentWeek());
    bind('closePersonalBestBtn','click', () => this.closePersonalBestCelebration());

    const audioToggleBtn = document.getElementById('toggleAudioBtn');
    if (audioToggleBtn) {
      audioToggleBtn.addEventListener('click', e => this.toggleAudio(e));
    }

    const volumeControl = document.getElementById('volumeControl');
    if (volumeControl) {
      volumeControl.addEventListener('input', e => this.updateVolume(e));
    }

    document.querySelectorAll('.image-option').forEach(option => {
      if (!option.classList.contains('custom-upload')) {
        option.addEventListener('click', () => this.selectBackgroundImage(option));
      }
    });

    document.querySelector('.custom-upload').addEventListener('click', () => {
      document.getElementById('customImageInput').click();
    });
  }

  // ─── Settings Panel ───────────────────────────────────────────────────────

  toggleSettings() {
    document.getElementById('settingsPanel').classList.toggle('open');
  }

  closeSettings() {
    document.getElementById('settingsPanel').classList.remove('open');
  }

  toggleAudio(e) {
    const isEnabled = this.audioFeedback.toggle();
    e.target.textContent = isEnabled ? '🔊 Audio On' : '🔇 Audio Off';
    e.target.style.background = isEnabled ? '#42479e' : '#7f8c8d';
    this.saveSettings();
  }

  updateVolume(e) {
    this.audioFeedback.setVolume(e.target.value / 100);
    this.saveSettings();
  }

  // ─── Counter Operations ───────────────────────────────────────────────────

  addCounter() {
    const counter = { id: this.nextId++, count: 0, name: `Counter ${this.counters.length + 1}` };
    this.counters.push(counter);
    this.renderCounter(counter);
    this.updateTotal();
    this.saveCounters();
    this.audioFeedback.playAdd();
  }

  deleteCounter(id) {
    if (this.counters.length <= 1) {
      alert('You must have at least one counter!');
      return;
    }
    if (confirm('Are you sure you want to delete this counter?')) {
      this.counters = this.counters.filter(c => c.id !== id);
      document.querySelector(`[data-id="${id}"]`).remove();
      this.updateTotal();
      this.updateDailyProgress();
      this.saveCounters();
    }
  }

  incrementCounter(id) {
    const counter = this.counters.find(c => c.id === id);
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
    const counter = this.counters.find(c => c.id === id);
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
    if (confirm('Reset this counter to 0?')) {
      const counter = this.counters.find(c => c.id === id);
      if (counter) {
        counter.count = 0;
        this.updateCounterDisplay(id, 0);

        const today = this.getCurrentDayKey();
        const totalToday = this.counters.reduce((sum, c) => sum + c.count, 0);
        if (totalToday < this.dailyTarget && this.lastCelebrationDate === today) {
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
    if (confirm('Are you sure you want to reset all counters to 0? This cannot be undone.')) {
      this.counters.forEach(counter => {
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
    const container = document.getElementById('countersContainer');
    const div = document.createElement('div');
    div.className = 'counter';
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
    `;

    container.appendChild(div);
  }

  editCounterName(id) {
    const counter = this.counters.find(c => c.id === id);
    const titleElement = document.querySelector(`[data-id="${id}"] .counter-title`);
    if (!counter || !titleElement) return;

    const input = document.createElement('input');
    input.className = 'counter-title-input';
    input.value = counter.name;
    input.maxLength = 20;

    titleElement.replaceWith(input);
    input.focus();
    input.select();

    const save = () => {
      const newName = input.value.trim() || counter.name;
      counter.name = newName;

      const newTitle = document.createElement('div');
      newTitle.className = 'counter-title';
      newTitle.onclick = () => this.editCounterName(id);
      newTitle.textContent = newName;

      input.replaceWith(newTitle);
      this.saveCounters();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', e => e.key === 'Enter' && save());
  }

  editCountValue(id) {
    const counter = this.counters.find(c => c.id === id);
    const displayElement = document.querySelector(`[data-id="${id}"] .count-display`);
    if (!counter || !displayElement) return;

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'count-input';
    input.value = counter.count;
    input.min = '0';

    displayElement.replaceWith(input);
    input.focus();
    input.select();

    const save = () => {
      const newCount = parseInt(input.value);

      if (isNaN(newCount) || newCount < 0) {
        alert('Please enter a valid positive number');
        input.focus();
        return;
      }

      const oldCount = counter.count;
      counter.count = newCount;

      const newDisplay = document.createElement('div');
      newDisplay.className = 'count-display';
      newDisplay.onclick = () => this.editCountValue(id);
      newDisplay.title = 'Click to edit count';
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

    input.addEventListener('blur', save);
    input.addEventListener('keypress', e => e.key === 'Enter' && save());
  }

  updateCounterDisplay(id, count) {
    const el = document.querySelector(`[data-id="${id}"] .count-display`);
    if (el) el.textContent = count;
  }

  animateCounter(id) {
    const el = document.querySelector(`[data-id="${id}"] .count-display`);
    if (el) {
      el.classList.add('animate');
      setTimeout(() => el.classList.remove('animate'), 200);
    }
  }

  updateTotal() {
    const total = this.counters.reduce((sum, c) => sum + c.count, 0);
    document.getElementById('totalCount').textContent = total;
  }

  // ─── Progress Tracking ────────────────────────────────────────────────────

  getCurrentDayKey() {
    return this.formatDate(new Date());
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  formatDateDisplay(date) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
    const oldTotal = this.weeklyProgress[today] || 0;
    this.weeklyProgress[today] = totalToday;

    if (oldTotal < this.dailyTarget && totalToday >= this.dailyTarget && this.lastCelebrationDate !== today) {
      this.showCelebration();
      this.lastCelebrationDate = today;
    }

    this.updatePersonalBest();
    this.updateWeeklyView();
    this.saveProgress();
  }

  updatePersonalBest() {
    const today = this.getCurrentDayKey();
    const entries = Object.entries(this.weeklyProgress);
    const maxCount = entries.length > 0 ? Math.max(...entries.map(([, v]) => v)) : 0;
    const maxDate = entries.find(([, v]) => v === maxCount)?.[0] || today;

    const oldBest = this.personalBest;

    if (maxCount !== this.personalBest) {
      this.personalBest = maxCount;
      this.personalBestDate = maxDate;

      document.getElementById('personalBestCount').textContent = this.personalBest;
      document.getElementById('personalBestDate').textContent =
        maxCount > 0 ? this.formatDateDisplay(new Date(maxDate)) : 'No record yet';
    }

    const anyDayCompleted = Object.values(this.weeklyProgress).some(v => v >= this.dailyTarget);
    if (maxCount > oldBest && anyDayCompleted) {
      const celebrationKey = today;
      if (this.lastPersonalBestCelebration !== celebrationKey) {
        this.lastPersonalBestCelebration = celebrationKey;
        this.showPersonalBestCelebration(maxCount);
        this.audioFeedback.playCelebration();
        this.saveProgress();
      }
    }
  }

  updateDailyTarget() {
    this.dailyTarget = parseInt(document.getElementById('dailyTargetInput').value) || 10;
    this.updateWeeklyView();
    this.saveProgress();
  }

  navigateWeek(direction) {
    this.currentWeekOffset += direction;
    this.initializeWeeklyView();
    document.getElementById('nextWeekBtn').disabled = this.currentWeekOffset >= 0;
  }

  goToCurrentWeek() {
    this.currentWeekOffset = 0;
    this.initializeWeeklyView();
    document.getElementById('nextWeekBtn').disabled = true;
  }

  toggleProgress() {
    const panel = document.getElementById('progressPanel');
    panel.classList.toggle('open');

    if (panel.classList.contains('open')) {
      this.currentWeekOffset = 0;
      this.initializeWeeklyView();
      document.getElementById('nextWeekBtn').disabled = true;
      this.updateWeeklyView();
    }
  }

  closeProgress() {
    document.getElementById('progressPanel').classList.remove('open');
  }

  initializeWeeklyView() {
    const today = new Date();
    const viewDate = new Date(today);
    viewDate.setDate(today.getDate() + this.currentWeekOffset * 7);

    const monday = this.getMonday(viewDate);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const weekNumber = this.getWeekNumber(monday);

    if (this.currentWeekOffset === 0) {
      document.getElementById('weekTitle').textContent = 'This Week';
    } else if (this.currentWeekOffset === -1) {
      document.getElementById('weekTitle').textContent = 'Last Week';
    } else {
      document.getElementById('weekTitle').textContent = `${Math.abs(this.currentWeekOffset)} Weeks Ago`;
    }

    document.getElementById('weekNumber').textContent = `Week ${weekNumber}`;

    const formatShortDate = date => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    };

    document.getElementById('dateRange').textContent =
      monday.getMonth() === friday.getMonth()
        ? `${monday.getDate()} - ${formatShortDate(friday)}`
        : `${formatShortDate(monday)} - ${formatShortDate(friday)}`;

    const goToCurrentBtn = document.getElementById('goToCurrentWeekBtn');
    if (goToCurrentBtn) {
      goToCurrentBtn.style.display = this.currentWeekOffset === 0 ? 'none' : 'block';
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri'];

    days.forEach((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);

      document.getElementById(`${dayNames[index]}-date`).textContent = date.getDate();

      const dayCard = document.querySelector(`[data-day="${day}"]`);
      dayCard.classList.remove('today', 'future-day');

      if (this.isToday(date)) dayCard.classList.add('today');
      if (date > today) dayCard.classList.add('future-day');
    });

    this.updateWeeklyView();
  }

  updateWeeklyView() {
    const today = new Date();
    const viewDate = new Date(today);
    viewDate.setDate(today.getDate() + this.currentWeekOffset * 7);

    const monday = this.getMonday(viewDate);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri'];

    let weeklyTotal = 0;
    let daysCompleted = 0;

    days.forEach((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dateKey = this.formatDate(date);
      const count = this.weeklyProgress[dateKey] || 0;

      document.getElementById(`${dayNames[index]}-count`).textContent = count;

      const dayCard = document.querySelector(`[data-day="${day}"]`);
      if (count >= this.dailyTarget) {
        dayCard.classList.add('target-met');
        daysCompleted++;
      } else {
        dayCard.classList.remove('target-met');
      }

      weeklyTotal += count;
    });

    document.getElementById('weeklyTotal').textContent = weeklyTotal;
    document.getElementById('weeklyTarget').textContent = this.dailyTarget * 5;
    document.getElementById('daysCompleted').textContent = `${daysCompleted}/5`;

    const anyDayCompleted = Object.values(this.weeklyProgress).some(v => v >= this.dailyTarget);
    document.getElementById('personalBestSection').style.display = anyDayCompleted ? '' : 'none';
  }

  // ─── Celebrations ─────────────────────────────────────────────────────────

  showCelebration() {
    const modal = document.getElementById('celebrationModal');
    const img = document.getElementById('celebrationImage');

    img.src = this.celebrationGifs[Math.floor(Math.random() * this.celebrationGifs.length)];
    modal.classList.add('show');
    this.showPyro();
    this.audioFeedback.playCelebration();

    clearTimeout(this.celebrationTimeout);
    this.celebrationTimeout = setTimeout(() => this.closeCelebration(), 10000);
  }

  closeCelebration() {
    document.getElementById('celebrationModal').classList.remove('show');
    setTimeout(() => this.hidePyro(), 500);
    clearTimeout(this.celebrationTimeout);
    this.celebrationTimeout = null;
  }

  showPersonalBestCelebration(newRecord) {
    const modal = document.getElementById('personalBestModal');
    document.getElementById('newRecordText').textContent = `New Personal Best: ${newRecord}! 🏆`;

    modal.classList.add('show');
    this.showPyro();
    this.audioFeedback.playCelebration();

    clearTimeout(this.personalBestTimeout);
    this.personalBestTimeout = setTimeout(() => this.closePersonalBestCelebration(), 8000);
  }

  closePersonalBestCelebration() {
    document.getElementById('personalBestModal').classList.remove('show');
    setTimeout(() => this.hidePyro(), 500);
    clearTimeout(this.personalBestTimeout);
    this.personalBestTimeout = null;
  }

  showPyro() {
    const pyro = document.querySelector('.pyro');
    if (pyro) {
      pyro.classList.remove('active');
      void pyro.offsetWidth; // force reflow to restart animation
      pyro.classList.add('active');
    }
  }

  hidePyro() {
    document.querySelector('.pyro')?.classList.remove('active');
  }

  // ─── Background & Styling ─────────────────────────────────────────────────

  updateBackgroundColor() {
    const bgColor = document.getElementById('bgColorInput').value;
    document.body.style.backgroundColor = bgColor;
    this.autoAdjustTextColor(bgColor);
    this.saveSettings();
  }

  updateTextColor() {
    document.body.style.color = document.getElementById('textColorInput').value;
    this.saveSettings();
  }

  updateFontFamily() {
    const selectedFont = document.getElementById('fontSelect').value;
    document.body.style.fontFamily = selectedFont;
    document.getElementById('fontSelect').style.fontFamily = selectedFont;
    this.saveSettings();
  }

  resetStyles() {
    Object.assign(document.body.style, {
      backgroundColor: '#f5f5f5',
      backgroundImage: '',
      fontFamily: '',
      color: '#333333',
    });

    document.getElementById('bgColorInput').value = '#f5f5f5';
    document.getElementById('textColorInput').value = '#333333';
    document.getElementById('fontSelect').value = "'Open Sans', sans-serif";
    document.getElementById('fontSelect').style.fontFamily = "'Open Sans', sans-serif";

    document.querySelectorAll('.image-option, .custom-image-option').forEach(opt =>
      opt.classList.remove('selected')
    );
    document.querySelector('.image-option[data-image=""]').classList.add('selected');

    this.selectedBackground = '';
    this.selectedBackgroundType = 'default';
    this.selectedBackgroundId = null;
    this.customImages = [];
    this.renderCustomImages();
    this.audioFeedback = new AudioFeedback();

    localStorage.removeItem('counterAppSettings');
  }

  calculateLuminance(color) {
    let r, g, b;

    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith('rgb')) {
      const rgb = color.match(/\d+/g);
      r = parseInt(rgb[0]);
      g = parseInt(rgb[1]);
      b = parseInt(rgb[2]);
    } else {
      return 0.5;
    }

    const toLinear = c => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  autoAdjustTextColor(backgroundColor) {
    const textColor = this.calculateLuminance(backgroundColor) > 0.5 ? '#333333' : '#ffffff';
    document.body.style.color = textColor;
    document.getElementById('textColorInput').value = textColor;
    return textColor;
  }

  selectBackgroundImage(option) {
    document.querySelectorAll('.image-option, .custom-image-option').forEach(opt =>
      opt.classList.remove('selected')
    );
    option.classList.add('selected');

    const imageUrl = option.dataset.image;
    this.selectedBackground = imageUrl;
    this.selectedBackgroundType = 'default';
    this.selectedBackgroundId = null;

    if (imageUrl) {
      Object.assign(document.body.style, {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      });
      document.body.style.color = '#ffffff';
      document.getElementById('textColorInput').value = '#ffffff';
    } else {
      document.body.style.backgroundImage = '';
      this.autoAdjustTextColor(document.body.style.backgroundColor || '#f5f5f5');
    }

    this.saveSettings();
  }

  handleCustomImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const imageId = Date.now().toString();
      this.customImages.push({ id: imageId, data: e.target.result, name: file.name });
      this.renderCustomImages();
      this.selectBackgroundImageById(imageId);
      this.saveSettings();
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  }

  renderCustomImages() {
    const container = document.getElementById('customImagesContainer');

    if (this.customImages.length === 0) {
      container.innerHTML = '';
      return;
    }

    let html = '<div class="custom-images-label">Custom Images:</div><div class="custom-images-grid">';

    this.customImages.forEach(image => {
      html += `
        <div class="custom-image-option" data-custom-id="${image.id}">
          <img src="${image.data}" alt="${image.name}" title="${image.name}">
          <button class="custom-image-delete" onclick="app.deleteCustomImage('${image.id}')" title="Delete image">×</button>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    document.querySelectorAll('.custom-image-option').forEach(option => {
      option.addEventListener('click', e => {
        if (!e.target.classList.contains('custom-image-delete')) {
          this.selectBackgroundImageById(option.dataset.customId);
        }
      });
    });
  }

  selectBackgroundImageById(imageId) {
    document.querySelectorAll('.image-option, .custom-image-option').forEach(opt =>
      opt.classList.remove('selected')
    );

    const customImage = this.customImages.find(img => img.id === imageId);
    if (!customImage) return;

    document.querySelector(`[data-custom-id="${imageId}"]`).classList.add('selected');
    this.selectedBackground = customImage.data;
    this.selectedBackgroundType = 'custom';
    this.selectedBackgroundId = imageId;

    Object.assign(document.body.style, {
      backgroundImage: `url(${customImage.data})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    });
    document.body.style.color = '#ffffff';
    document.getElementById('textColorInput').value = '#ffffff';

    this.saveSettings();
  }

  deleteCustomImage(imageId) {
    if (confirm('Are you sure you want to delete this custom image?')) {
      this.customImages = this.customImages.filter(img => img.id !== imageId);

      if (this.selectedBackgroundType === 'custom' && this.selectedBackgroundId === imageId) {
        this.selectBackgroundImage(document.querySelector('[data-image=""]'));
      }

      this.renderCustomImages();
      this.saveSettings();
    }
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  saveCounters() {
    localStorage.setItem('counterAppData', JSON.stringify(this.counters));
  }

  loadCounters() {
    const saved = localStorage.getItem('counterAppData');
    if (saved) {
      this.counters = JSON.parse(saved);
      this.nextId = Math.max(...this.counters.map(c => c.id), 0) + 1;
      this.counters.forEach(counter => this.renderCounter(counter));
      this.updateTotal();
    }
  }

  saveSettings() {
    const settings = {
      backgroundColor: document.body.style.backgroundColor,
      backgroundImage: this.selectedBackground,
      backgroundType: this.selectedBackgroundType || 'default',
      backgroundId: this.selectedBackgroundId || null,
      fontFamily: document.body.style.fontFamily,
      textColor: document.body.style.color,
      customImages: this.customImages,
      dailyTarget: this.dailyTarget,
      audioEnabled: this.audioFeedback.isEnabled(),
      audioVolume: this.audioFeedback.volume,
    };
    localStorage.setItem('counterAppSettings', JSON.stringify(settings));
  }

  loadSettings() {
    const saved = localStorage.getItem('counterAppSettings');
    if (!saved) {
      document.querySelector('[data-image=""]')?.classList.add('selected');
      return;
    }

    const settings = JSON.parse(saved);

    if (settings.backgroundColor) {
      document.body.style.backgroundColor = settings.backgroundColor;
      document.getElementById('bgColorInput').value = settings.backgroundColor;
    }

    if (settings.textColor) {
      document.body.style.color = settings.textColor;
      document.getElementById('textColorInput').value = settings.textColor;
    } else if (settings.backgroundColor) {
      this.autoAdjustTextColor(settings.backgroundColor);
    }

    if (settings.customImages) {
      this.customImages = settings.customImages;
      this.renderCustomImages();
    }

    this.selectedBackgroundType = settings.backgroundType || 'default';
    this.selectedBackgroundId = settings.backgroundId || null;

    if (settings.backgroundImage !== undefined) {
      this.selectedBackground = settings.backgroundImage;

      if (settings.backgroundImage) {
        Object.assign(document.body.style, {
          backgroundImage: `url(${settings.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        });

        if (this.selectedBackgroundType === 'custom') {
          document.querySelector(`[data-custom-id="${this.selectedBackgroundId}"]`)?.classList.add('selected');
        } else {
          document.querySelector(`[data-image="${settings.backgroundImage}"]`)?.classList.add('selected');
        }
      } else {
        document.querySelector('[data-image=""]')?.classList.add('selected');
      }
    }

    if (settings.fontFamily) {
      document.body.style.fontFamily = settings.fontFamily;
      document.getElementById('fontSelect').value = settings.fontFamily;
      document.getElementById('fontSelect').style.fontFamily = settings.fontFamily;
    }

    if (settings.dailyTarget) {
      this.dailyTarget = settings.dailyTarget;
      document.getElementById('dailyTargetInput').value = settings.dailyTarget;
    }

    if (settings.audioEnabled !== undefined) {
      this.audioFeedback.enabled = settings.audioEnabled;
      const audioBtn = document.getElementById('toggleAudioBtn');
      if (audioBtn) {
        audioBtn.textContent = settings.audioEnabled ? '🔊 Audio On' : '🔇 Audio Off';
        audioBtn.style.background = settings.audioEnabled ? '#42479e' : '#7f8c8d';
      }
    }

    if (settings.audioVolume !== undefined) {
      this.audioFeedback.setVolume(settings.audioVolume);
      const volumeControl = document.getElementById('volumeControl');
      if (volumeControl) volumeControl.value = settings.audioVolume * 100;
    }
  }

  saveProgress() {
    localStorage.setItem('counterAppProgress', JSON.stringify({
      weeklyProgress: this.weeklyProgress,
      lastCelebrationDate: this.lastCelebrationDate,
      dailyTarget: this.dailyTarget,
      personalBest: this.personalBest,
      personalBestDate: this.personalBestDate,
      lastPersonalBestCelebration: this.lastPersonalBestCelebration,
    }));
  }

  loadProgress() {
    const saved = localStorage.getItem('counterAppProgress');
    if (!saved) return;

    const data = JSON.parse(saved);
    this.weeklyProgress = data.weeklyProgress || {};
    this.lastCelebrationDate = data.lastCelebrationDate || null;
    this.dailyTarget = data.dailyTarget || 10;
    this.personalBest = data.personalBest || 0;
    this.personalBestDate = data.personalBestDate || null;
    this.lastPersonalBestCelebration = data.lastPersonalBestCelebration || null;

    document.getElementById('dailyTargetInput').value = this.dailyTarget;

    if (this.personalBest > 0) {
      document.getElementById('personalBestCount').textContent = this.personalBest;
      if (this.personalBestDate) {
        document.getElementById('personalBestDate').textContent =
          this.formatDateDisplay(new Date(this.personalBestDate));
      }
    }

    const anyDayCompleted = Object.values(this.weeklyProgress).some(v => v >= this.dailyTarget);
    document.getElementById('personalBestSection').style.display = anyDayCompleted ? '' : 'none';
  }
}
