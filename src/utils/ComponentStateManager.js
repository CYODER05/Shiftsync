// ComponentStateManager.js - Manages component state persistence across navigation and page reloads
class ComponentStateManager {
  constructor() {
    this.componentStates = new Map();
    this.storageKey = 'shiftsync_component_states';
    
    // Load states from localStorage on initialization
    this.loadFromStorage();
  }

  // Load states from localStorage
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsedStates = JSON.parse(stored);
        // Convert back to Map and filter out stale states
        Object.entries(parsedStates).forEach(([key, value]) => {
          // Check if state is still fresh (within 2 hours)
          const isStale = Date.now() - value.timestamp > 2 * 60 * 60 * 1000;
          if (!isStale) {
            this.componentStates.set(key, value);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load component states from storage:', error);
    }
  }

  // Save states to localStorage
  saveToStorage() {
    try {
      const statesObject = Object.fromEntries(this.componentStates);
      localStorage.setItem(this.storageKey, JSON.stringify(statesObject));
    } catch (error) {
      console.warn('Failed to save component states to storage:', error);
    }
  }

  // Save component state
  saveState(componentName, state) {
    this.componentStates.set(componentName, { ...state, timestamp: Date.now() });
    this.saveToStorage();
  }

  // Get component state
  getState(componentName) {
    const savedState = this.componentStates.get(componentName);
    if (!savedState) return null;
    
    // Check if state is still fresh (within 2 hours)
    const isStale = Date.now() - savedState.timestamp > 2 * 60 * 60 * 1000;
    if (isStale) {
      this.componentStates.delete(componentName);
      this.saveToStorage();
      return null;
    }
    
    // Remove timestamp before returning
    const { timestamp, ...state } = savedState;
    return state;
  }

  // Clear specific component state
  clearState(componentName) {
    this.componentStates.delete(componentName);
    this.saveToStorage();
  }

  // Clear all states
  clearAllStates() {
    this.componentStates.clear();
    localStorage.removeItem(this.storageKey);
  }

  // Check if component has saved state
  hasState(componentName) {
    return this.componentStates.has(componentName);
  }

  // Clean up stale states (called periodically)
  cleanupStaleStates() {
    let hasChanges = false;
    const now = Date.now();
    
    for (const [key, value] of this.componentStates.entries()) {
      const isStale = now - value.timestamp > 2 * 60 * 60 * 1000;
      if (isStale) {
        this.componentStates.delete(key);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      this.saveToStorage();
    }
  }
}

// Export a singleton instance
export default new ComponentStateManager();
