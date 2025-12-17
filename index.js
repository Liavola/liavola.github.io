class CounterApp {
  constructor() {
    this.counters = [];
    this.nextId = 1;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadCounters();
    this.loadSettings();

    // Add initial counter if none exist
    if (this.counters.length === 0) {
      this.addCounter();
    }
  }

  bindEvents() {
    document.getElementById("addCounterBtn").addEventListener("click", () => {
      this.addCounter();
    });

    document
      .getElementById("bgColorInput")
      .addEventListener("input", this.updateBackgroundColor.bind(this));
    document
      .getElementById("textColorInput")
      .addEventListener("input", this.updateTextColor.bind(this));
    document
      .getElementById("bgImageInput")
      .addEventListener("input", this.updateBackgroundImage.bind(this));
    document
      .getElementById("fontSelect")
      .addEventListener("change", this.updateFontFamily.bind(this));
    document
      .getElementById("resetStylesBtn")
      .addEventListener("click", this.resetStyles.bind(this));

    document
      .getElementById("toggleSettingsBtn")
      .addEventListener("click", () => {
        this.toggleSettings();
      });

    document
      .getElementById("closeSettingsBtn")
      .addEventListener("click", () => {
        this.closeSettings();
      });
  }

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
  }

  renderCounter(counter) {
    const container = document.getElementById("countersContainer");
    const counterDiv = document.createElement("div");
    counterDiv.className = "counter";
    counterDiv.dataset.id = counter.id;

    counterDiv.innerHTML = `
      <div class="counter-header">
        <div class="counter-title" onclick="app.editCounterName(${counter.id})">${counter.name}</div>
        <button class="delete-counter" onclick="app.deleteCounter(${counter.id})">×</button>
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
    const counter = this.counters.find((c) => c.id === id);
    const titleElement = document.querySelector(
      `[data-id="${id}"] .counter-title`
    );

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
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          saveTitle();
        }
      });
    }
  }

  incrementCounter(id) {
    const counter = this.counters.find((c) => c.id === id);
    if (counter) {
      counter.count++;
      this.updateCounterDisplay(id, counter.count);
      this.animateCounter(id);
      this.updateTotal();
      this.saveCounters();
    }
  }

  decrementCounter(id) {
    const counter = this.counters.find((c) => c.id === id);
    if (counter && counter.count > 0) {
      counter.count--;
      this.updateCounterDisplay(id, counter.count);
      this.animateCounter(id);
      this.updateTotal();
      this.saveCounters();
    }
  }

  deleteCounter(id) {
    if (this.counters.length <= 1) {
      alert("You must have at least one counter!");
      return;
    }

    this.counters = this.counters.filter((c) => c.id !== id);
    document.querySelector(`[data-id="${id}"]`).remove();
    this.updateTotal();
    this.saveCounters();
  }

  updateCounterDisplay(id, count) {
    const counterElement = document.querySelector(
      `[data-id="${id}"] .count-display`
    );
    if (counterElement) {
      counterElement.textContent = count;
    }
  }

  animateCounter(id) {
    const counterElement = document.querySelector(
      `[data-id="${id}"] .count-display`
    );
    if (counterElement) {
      counterElement.classList.add("animate");
      setTimeout(() => {
        counterElement.classList.remove("animate");
      }, 200);
    }
  }

  updateTotal() {
    const total = this.counters.reduce(
      (sum, counter) => sum + counter.count,
      0
    );
    document.getElementById("totalCount").textContent = total;
  }

  updateBackgroundColor() {
    const color = document.getElementById("bgColorInput").value;
    if (this.isValidHexColor(color)) {
      document.body.style.backgroundColor = color;
      this.saveSettings();
    }
  }

  updateTextColor() {
    const color = document.getElementById("textColorInput").value;
    if (this.isValidHexColor(color)) {
      document.body.style.color = color;
      this.saveSettings();
    }
  }

  updateBackgroundImage() {
    const imageUrl = document.getElementById("bgImageInput").value;
    if (imageUrl) {
      document.body.style.backgroundImage = `url(${imageUrl})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundRepeat = "no-repeat";
    } else {
      document.body.style.backgroundImage = "";
    }
    this.saveSettings();
  }

  updateFontFamily() {
    const fontFamily = document.getElementById("fontSelect").value;
    document.body.style.fontFamily = fontFamily;
    this.saveSettings();
  }

  toggleSettings() {
    const panel = document.getElementById("settingsPanel");
    panel.classList.toggle("open");
  }

  closeSettings() {
    const panel = document.getElementById("settingsPanel");
    panel.classList.remove("open");
  }

  resetStyles() {
    document.body.style.backgroundColor = "";
    document.body.style.color = "";
    document.body.style.backgroundImage = "";
    document.body.style.fontFamily = "";

    document.getElementById("bgColorInput").value = "";
    document.getElementById("textColorInput").value = "";
    document.getElementById("bgImageInput").value = "";
    document.getElementById("fontSelect").value = "'Open Sans', sans-serif";

    localStorage.removeItem("counterAppSettings");
  }

  isValidHexColor(hex) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  }

  saveSettings() {
    const settings = {
      backgroundColor: document.body.style.backgroundColor,
      color: document.body.style.color,
      backgroundImage: document.body.style.backgroundImage,
      fontFamily: document.body.style.fontFamily,
    };
    localStorage.setItem("counterAppSettings", JSON.stringify(settings));
  }

  loadSettings() {
    const savedSettings = localStorage.getItem("counterAppSettings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);

      if (settings.backgroundColor) {
        document.body.style.backgroundColor = settings.backgroundColor;
        document.getElementById("bgColorInput").value =
          settings.backgroundColor;
      }
      if (settings.color) {
        document.body.style.color = settings.color;
        document.getElementById("textColorInput").value = settings.color;
      }
      if (settings.backgroundImage) {
        document.body.style.backgroundImage = settings.backgroundImage;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";
      }
      if (settings.fontFamily) {
        document.body.style.fontFamily = settings.fontFamily;
        document.getElementById("fontSelect").value = settings.fontFamily;
      }
    }
  }

  saveCounters() {
    localStorage.setItem("counterAppData", JSON.stringify(this.counters));
  }

  loadCounters() {
    const savedCounters = localStorage.getItem("counterAppData");
    if (savedCounters) {
      this.counters = JSON.parse(savedCounters);
      this.nextId = Math.max(...this.counters.map((c) => c.id), 0) + 1;

      this.counters.forEach((counter) => {
        this.renderCounter(counter);
      });

      this.updateTotal();
    }
  }
}

const app = new CounterApp();
