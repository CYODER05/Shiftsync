// src/utils/EventBus.js

/**
 * A simple event bus to allow communication between components
 * This helps components stay in sync when data changes
 */
class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - The event name
   * @param {function} callback - The callback function
   * @returns {function} - Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    this.events[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Publish an event
   * @param {string} event - The event name
   * @param {any} data - The data to pass to subscribers
   */
  publish(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        callback(data);
      });
    }
  }
}

// Create a singleton instance
const eventBus = new EventBus();

export default eventBus;