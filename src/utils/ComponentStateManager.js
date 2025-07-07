// ComponentStateManager.js - Manages component state persistence across navigation
class ComponentStateManager {
  constructor() {
    this.componentStates = new Map();
  }

  // Save component state
  saveState(componentName, state) {
    this.componentStates.set(componentName, { ...state, timestamp: Date.now() });
  }

  // Get component state
  getState(componentName) {
    const savedState = this.componentStates.get(componentName);
    if (!savedState) return null;
    
    // Check if state is still fresh (within 1 hour)
    const isStale = Date.now() - savedState.timestamp > 60 * 60 * 1000;
    if (isStale) {
      this.componentStates.delete(componentName);
      return null;
    }
    
    // Remove timestamp before returning
    const { timestamp, ...state } = savedState;
    return state;
  }

  // Clear specific component state
  clearState(componentName) {
    this.componentStates.delete(componentName);
  }

  // Clear all states
  clearAllStates() {
    this.componentStates.clear();
  }

  // Check if component has saved state
  hasState(componentName) {
    return this.componentStates.has(componentName);
  }
}

// Export a singleton instance
export default new ComponentStateManager();
