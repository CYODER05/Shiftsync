// AppStateManager.js - Comprehensive app state management across page reloads
class AppStateManager {
  constructor() {
    this.storageKey = 'shiftsync_app_state';
    this.sessionKey = 'shiftsync_session_id';
    this.currentSessionId = this.generateSessionId();
    
    // Initialize session tracking
    this.initializeSession();
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  initializeSession() {
    // Check if this is a new session or continuation
    const existingSessionId = sessionStorage.getItem(this.sessionKey);
    
    if (!existingSessionId) {
      // New session - store session ID
      sessionStorage.setItem(this.sessionKey, this.currentSessionId);
      console.log('New session started:', this.currentSessionId);
    } else {
      // Continuing existing session
      this.currentSessionId = existingSessionId;
      console.log('Continuing session:', this.currentSessionId);
    }
  }

  // Save complete app state
  saveAppState(state) {
    try {
      const stateWithSession = {
        ...state,
        sessionId: this.currentSessionId,
        timestamp: Date.now(),
        url: window.location.href
      };
      
      // Save to both localStorage and sessionStorage for redundancy
      localStorage.setItem(this.storageKey, JSON.stringify(stateWithSession));
      sessionStorage.setItem(this.storageKey, JSON.stringify(stateWithSession));
      
      console.log('App state saved:', stateWithSession);
    } catch (error) {
      console.error('Failed to save app state:', error);
    }
  }

  // Restore app state
  restoreAppState() {
    try {
      // Try sessionStorage first (more reliable for same session)
      let savedState = sessionStorage.getItem(this.storageKey);
      
      // Fallback to localStorage
      if (!savedState) {
        savedState = localStorage.getItem(this.storageKey);
      }
      
      if (!savedState) {
        console.log('No saved app state found');
        return null;
      }
      
      const parsedState = JSON.parse(savedState);
      
      // Check if state is from current session and not too old (within 1 hour)
      const isCurrentSession = parsedState.sessionId === this.currentSessionId;
      const isRecent = Date.now() - parsedState.timestamp < 60 * 60 * 1000;
      
      if (isCurrentSession && isRecent) {
        console.log('Restored app state:', parsedState);
        return parsedState;
      } else {
        console.log('Saved state is stale or from different session');
        this.clearAppState();
        return null;
      }
    } catch (error) {
      console.error('Failed to restore app state:', error);
      return null;
    }
  }

  // Clear app state
  clearAppState() {
    localStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.storageKey);
    console.log('App state cleared');
  }

  // Check if page was reloaded
  wasPageReloaded() {
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0];
      return navEntry.type === 'reload';
    }
    return false;
  }

  // Set up beforeunload handler to save state
  setupBeforeUnloadHandler(saveStateCallback) {
    const handleBeforeUnload = () => {
      if (saveStateCallback) {
        const currentState = saveStateCallback();
        this.saveAppState(currentState);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Also save on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && saveStateCallback) {
        const currentState = saveStateCallback();
        this.saveAppState(currentState);
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }

  // Detect if this is likely a development reload
  isDevelopmentReload() {
    // Check for Vite HMR or other dev indicators
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port !== '' ||
      process.env.NODE_ENV === 'development'
    );
  }
}

// Export singleton instance
export default new AppStateManager();
