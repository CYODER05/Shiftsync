// src/utils/TimeTracker.js
import { supabase } from '../supabaseClient';
import eventBus from './EventBus';

export default class TimeTracker {
  constructor() {
    this.validPins = new Map();
    this.sessions = [];
    this.activeSessions = new Map();
    this.hourlyRates = new Map(); // Current hourly rates map
    this.hourlyRateHistory = new Map(); // History of hourly rate changes
    this.roles = new Map(); // Added roles map
    this.isInitialized = false;
    this.loadData();
  }

  async initializeDatabase() {
    try {
      // Database initialization is now handled by the database schema
      // No need to create default users here
      console.log("Database initialization complete");
    } catch (error) {
      console.error("Error in initializeDatabase:", error);
    }
  }

  async clockIn(pin) {
    try {
      console.log(`Attempting to clock in user ${pin}`);
      
      // First check if the user is already clocked in
      const alreadyClocked = await this.isClockedIn(pin);
      if (alreadyClocked) {
        console.log(`User ${pin} is already clocked in`);
        return false;
      }
      
      const clockIn = new Date().toISOString();
      console.log(`Clock in time: ${clockIn}`);
      
      // Check if active_sessions table exists
      const { error: checkError } = await supabase
        .from('active_sessions')
        .select('count')
        .limit(1);
      
      if (checkError) {
        console.log("Active sessions table might not exist yet:", checkError.message);
      }
      
      // Insert using user_id column
      console.log("Inserting active session with user_id column");
      const { error } = await supabase
        .from('active_sessions')
        .insert({ user_pin: pin, clock_in: clockIn });
      
      if (error) {
        console.error("Error inserting active session:", error);
        return false;
      }
      
      console.log(`Successfully clocked in user ${pin}`);
      
      // Update local cache
      this.activeSessions.set(pin, clockIn);
      
      return true;
    } catch (error) {
      console.error("Error in clockIn:", error);
      return false;
    }
  }

  async clockOut(pin) {
    try {
      console.log(`Attempting to clock out user ${pin}`);
      
      // First check if the user is actually clocked in
      const isClocked = await this.isClockedIn(pin);
      if (!isClocked) {
        console.log(`User ${pin} is not clocked in, cannot clock out`);
        return null;
      }
      
      // Get the clock in time from local cache or database
      let clockIn = this.activeSessions.get(pin);
      
      if (!clockIn) {
        console.log("Clock in time not found in local cache, checking database");
        // Try to get from database if not in local cache
        const { data, error } = await supabase
          .from('active_sessions')
          .select('clock_in')
          .eq('user_pin', pin)
  ;
        
        if (error || !data) {
          console.error("Error getting clock in time from database:", error);
          return null;
        }
        
        clockIn = data.clock_in;
        console.log(`Found clock in time in database: ${clockIn}`);
      } else {
        console.log(`Found clock in time in local cache: ${clockIn}`);
      }

      const clockOut = new Date().toISOString();
      console.log(`Clock out time: ${clockOut}`);
      
      // Check if sessions table exists
      const { error: checkError } = await supabase
        .from('sessions')
        .select('count')
        .limit(1);
      
      if (checkError) {
        console.log("Sessions table might not exist yet:", checkError.message);
      }
      
      // Create a new session record
      console.log("Creating session record with user_pin");
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({ 
          user_pin: pin, 
          clock_in: clockIn, 
          clock_out: clockOut,
          duration: new Date(clockOut) - new Date(clockIn) // Calculate duration in milliseconds
        });
      
      if (sessionError) {
        console.error("Error creating session record:", sessionError);
        return null;
      }
      
      console.log("Session record created successfully");
      
      // Remove from active sessions
      console.log("Removing active session with user_id");
      const { error: deleteError } = await supabase
        .from('active_sessions')
        .delete()
        .eq('user_pin', pin);
      
      if (deleteError) {
        console.error("Error removing active session:", deleteError);
        // Continue anyway since we've already created the session record
      } else {
        console.log("Active session removed successfully");
      }
      
      // Update local cache
      this.activeSessions.delete(pin);
      
      // Add to local sessions cache
      const session = { pin, clockIn, clockOut };
      this.sessions.push(session);
      
      console.log(`Successfully clocked out user ${pin}`);
      return session;
    } catch (error) {
      console.error("Error in clockOut:", error);
      return null;
    }
  }

