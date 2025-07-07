// PageLifecycleManager.js - Handles page lifecycle events and prevents unnecessary reloads
class PageLifecycleManager {
  constructor() {
    this.isPageVisible = true;
    this.lastActiveTime = Date.now();
    this.beforeUnloadHandlers = new Set();
    this.visibilityChangeHandlers = new Set();
    
    this.init();
  }

  init() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Handle page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    
    // Handle page focus/blur
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));
    
    // Handle page freeze/resume (for mobile browsers)
    document.addEventListener('freeze', this.handleFreeze.bind(this));
    document.addEventListener('resume', this.handleResume.bind(this));
    
    // Mark page as active on load
    this.markPageActive();
  }

  handleVisibilityChange() {
    this.isPageVisible = !document.hidden;
    
    if (this.isPageVisible) {
      this.markPageActive();
      this.notifyVisibilityHandlers('visible');
    } else {
      this.notifyVisibilityHandlers('hidden');
    }
  }

  handleBeforeUnload(event) {
    // Save current state before page unloads
    this.notifyBeforeUnloadHandlers();
    
    // Don't show confirmation dialog in development
    if (process.env.NODE_ENV === 'development') {
      return;
    }
  }

  handleFocus() {
    this.isPageVisible = true;
    this.markPageActive();
    this.notifyVisibilityHandlers('focus');
  }

  handleBlur() {
    this.notifyVisibilityHandlers('blur');
  }

  handleFreeze() {
    this.notifyVisibilityHandlers('freeze');
  }

  handleResume() {
    this.isPageVisible = true;
    this.markPageActive();
    this.notifyVisibilityHandlers('resume');
  }

  markPageActive() {
    this.lastActiveTime = Date.now();
    localStorage.setItem('shiftsync_last_active', this.lastActiveTime.toString());
  }

  getLastActiveTime() {
    const stored = localStorage.getItem('shiftsync_last_active');
    return stored ? parseInt(stored) : Date.now();
  }

  isPageStale() {
    const lastActive = this.getLastActiveTime();
    const now = Date.now();
    // Consider page stale if it's been inactive for more than 5 minutes
    return (now - lastActive) > 5 * 60 * 1000;
  }

  addBeforeUnloadHandler(handler) {
    this.beforeUnloadHandlers.add(handler);
  }

  removeBeforeUnloadHandler(handler) {
    this.beforeUnloadHandlers.delete(handler);
  }

  addVisibilityChangeHandler(handler) {
    this.visibilityChangeHandlers.add(handler);
  }

  removeVisibilityChangeHandler(handler) {
    this.visibilityChangeHandlers.delete(handler);
  }

  notifyBeforeUnloadHandlers() {
    this.beforeUnloadHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('Error in beforeunload handler:', error);
      }
    });
  }

  notifyVisibilityHandlers(state) {
    this.visibilityChangeHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        console.error('Error in visibility change handler:', error);
      }
    });
  }

  cleanup() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.removeEventListener('focus', this.handleFocus.bind(this));
    window.removeEventListener('blur', this.handleBlur.bind(this));
    document.removeEventListener('freeze', this.handleFreeze.bind(this));
    document.removeEventListener('resume', this.handleResume.bind(this));
  }
}

// Export a singleton instance
export default new PageLifecycleManager();
