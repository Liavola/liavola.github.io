// Audio feedback system
class AudioFeedback {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.5;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.log('Web Audio API not supported');
      this.enabled = false;
    }
  }

  playBeep(frequency = 800, duration = 150, type = 'sine') {
    if (!this.enabled || !this.audioContext) return;

    // Resume audio context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;

    // Volume envelope for smooth sound
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.15, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration / 1000);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration / 1000);
  }

  // Different sounds for different actions
  playIncrement() {
    this.playBeep(650, 120, 'sine'); // Higher pitch for increment
  }

  playDecrement() {
    this.playBeep(450, 120, 'sine'); // Lower pitch for decrement
  }

  playReset() {
    this.playBeep(300, 200, 'square'); // Different tone for reset
  }

  playAdd() {
    this.playBeep(800, 100, 'triangle'); // Different tone for adding counter
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

class CounterApp {
  constructor() {
    this.counters = [];
    this.nextId = 1;
    this.selectedBackground = "";
    this.customImages = [];
    this.selectedBackgroundType = 'default';
    this.selectedBackgroundId = null;
    this.dailyTarget = 10;
    this.weeklyProgress = {};
    this.celebrationGifs = [
      'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif',
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
      'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif',
      'https://media1.tenor.com/m/EmZ0N3llkAkAAAAC/cat-cats.gif',
      'https://media1.tenor.com/m/_4nl1Qq1RKcAAAAd/partying-cat-party.gif'
    ];
    this.lastCelebrationDate = null;
    
    // Initialize audio feedback
    this.audioFeedback = new AudioFeedback();
    
    this.init();
  }

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
    const options = fontSelect.querySelectorAll('option');
    
    options.forEach(option => {
      option.style.fontFamily = option.value;
    });
    
    fontSelect.addEventListener('change', () => {
      fontSelect.style.fontFamily = fontSelect.value;
    });
    
    fontSelect.style.fontFamily = fontSelect.value;
  }

  bindEvents() {
    const bind = (id, event, handler) => document.getElementById(id).addEventListener(event, handler);
    
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
    bind("closeProgressBtn", "click", () => this.closeProgress());
    bind("closeCelebrationBtn", "click", () => this.closeCelebration());

    // Audio control bindings (add these if you want audio controls in settings)
    const audioToggleBtn = document.getElementById('toggleAudioBtn');
    const volumeControl = document.getElementById('volumeControl');
    
    if (audioToggleBtn) {
      audioToggleBtn.addEventListener('click', (e) => this.toggleAudio(e));
    }
    
    if (volumeControl) {
      volumeControl.addEventListener('input', (e) => this.updateVolume(e));
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

  // Audio control methods
  toggleAudio(e) {
    const isEnabled = this.audioFeedback.toggle();
    e.target.textContent = isEnabled ? '🔊 Audio On' : '🔇 Audio Off';
    e.target.style.background = isEnabled ? '#42479e' : '#7f8c8d';
    this.saveSettings();
  }

  updateVolume(e) {
    const volume = e.target.value / 100;
    this.audioFeedback.setVolume(volume);
    this.saveSettings();
  }

  // Progress tracking methods
  initializeWeeklyView() {
    const today = new Date();
    const monday = this.getMonday(today);
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    
    days.forEach((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dateStr = this.formatDate(date);
      
      document.getElementById(`${dayNames[index]}-date`).textContent = date.getDate();
      
      const dayCard = document.querySelector(`[data-day="${day}"]`);
      if (this.isToday(date)) {
        dayCard.classList.add('today');
      }
    });
    
    this.updateWeeklyView();
  }

  getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  getCurrentDayKey() {
    return this.formatDate(new Date());
  }

  updateDailyProgress() {
    const today = this.getCurrentDayKey();
    const totalToday = this.counters.reduce((sum, counter) => sum + counter.count, 0);
    
    if (!this.weeklyProgress[today]) {
      this.weeklyProgress[today] = 0;
    }
    
    const oldTotal = this.weeklyProgress[today];
    this.weeklyProgress[today] = totalToday;
    
    if (oldTotal < this.dailyTarget && totalToday >= this.dailyTarget && 
        this.lastCelebrationDate !== today) {
      this.showCelebration();
      this.lastCelebrationDate = today;
      this.saveProgress();
    }
    
    this.updateWeeklyView();
    this.saveProgress();
  }

  updateWeeklyView() {
    const today = new Date();
    const monday = this.getMonday(today);
    
    const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
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
    document.getElementById('weeklyTarget').textContent = this.dailyTarget * 7;
    document.getElementById('daysCompleted').textContent = `${daysCompleted}/7`;
  }

  showCelebration() {
    const modal = document.getElementById('celebrationModal');
    const img = document.getElementById('celebrationImage');
    
    const randomGif = this.celebrationGifs[Math.floor(Math.random() * this.celebrationGifs.length)];
    img.src = randomGif;
    
    modal.classList.add('show');
    
    setTimeout(() => {
      this.closeCelebration();
    }, 10000);
  }

  closeCelebration() {
    document.getElementById('celebrationModal').classList.remove('show');
  }

  updateDailyTarget() {
    this.dailyTarget = parseInt(document.getElementById('dailyTargetInput').value) || 10;
    this.updateWeeklyView();
    this.saveProgress();
  }

  toggleProgress() {
    document.getElementById("progressPanel").classList.toggle("open");
    if (document.getElementById("progressPanel").classList.contains("open")) {
      this.updateWeeklyView();
    }
  }

  closeProgress() {
    document.getElementById("progressPanel").classList.remove("open");
  }

  // Updated increment/decrement methods with audio feedback
  incrementCounter(id) {
    const counter = this.counters.find(c => c.id === id);
    if (counter) {
      counter.count++;
      this.updateCounterDisplay(id, counter.count);
      this.animateCounter(id);
      this.updateTotal();
      this.updateDailyProgress();
      this.saveCounters();
      
      // Play increment sound
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
      
      // Play decrement sound
      this.audioFeedback.playDecrement();
    }
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
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      });
    } else {
      document.body.style.backgroundImage = "";
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
    reader.onload = (e) => {
      const imageData = e.target.result;
      const imageId = Date.now().toString();
      
      const customImage = {
        id: imageId,
        data: imageData,
        name: file.name
      };
      
      this.customImages.push(customImage);
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
      option.addEventListener('click', (e) => {
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
    if (customImage) {
      document.querySelector(`[data-custom-id="${imageId}"]`).classList.add('selected');
      this.selectedBackground = customImage.data;
      this.selectedBackgroundType = 'custom';
      this.selectedBackgroundId = imageId;
      
      Object.assign(document.body.style, {
        backgroundImage: `url(${customImage.data})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      });
      
      this.saveSettings();
    }
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

  resetAllCounters() {
    if (confirm("Are you sure you want to reset all counters to 0? This cannot be undone.")) {
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
      
      // Play reset sound
      this.audioFeedback.playReset();
    }
  }

  resetCounter(id) {
    if (confirm("Reset this counter to 0?")) {
      const counter = this.counters.find(c => c.id === id);
      if (counter) {
        counter.count = 0;
        this.updateCounterDisplay(id, 0);
        
        const today = this.getCurrentDayKey();
        const totalToday = this.counters.reduce((sum, counter) => sum + counter.count, 0);
        if (totalToday < this.dailyTarget && this.lastCelebrationDate === today) {
          this.lastCelebrationDate = null;
        }
        
        this.updateTotal();
        this.updateDailyProgress();
        this.saveCounters();
        this.saveProgress();
        
        // Play reset sound
        this.audioFeedback.playReset();
      }
    }
  }

  addCounter() {
    const counter = { id: this.nextId++, count: 0, name: `Counter ${this.counters.length + 1}` };
    this.counters.push(counter);
    this.renderCounter(counter);
    this.updateTotal();
    this.saveCounters();
    
    // Play add counter sound
    this.audioFeedback.playAdd();
  }

  renderCounter(counter) {
    const container = document.getElementById("countersContainer");
    const counterDiv = document.createElement("div");
    counterDiv.className = "counter";
    counterDiv.dataset.id = counter.id;

    counterDiv.innerHTML = `
      <div class="counter-header">
        <div class="counter-title" onclick="app.editCounterName(${counter.id})">${counter.name}</div>
        <div class="counter-actions">
          <button class="reset-counter" onclick="app.resetCounter(${counter.id})" title="Reset counter">↻</button>
          <button class="delete-counter" onclick="app.deleteCounter(${counter.id})" title="Delete counter">×</button>
        </div>
      </div>
      <div class="counter-controls">
        <button class="counter-btn minus" onclick="app.decrementCounter(${counter.id})">−</button>
        <div class="count-display">${counter.count}</div>
        <button class="counter-btn plus" onclick="app.incrementCounter(${counter.id})">+</button>
      </div>
    `;

    container.appendChild(counterDiv);
  }

  editCounterName(id) {
    const counter = this.counters.find(c => c.id === id);
    const titleElement = document.querySelector(`[data-id="${id}"] .counter-title`);
    
    if (counter && titleElement) {
      const input = document.createElement("input");
      input.className = "counter-title-input";
      input.value = counter.name;
      input.maxLength = 20;
      
      titleElement.replaceWith(input);
      input.focus();
      input.select();
      
      const saveTitle = () => {
        const newName = input.value.trim() || counter.name;
        counter.name = newName;
        
        const newTitleElement = document.createElement("div");
        newTitleElement.className = "counter-title";
        newTitleElement.onclick = () => this.editCounterName(id);
        newTitleElement.textContent = newName;
        
        input.replaceWith(newTitleElement);
        this.saveCounters();
      };
      
      input.addEventListener("blur", saveTitle);
      input.addEventListener("keypress", e => e.key === "Enter" && saveTitle());
    }
  }

  deleteCounter(id) {
    if (this.counters.length <= 1) {
      alert("You must have at least one counter!");
      return;
    }
    if (confirm("Are you sure you want to delete this counter?")) {
      this.counters = this.counters.filter(c => c.id !== id);
      document.querySelector(`[data-id="${id}"]`).remove();
      this.updateTotal();
      this.updateDailyProgress();
      this.saveCounters();
    }
  }

  updateCounterDisplay(id, count) {
    const element = document.querySelector(`[data-id="${id}"] .count-display`);
    if (element) element.textContent = count;
  }

  animateCounter(id) {
    const element = document.querySelector(`[data-id="${id}"] .count-display`);
    if (element) {
      element.classList.add('animate');
      setTimeout(() => element.classList.remove('animate'), 200);
    }
  }

  updateTotal() {
    const total = this.counters.reduce((sum, counter) => sum + counter.count, 0);
    document.getElementById("totalCount").textContent = total;
  }

  updateBackgroundColor() {
    document.body.style.backgroundColor = document.getElementById("bgColorInput").value;
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

  toggleSettings() {
    document.getElementById("settingsPanel").classList.toggle("open");
  }

  closeSettings() {
    document.getElementById("settingsPanel").classList.remove("open");
  }

  resetStyles() {
    Object.assign(document.body.style, {
      backgroundColor: "#f5f5f5",
      backgroundImage: "",
      fontFamily: "",
      color: "#333333"
    });

    document.getElementById("bgColorInput").value = "#f5f5f5";
    document.getElementById("textColorInput").value = "#333333";
    document.getElementById("fontSelect").value = "'Open Sans', sans-serif";
    document.getElementById("fontSelect").style.fontFamily = "'Open Sans', sans-serif";
    
    document.querySelectorAll('.image-option, .custom-image-option').forEach(opt => 
      opt.classList.remove('selected')
    );
    document.querySelector('.image-option[data-image=""]').classList.add('selected');
    
    this.selectedBackground = "";
    this.selectedBackgroundType = 'default';
    this.selectedBackgroundId = null;
    this.customImages = [];
    this.renderCustomImages();
    
    // Reset audio settings
    this.audioFeedback = new AudioFeedback();
    
    localStorage.removeItem("counterAppSettings");
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
      audioVolume: this.audioFeedback.volume
    };
    localStorage.setItem("counterAppSettings", JSON.stringify(settings));
  }

  loadSettings() {
    const saved = localStorage.getItem("counterAppSettings");
    if (!saved) {
      document.querySelector('[data-image=""]')?.classList.add('selected');
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
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
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
      document.getElementById("fontSelect").value = settings.fontFamily;
      document.getElementById("fontSelect").style.fontFamily = settings.fontFamily;
    }

    if (settings.dailyTarget) {
      this.dailyTarget = settings.dailyTarget;
      document.getElementById("dailyTargetInput").value = settings.dailyTarget;
    }

    // Load audio settings
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
      if (volumeControl) {
        volumeControl.value = settings.audioVolume * 100;
      }
    }
  }

  saveProgress() {
    const progressData = {
      weeklyProgress: this.weeklyProgress,
      lastCelebrationDate: this.lastCelebrationDate,
      dailyTarget: this.dailyTarget
    };
    localStorage.setItem("counterAppProgress", JSON.stringify(progressData));
  }

  loadProgress() {
    const saved = localStorage.getItem("counterAppProgress");
    if (saved) {
      const progressData = JSON.parse(saved);
      this.weeklyProgress = progressData.weeklyProgress || {};
      this.lastCelebrationDate = progressData.lastCelebrationDate || null;
      this.dailyTarget = progressData.dailyTarget || 10;
      document.getElementById("dailyTargetInput").value = this.dailyTarget;
    }
  }

  saveCounters() {
    localStorage.setItem("counterAppData", JSON.stringify(this.counters));
  }

  loadCounters() {
    const saved = localStorage.getItem("counterAppData");
    if (saved) {
      this.counters = JSON.parse(saved);
      this.nextId = Math.max(...this.counters.map(c => c.id), 0) + 1;
      this.counters.forEach(counter => this.renderCounter(counter));
      this.updateTotal();
    }
  }
}

const app = new CounterApp();