  async isClockedIn(pin) {
    // Check local cache first for performance
    if (this.activeSessions.has(pin)) {
      console.log(`User ${pin} is clocked in according to local cache`);
      return true;
    }
    
    // If not in cache, check database
    try {
      console.log(`Checking if user ${pin} is clocked in using user_id column`);
      
      // Check if active_sessions table exists
      const { error: checkError } = await supabase
        .from('active_sessions')
        .select('count')
        .limit(1);
      
      if (checkError) {
        console.log("Active sessions table might not exist yet:", checkError.message);
        return false;
      }
      
      // Query using user_id column
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('user_pin', pin);
      
      if (error) {
        console.error("Error checking if user is clocked in:", error);
        return false;
      }
      
      const isClocked = data && data.length > 0;
      console.log(`User ${pin} clocked in status from DB:`, isClocked);
      
      // Update local cache if user is clocked in
      if (isClocked && data[0].clock_in) {
        this.activeSessions.set(pin, data[0].clock_in);
      }
      
      return isClocked;
    } catch (error) {
      console.error("Error in isClockedIn:", error);
      return false;
    }
  }

  getUser(pin) {
    return this.validPins.get(pin);
  }

  async getUserFromDB(pin) {
    try {
      const { data } = await supabase
        .from('users')
        .select('name')
        .eq('pin', pin)
        .single();
      
      return data ? data.name : null;
    } catch (error) {
      console.error("Error in getUserFromDB:", error);
      return null;
    }
  }

