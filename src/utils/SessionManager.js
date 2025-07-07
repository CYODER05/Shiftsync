// SessionManager.js - Handles session timeout and auto-logout functionality
import { supabase } from '../supabaseClient';

class SessionManager {
  constructor() {
    this.SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.WARNING_TIME = 5 * 60 * 1000; // 5 minutes before logout warning
    this.timeoutId = null;
    this.warningTimeoutId = null;
    this.onLogoutCallback = null;
    this.onWarningCallback = null;
    this.lastActivity = Date.now();
    
    // Bind methods to preserve 'this' context
    this.resetTimer = this.resetTimer.bind(this);
    this.handleActivity = this.handleActivity.bind(this);
    this.logout = this.logout.bind(this);
    this.showWarning = this.showWarning.bind(this);
  }

  // Initialize session management
  init(onLogoutCallback, onWarningCallback = null) {
    this.onLogoutCallback = onLogoutCallback;
    this.onWarningCallback = onWarningCallback;
    
    // Check if there's an existing session
    const sessionStart = localStorage.getItem('sessionStart');
    const now = Date.now();
    
    if (sessionStart) {
      const elapsed = now - parseInt(sessionStart);
      if (elapsed >= this.SESSION_TIMEOUT) {
        // Session has expired
        this.logout();
        return;
      }
      // Continue with remaining time
      this.startTimer(this.SESSION_TIMEOUT - elapsed);
    } else {
      // New session
      localStorage.setItem('sessionStart', now.toString());
      this.startTimer(this.SESSION_TIMEOUT);
    }
    
    // Set up activity listeners
    this.setupActivityListeners();
  }

  // Set up event listeners for user activity
  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, this.handleActivity, true);
    });
  }

  // Handle user activity
  handleActivity() {
    const now = Date.now();
    // Only reset if it's been more than 1 minute since last activity (to avoid excessive resets)
    if (now - this.lastActivity > 60000) {
      this.lastActivity = now;
      this.resetTimer();
    }
  }

  // Start the session timer
  startTimer(duration) {
    this.clearTimers();
    
    // Set warning timer (5 minutes before logout)
    const warningTime = duration - this.WARNING_TIME;
    if (warningTime > 0) {
      this.warningTimeoutId = setTimeout(this.showWarning, warningTime);
    }
    
    // Set logout timer
    this.timeoutId = setTimeout(this.logout, duration);
  }

  // Reset the session timer (called on user activity)
  resetTimer() {
    // Update session start time
    localStorage.setItem('sessionStart', Date.now().toString());
    this.startTimer(this.SESSION_TIMEOUT);
  }

  // Show warning before logout
  showWarning() {
    if (this.onWarningCallback) {
      this.onWarningCallback();
    } else {
      // Default warning
      const shouldContinue = confirm(
        'Your session will expire in 5 minutes due to inactivity. Click OK to continue your session.'
      );
      
      if (shouldContinue) {
        this.resetTimer();
      }
    }
  }

  // Logout user
  async logout() {
    this.clearTimers();
    localStorage.removeItem('sessionStart');
    
    // Sign out from Supabase
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    
    // Call the logout callback
    if (this.onLogoutCallback) {
      this.onLogoutCallback();
    }
  }

  // Clear all timers
  clearTimers() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
  }

  // Clean up event listeners
  cleanup() {
    this.clearTimers();
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.removeEventListener(event, this.handleActivity, true);
    });
  }

  // Get remaining session time
  getRemainingTime() {
    const sessionStart = localStorage.getItem('sessionStart');
    if (!sessionStart) return 0;
    
    const elapsed = Date.now() - parseInt(sessionStart);
    return Math.max(0, this.SESSION_TIMEOUT - elapsed);
  }

  // Check if session is still valid
  isSessionValid() {
    return this.getRemainingTime() > 0;
  }
}

// Export a singleton instance
export default new SessionManager();
