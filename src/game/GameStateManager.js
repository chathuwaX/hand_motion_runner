/**
 * GameStateManager.js
 * Robust state machine managing application states and transitions.
 */

export const GameStates = Object.freeze({
  INITIALIZING: 'INITIALIZING',
  MAIN_MENU: 'MAIN_MENU',
  CAMERA_INITIALIZING: 'CAMERA_INITIALIZING',
  CALIBRATING: 'CALIBRATING',
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER'
});

export class GameStateManager {
  constructor() {
    this.currentState = GameStates.INITIALIZING;
    this.listeners = new Map();

    // Valid transitions
    this.allowedTransitions = {
      [GameStates.INITIALIZING]: [GameStates.MAIN_MENU],
      [GameStates.MAIN_MENU]: [GameStates.CAMERA_INITIALIZING, GameStates.READY, GameStates.PLAYING],
      [GameStates.CAMERA_INITIALIZING]: [GameStates.CALIBRATING, GameStates.MAIN_MENU],
      [GameStates.CALIBRATING]: [GameStates.READY, GameStates.MAIN_MENU],
      [GameStates.READY]: [GameStates.PLAYING, GameStates.MAIN_MENU, GameStates.CALIBRATING],
      [GameStates.PLAYING]: [GameStates.PAUSED, GameStates.GAME_OVER, GameStates.MAIN_MENU],
      [GameStates.PAUSED]: [GameStates.PLAYING, GameStates.MAIN_MENU, GameStates.GAME_OVER],
      [GameStates.GAME_OVER]: [GameStates.READY, GameStates.PLAYING, GameStates.MAIN_MENU, GameStates.CALIBRATING]
    };
  }

  getState() {
    return this.currentState;
  }

  is(state) {
    return this.currentState === state;
  }

  setState(newState, data = null) {
    if (this.currentState === newState) return true;

    const allowed = this.allowedTransitions[this.currentState];
    if (!allowed || !allowed.includes(newState)) {
      console.warn(`[GameStateManager] Invalid state transition rejected: ${this.currentState} -> ${newState}`);
      return false;
    }

    const previousState = this.currentState;
    this.currentState = newState;
    console.log(`[GameStateManager] State changed: ${previousState} -> ${newState}`);

    this.notify(newState, previousState, data);
    return true;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  notify(newState, oldState, data) {
    // Specific state listeners
    if (this.listeners.has(newState)) {
      this.listeners.get(newState).forEach(cb => {
        try { cb(oldState, data); } catch (e) { console.error(e); }
      });
    }

    // Generic state change listeners
    if (this.listeners.has('change')) {
      this.listeners.get('change').forEach(cb => {
        try { cb(newState, oldState, data); } catch (e) { console.error(e); }
      });
    }
  }
}

export const gameStateManager = new GameStateManager();