  async loadData() {
    try {
      // Initialize database tables if needed
      if (!this.isInitialized) {
        await this.initializeDatabase();
        this.isInitialized = true;
      }
      
      // Load users
      try {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*');
        
        if (usersError) {
          console.error("Error loading users:", usersError);
        } else if (users) {
          this.validPins = new Map(users.map(u => [u.pin, u.name]));
          this.hourlyRates = new Map(users.map(u => [u.pin, u.current_hourly_rate]));
          this.roles = new Map(users.map(u => [u.pin, u.role || ""]));
        }
      } catch (userError) {
        console.error("Exception loading users:", userError);
      }
      
      // Load active sessions
      try {
        const { data: activeSessions, error: activeSessionsError } = await supabase
          .from('active_sessions')
          .select('*');
        
        if (activeSessionsError) {
          console.error("Error loading active sessions:", activeSessionsError);
        } else if (activeSessions && activeSessions.length > 0) {
          // Map using user_id instead of user_pin
          this.activeSessions = new Map(
            activeSessions
              .filter(s => s.user_pin) // Only include sessions with user_pin
              .map(s => [s.user_pin, s.clock_in])
          );
          console.log(`Loaded ${this.activeSessions.size} active sessions into cache`);
        }
      } catch (activeSessionError) {
        console.error("Exception loading active sessions:", activeSessionError);
      }
      
      // Load recent sessions (last 30 days for performance)
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: recentSessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .gte('clock_in', thirtyDaysAgo.toISOString())
          .order('clock_in', { ascending: false });
        
        if (sessionsError) {
          console.error("Error loading sessions:", sessionsError);
        } else if (recentSessions) {
          this.sessions = recentSessions.map(s => ({
            pin: s.user_pin,
            clockIn: s.clock_in,
            clockOut: s.clock_out,
            id: s.id
          }));
        }
      } catch (sessionsError) {
        console.error("Exception loading sessions:", sessionsError);
      }
      
      // Load hourly rate history
      try {
        const { data: rateHistory, error: rateHistoryError } = await supabase
          .from('hourly_rate_history')
          .select('*')
          .order('effective_from', { ascending: true });
        
        if (rateHistoryError) {
          console.error("Error loading hourly rate history:", rateHistoryError);
        } else if (rateHistory) {
          // Group rate history by user pin
          const historyByPin = {};
          rateHistory.forEach(entry => {
            if (!historyByPin[entry.user_pin]) {
              historyByPin[entry.user_pin] = [];
            }
            historyByPin[entry.user_pin].push({
              rate: entry.rate,
              timestamp: entry.effective_from
            });
          });
          
          this.hourlyRateHistory = new Map(Object.entries(historyByPin));
        }
      } catch (rateHistoryError) {
        console.error("Exception loading hourly rate history:", rateHistoryError);
      }
      
      return true;
    } catch (error) {
      console.error("Error in loadData:", error);
      // Don't throw the error, just return false to indicate failure
      return false;
    }
  }

  async getSessions(startDate, endDate) {
    try {
      // First, check if the sessions table exists by trying a simple query
      const { error: checkError } = await supabase
        .from('sessions')
        .select('count')
        .limit(1);
      
      // If we get an error, the table might not exist yet
      if (checkError) {
        console.log("Sessions table might not exist yet:", checkError.message);
        // Return an empty array since there are no sessions yet
        return [];
      }
      
      // If the table exists, proceed with the query
      let query = supabase.from('sessions').select('*');
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        query = query
          .gte('clock_in', start.toISOString())
          .lte('clock_in', end.toISOString());
      }
      
      const { data, error } = await query.order('clock_in', { ascending: false });
      
      if (error) {
        console.error("Error fetching sessions:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Transform the data to match the expected format
      // We need to get the user names separately since we're not using a join
      const result = [];
      
      for (const session of data) {
        // Get the user name for this session
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('pin', session.user_pin)
          .single();
        
        result.push({
          id: session.id,
          name: userData?.name || 'Unknown User',
          pin: session.user_pin,
          clockIn: session.clock_in,
          clockOut: session.clock_out,
          duration: session.duration
        });
      }
      
      return result;
    } catch (error) {
      console.error("Error in getSessions:", error);
      // Return an empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  async editSession(sessionId, updatedClockIn, updatedClockOut) {
    try {
      // Calculate new duration
      const duration = new Date(updatedClockOut) - new Date(updatedClockIn);
      
      // Update in database
      const { error } = await supabase
        .from('sessions')
        .update({
          clock_in: updatedClockIn,
          clock_out: updatedClockOut,
          duration: duration
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      // Update local cache if it exists
      const localIndex = this.sessions.findIndex(s => s.id === sessionId);
      if (localIndex >= 0) {
        this.sessions[localIndex] = {
          ...this.sessions[localIndex],
          clockIn: updatedClockIn,
          clockOut: updatedClockOut
        };
      }
      
      return true;
    } catch (error) {
      console.error("Error in editSession:", error);
      throw error;
    }
  }
  
  async deleteSession(sessionId) {
    try {
      // Delete from database
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      
      // Remove from local cache if it exists
      const localIndex = this.sessions.findIndex(s => s.id === sessionId);
      if (localIndex >= 0) {
        this.sessions.splice(localIndex, 1);
      }
      
      return true;
    } catch (error) {
      console.error("Error in deleteSession:", error);
      throw error;
    }
  }

  async getActiveSessions() {
    try {
      // First, check if the active_sessions table exists by trying a simple query
      const { error: checkError } = await supabase
        .from('active_sessions')
        .select('count')
        .limit(1);
      
      // If we get an error, the table might not exist yet
      if (checkError) {
        console.log("Active sessions table might not exist yet:", checkError.message);
        // Return an empty array since there are no active sessions yet
        return [];
      }
      
      // If the table exists, proceed with the query
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*');
      
      if (error) {
        console.error("Error fetching active sessions:", error);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Transform the data to match the expected format
      // We need to get the user names separately since we're not using a join
      const result = [];
      
      for (const session of data) {
        // Get the user ID from the session
        const userPin = session.user_pin;
        
        if (!userPin) {
          console.log("Session missing user_pin:", session);
          continue;
        }
        
        // Get the user name for this session
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('pin', userPin)
          .single();
        
        result.push({
          name: userData?.name || 'Unknown User',
          pin: userPin,
          clockIn: session.clock_in
        });
      }
      
      return result;
    } catch (error) {
      console.error("Error in getActiveSessions:", error);
      // Return an empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  async addUser(pin, name, hourlyRate, role = "") {
    try {
      if (!pin || !name) return false;
      
      // Check if user already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('pin')
        .eq('pin', pin)
        .single();
      
      // If there's an error other than no rows found, return false
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing user:', checkError);
        return false;
      }
      
      // If user already exists, return false
      if (existingUsers && existingUsers.length > 0) {
        console.log('User with PIN', pin, 'already exists');
        return false;
      }
      
      const rate = hourlyRate || 0;
      const timestamp = new Date().toISOString();
      
      // Add user to database
      const { error: userError } = await supabase
        .from('users')
        .insert({
          pin,
          name,
          current_hourly_rate: rate,
          role
        });
      
      if (userError) throw userError;
      
      // Add initial hourly rate history
      const { error: rateError } = await supabase
        .from('hourly_rate_history')
        .insert({
          user_pin: pin,
          rate,
          effective_from: timestamp
        });
      
      if (rateError) throw rateError;
      
      // Update local cache
      this.validPins.set(pin, name);
      this.hourlyRates.set(pin, rate);
      this.roles.set(pin, role);
      this.hourlyRateHistory.set(pin, [{ rate, timestamp }]);
      
      // Notify all components that a new user has been added
      eventBus.publish('user-added', { pin });
      
      return true;
    } catch (error) {
      console.error("Error in addUser:", error);
      return false;
    }
  }

  async deleteUser(pin) {
    try {
      if (!this.validPins.has(pin)) return false;
      
      // Delete user from database
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('pin', pin);
      
      if (error) throw error;
      
      // Update local cache
      this.validPins.delete(pin);
      this.hourlyRates.delete(pin);
      this.roles.delete(pin);
      this.hourlyRateHistory.delete(pin);
      
      // Notify all components that a user has been deleted
      eventBus.publish('user-deleted', { pin });
      
      return true;
    } catch (error) {
      console.error("Error in deleteUser:", error);
      return false;
    }
  }

  async updateUser(oldPin, name, pin, hourlyRate, role = "", applyToAllEntries = false) {
    try {
      if (!oldPin || !name || !pin) return false;
      
      // Check if new PIN already exists (if changing PIN)
      if (oldPin !== pin) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('pin')
          .eq('pin', pin)
          .single();
        
        if (existingUser) return false;
      }
      
      const newHourlyRate = hourlyRate || 0;
      const currentTimestamp = new Date().toISOString();
      
      // If the PIN hasn't changed
      if (oldPin === pin) {
        // Get the current hourly rate from database
        const { data: userData } = await supabase
          .from('users')
          .select('current_hourly_rate')
          .eq('pin', pin)
          .single();
        
        const currentRate = userData?.current_hourly_rate || 0;
        
        // Only update the rate history if the rate has changed
        if (currentRate !== newHourlyRate) {
          if (applyToAllEntries) {
            // If applying to all entries, replace the entire history
            
            // First, delete all existing history
            await supabase
              .from('hourly_rate_history')
              .delete()
              .eq('user_pin', pin);
            
            // Add a new entry from the beginning of time
            await supabase
              .from('hourly_rate_history')
              .insert({
                user_pin: pin,
                rate: newHourlyRate,
                effective_from: new Date(0).toISOString()
              });
          } else {
            // Otherwise, add a new entry to the history
            await supabase
              .from('hourly_rate_history')
              .insert({
                user_pin: pin,
                rate: newHourlyRate,
                effective_from: currentTimestamp
              });
          }
        }
        
        // Update the user record
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name,
            current_hourly_rate: newHourlyRate,
            role
          })
          .eq('pin', pin);
        
        if (updateError) throw updateError;
      } else {
        // If the PIN is changing
        
        if (applyToAllEntries) {
          // If applying to all entries, update all sessions with the new PIN
          const { error: sessionUpdateError } = await supabase
            .from('sessions')
            .update({ user_pin: pin })
            .eq('user_pin', oldPin);
          
          if (sessionUpdateError) throw sessionUpdateError;
          
          // Update active sessions if any
          const { error: activeSessionUpdateError } = await supabase
            .from('active_sessions')
            .update({ user_pin: pin })
            .eq('user_pin', oldPin);
          
          if (activeSessionUpdateError && activeSessionUpdateError.code !== 'PGRST116') {
            // Ignore if no active sessions found
            throw activeSessionUpdateError;
          }
          
          // Delete all existing rate history for the old PIN
          await supabase
            .from('hourly_rate_history')
            .delete()
            .eq('user_pin', oldPin);
          
          // Add a new entry for the new PIN from the beginning of time
          await supabase
            .from('hourly_rate_history')
            .insert({
              user_pin: pin,
              rate: newHourlyRate,
              effective_from: new Date(0).toISOString()
            });
        } else {
          // If not applying to all entries, create a new user with the new PIN
          
          // Add the new user
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              pin,
              name,
              current_hourly_rate: newHourlyRate,
              role
            });
          
          if (insertError) throw insertError;
          
          // Add initial hourly rate history for the new PIN
          await supabase
            .from('hourly_rate_history')
            .insert({
              user_pin: pin,
              rate: newHourlyRate,
              effective_from: currentTimestamp
            });
          
          // Delete the old user
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('pin', oldPin);
          
          if (deleteError) throw deleteError;
        }
      }
      
      // Update local cache
      if (oldPin !== pin) {
        this.validPins.delete(oldPin);
        this.hourlyRates.delete(oldPin);
        this.roles.delete(oldPin);
        
        if (!applyToAllEntries) {
          this.hourlyRateHistory.delete(oldPin);
        }
        
        // Update sessions in local cache if applying to all entries
        if (applyToAllEntries) {
          this.sessions = this.sessions.map(session => {
            if (session.pin === oldPin) {
              return { ...session, pin };
            }
            return session;
          });
        }
      }
      
      this.validPins.set(pin, name);
      this.hourlyRates.set(pin, newHourlyRate);
      this.roles.set(pin, role);
      
      // Update hourly rate history in local cache
      if (oldPin === pin) {
        let history = this.hourlyRateHistory.get(pin) || [];
        
        if (applyToAllEntries) {
          history = [{ rate: newHourlyRate, timestamp: new Date(0).toISOString() }];
        } else {
          history.push({ rate: newHourlyRate, timestamp: currentTimestamp });
        }
        
        this.hourlyRateHistory.set(pin, history);
      } else if (applyToAllEntries) {
        this.hourlyRateHistory.set(pin, [{ rate: newHourlyRate, timestamp: new Date(0).toISOString() }]);
      } else {
        this.hourlyRateHistory.set(pin, [{ rate: newHourlyRate, timestamp: currentTimestamp }]);
      }
      
      // Notify all components that user data has changed
      eventBus.publish('user-updated', { pin, oldPin });
      
      return true;
    } catch (error) {
      console.error("Error in updateUser:", error);
      return false;
    }
  }

  async getUsers() {
    try {
      // First, check if the users table exists by trying a simple query
      const { error: checkError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      // If we get an error, the table might not exist yet
      if (checkError) {
        console.log("Users table might not exist yet:", checkError.message);
        // Return an empty array since there are no users yet
        return [];
      }
      
      // If the table exists, proceed with the query
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
      
      if (error) {
        console.error("Error fetching users:", error);
        return []; // Return empty array on error
      }
      
      if (!data || data.length === 0) {
        console.log("No users found in database");
        return [];
      }
      
      console.log("Users found:", data.length);
      
      return data.map(user => ({
        pin: user.pin,
        name: user.name,
        role: user.role || ""
      }));
    } catch (error) {
      console.error("Error in getUsers:", error);
      return []; // Return empty array on error
    }
  }

  getRole(pin) {
    return this.roles.get(pin) || "";
  }

  async getHourlyRate(pin, timestamp = null) {
    try {
      // If no timestamp is provided, return the current rate from database
      if (!timestamp) {
        const { data, error } = await supabase
          .from('users')
          .select('current_hourly_rate')
          .eq('pin', pin)
          .single();
        
        if (error) throw error;
        
        return data?.current_hourly_rate || 0;
      }
      
      // Convert the timestamp to a Date object if it's a string
      const targetTime = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const targetTimeISO = targetTime.toISOString();
      
      // Find the most recent rate change before the target timestamp
      const { data, error } = await supabase
        .from('hourly_rate_history')
        .select('rate')
        .eq('user_pin', pin)
        .lte('effective_from', targetTimeISO)
        .order('effective_from', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      return data && data.length > 0 ? data[0].rate : 0;
    } catch (error) {
      console.error("Error in getHourlyRate:", error);
      throw error;
    }
  }

}
