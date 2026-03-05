import { CounterApp } from './app.js';

// Assign to window so inline onclick handlers in HTML can reach it
window.app = new CounterApp();
