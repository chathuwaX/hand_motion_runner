/**
 * main.js
 * Application entry point for MOTION RUNNER.
 * Initializes split-screen dual viewports:
 * - 3D Endless Runner Game Viewport
 * - Live Human Motion Tracking Viewport
 */

import { Game } from './game/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('game-canvas-container');
  const uiContainer = document.getElementById('ui-layer');
  const trackingContainer = document.getElementById('tracking-panel');
  const hudContainer = document.getElementById('game-hud-mount');

  if (!canvasContainer || !uiContainer) {
    console.error('Root containers not found.');
    return;
  }

  try {
    const game = new Game(canvasContainer, uiContainer, trackingContainer, hudContainer);
    window.__MOTION_RUNNER__ = game; // Expose for testing & inspection
  } catch (err) {
    console.error('Fatal initialization error:', err);
    document.body.innerHTML = `
      <div style="color: #fff; padding: 40px; text-align: center; font-family: sans-serif;">
        <h2 style="color: #ff0055;">Initialization Error</h2>
        <p style="margin-top: 10px; color: #94a3b8;">${err.message}</p>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">Retry</button>
      </div>
    `;
  }
});
