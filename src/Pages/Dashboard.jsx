// src/Pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Clock from '../components/Clock';
import Display from '../components/Display';
import Keypad from '../components/Keypad';
import TimeSheet from '../components/TimeSheet';
import AdminPanel from './AdminPanel';
import UserManagement from '../components/UserManagement';
import Settings from '../components/Settings';
import KioskManagement from '../components/KioskManagement';
import TimeTracker from '../utils/TimeTracker';

const tracker = new TimeTracker();

export default function Dashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('timeTracking');
  const [userName, setUserName] = useState('');
  const [userPin, setUserPin] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [backgroundColorMode, setBackgroundColorMode] = useState('system');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [selectedTimezone, setSelectedTimezone] = useState('auto');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [systemColorMode, setSystemColorMode] = useState('light');
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  // System color mode detection effect
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      setSystemColorMode(e.matches ? 'dark' : 'light');
    };
    
    // Set initial system color mode
    setSystemColorMode(mediaQuery.matches ? 'dark' : 'light');
    
    // Listen for system theme changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        // Load user preferences from Supabase if authenticated
        if (user?.id) {
          try {
            const { data: preferences, error } = await supabase
              .from('user_preferences')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            if (!error && preferences) {
              if (preferences.time_format) setTimeFormat(preferences.time_format);
              if (preferences.timezone) setSelectedTimezone(preferences.timezone);
              if (preferences.date_format) setDateFormat(preferences.date_format);
              if (preferences.color_mode) setBackgroundColorMode(preferences.color_mode);
            }
          } catch (error) {
            console.error('Error loading user preferences:', error);
          }
        }

        // If user is authenticated with Supabase Auth
        if (user?.pin) {
          // For PIN-based login (employees)
          try {
            const userData = await tracker.getUser(user.pin);
            if (userData) {
              setUserName(userData.name || 'Employee');
              setUserPin(user.pin);
            }
          } catch (error) {
            console.error('Error fetching PIN user data:', error);
            setUserName('Employee');
            setUserPin(user.pin);
          }
        } else {
          // Default case
          setUserName('');
          setUserPin('');
        }

        await loadSessions();
        setDbError(null);
      } catch (error) {
        console.error('Error loading user data:', error);
        setDbError('Failed to load user data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    let hrs = Math.floor(totalSeconds / 3600);
    hrs = hrs < 10 ? `0${hrs}` : hrs; // Pad with leading zero if needed
    let mins = Math.floor((totalSeconds % 3600) / 60);
    mins = mins < 10 ? `0${mins}` : mins; // Pad with leading zero if needed
    let secs = totalSeconds % 60;
    secs = secs < 10 ? `0${secs}` : secs; // Pad with leading zero if needed
    return `${hrs}:${mins}:${secs}`;
  };

  // Load sessions on component mount and when needed
  const loadSessions = async () => {
    try {
      const loadedSessions = await tracker.getSessions();
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setDbError('Failed to load sessions. Please try again.');
    }
  };

  // Handle editing a session
  const handleEditSession = async (sessionId, updatedClockIn, updatedClockOut) => {
    try {
      const success = await tracker.editSession(sessionId, updatedClockIn, updatedClockOut);
      if (success) {
        await loadSessions(); // Reload sessions after edit
      }
    } catch (error) {
      console.error('Error editing session:', error);
      setDbError('Failed to edit session. Please try again.');
    }
  };

  // Handle deleting a session
  const handleDeleteSession = async (sessionId) => {
    try {
      const success = await tracker.deleteSession(sessionId);
      if (success) {
        await loadSessions(); // Reload sessions after delete
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setDbError('Failed to delete session. Please try again.');
    }
  };

  const timeTrackingBtn = () => {
    setCurrentView('timeTracking');
  };

  const usersBtn = () => {
    setCurrentView('users');
  };

  const timeSheetBtn = () => {
    setCurrentView('timeSheet');
  };

  const kioskBtn = () => {
    setCurrentView('kiosk');
  };

  const toggleBackgroundColorMode = async (mode) => {
    setBackgroundColorMode(mode);
    if (user?.id) {
      const result = await savePreferences({
        time_format: timeFormat,
        timezone: selectedTimezone,
        date_format: dateFormat,
        color_mode: mode
      });
      if (!result.success) {
        console.error('Failed to save color mode preference:', result.error);
      }
    }
  };

  // Helper function to save preferences with fallback
  const savePreferences = async (preferences) => {
    console.log('Saving preferences for user:', user.id, preferences);
    
    try {
      // First try to update existing record
      const { data: updateData, error: updateError } = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('user_id', user.id);
      
      console.log('Update result:', { updateData, updateError });
      
      if (updateError && updateError.code === 'PGRST116') {
        // No rows updated, try to insert
        console.log('No existing record found, attempting insert...');
        const { data: insertData, error: insertError } = await supabase
          .from('user_preferences')
          .insert({ ...preferences, user_id: user.id });
        
        console.log('Insert result:', { insertData, insertError });
        
        if (insertError) {
          console.error('Insert failed:', insertError);
          return { success: false, error: insertError };
        }
        
        console.log('Insert successful');
        return { success: true, data: insertData };
      } else if (updateError) {
        console.error('Update failed:', updateError);
        return { success: false, error: updateError };
      }
      
      console.log('Update successful');
      return { success: true, data: updateData };
    } catch (error) {
      console.error('Unexpected error in savePreferences:', error);
      return { success: false, error };
    }
  };

  // Time settings handlers
  const handleTimeFormatChange = async (format) => {
    setTimeFormat(format);
    if (user?.id) {
      const result = await savePreferences({
        time_format: format,
        timezone: selectedTimezone,
        date_format: dateFormat,
        color_mode: backgroundColorMode
      });
      if (!result.success) {
        console.error('Failed to save time format preference:', result.error);
      }
    }
  };

  const handleTimezoneChange = async (timezone) => {
    setSelectedTimezone(timezone);
    if (user?.id) {
      const result = await savePreferences({
        time_format: timeFormat,
        timezone: timezone,
        date_format: dateFormat,
        color_mode: backgroundColorMode
      });
      if (!result.success) {
        console.error('Failed to save timezone preference:', result.error);
      }
    }
  };

  const handleDateFormatChange = async (format) => {
    setDateFormat(format);
    if (user?.id) {
      const result = await savePreferences({
        time_format: timeFormat,
        timezone: selectedTimezone,
        date_format: format,
        color_mode: backgroundColorMode
      });
      if (!result.success) {
        console.error('Failed to save date format preference:', result.error);
      }
    }
  };

  const settingsBtn = () => {
    setCurrentView('settings');
  };

  const handleLogout = async () => {
    // If using Supabase Auth, sign out
    if (user?.id) {
      await supabase.auth.signOut();
    }
    
    // Call the logout callback
    onLogout();
  };

  // Function to navigate to PIN login screen
  const goToPinLogin = () => {
    // This will navigate back to the PIN login screen
    window.location.href = window.location.origin + '?view=pin';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  // Get the effective color mode (resolve 'system' to actual theme)
  const getEffectiveColorMode = () => {
    if (backgroundColorMode === 'system') {
      return systemColorMode;
    }
    return backgroundColorMode;
  };

  return (
    <div className={`app-container ${getEffectiveColorMode()} min-h-screen`}>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="dashboard-head sticky top-0 z-20 w-full flex justify-between items-center px-4 py-3 shadow-md">
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-200"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 className="dashboard-title font-bold text-lg md:text-xl flex-1 text-center md:absolute md:left-1/2 md:transform md:-translate-x-1/2">
            SHIFTSYNC
          </h1>
          
          <div className="flex items-center space-x-2">
            {userName && (
              <span className="hidden sm:block text-sm text-gray-700">
                Welcome, {userName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-red-600 px-3 py-1 rounded hover:bg-red-200 text-sm"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          <div className="hidden md:flex w-40 sidebar flex-col">
            <nav className="flex-1 py-4">
              <div className="space-y-1">
                <button
                  className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-200 hover:text-black ${
                    currentView === 'timeTracking' ? 'bg-gray-200' : ''
                  }`}
                  onClick={timeTrackingBtn}
                >
                  TIME TRACKING
                </button>
                <button
                  className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-200 hover:text-black ${
                    currentView === 'timeSheet' ? 'bg-gray-200' : ''
                  }`}
                  onClick={timeSheetBtn}
                >
                  TIMESHEET
                </button>
                <button
                  className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-200 hover:text-black ${
                    currentView === 'users' ? 'bg-gray-200' : ''
                  }`}
                  onClick={usersBtn}
                >
                  EMPLOYEES
                </button>
                <button
                  className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-200 hover:text-black ${
                    currentView === 'kiosk' ? 'bg-gray-200' : ''
                  }`}
                  onClick={kioskBtn}
                >
                  KIOSK
                </button>
              </div>
              <div className="mt-auto pt-4">
                <button
                  className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-200 hover:text-black ${
                    currentView === 'settings' ? 'bg-gray-200' : ''
                  }`}
                  onClick={settingsBtn}
                >
                  SETTINGS
                </button>
              </div>
            </nav>
          </div>

          {/* Mobile Navigation Overlay */}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="fixed left-0 top-0 h-full w-64 sidebar shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Navigation</h2>
                  <button
                    className="absolute top-4 right-4 p-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <nav className="p-4">
                  <div className="space-y-2">
                    <button
                      className={`w-full text-left px-4 py-3 rounded-md hover:bg-gray-200 hover:text-black ${
                        currentView === 'timeTracking' ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => {
                        timeTrackingBtn();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      TIME TRACKING
                    </button>
                    <button
                      className={`w-full text-left px-4 py-3 rounded-md hover:bg-gray-200 hover:text-black ${
                        currentView === 'timeSheet' ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => {
                        timeSheetBtn();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      TIMESHEET
                    </button>
                    <button
                      className={`w-full text-left px-4 py-3 rounded-md hover:bg-gray-200 hover:text-black ${
                        currentView === 'users' ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => {
                        usersBtn();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      EMPLOYEES
                    </button>
                    <button
                      className={`w-full text-left px-4 py-3 rounded-md hover:bg-gray-200 hover:text-black ${
                        currentView === 'kiosk' ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => {
                        kioskBtn();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      KIOSK
                    </button>
                    <button
                      className={`w-full text-left px-4 py-3 rounded-md hover:bg-gray-200 hover:text-black ${
                        currentView === 'settings' ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => {
                        settingsBtn();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      SETTINGS
                    </button>
                  </div>
                </nav>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            {currentView === 'timeTracking' && (
              <AdminPanel 
                timeFormat={timeFormat}
                selectedTimezone={selectedTimezone}
                dateFormat={dateFormat}
              />
            )}
            {currentView === 'users' && <UserManagement />}
            {currentView === 'timeSheet' && (
              <TimeSheet
                sessions={sessions}
                formatDuration={formatDuration}
                onEditSession={handleEditSession}
                onDeleteSession={handleDeleteSession}
                tracker={tracker}
                timeFormat={timeFormat}
                selectedTimezone={selectedTimezone}
                dateFormat={dateFormat}
              />
            )}
            {currentView === 'kiosk' && <KioskManagement />}
            {currentView === 'settings' && (
              <Settings
                backgroundColorMode={backgroundColorMode}
                toggleBackgroundColorMode={toggleBackgroundColorMode}
                timeFormat={timeFormat}
                selectedTimezone={selectedTimezone}
                dateFormat={dateFormat}
                onTimeFormatChange={handleTimeFormatChange}
                onTimezoneChange={handleTimezoneChange}
                onDateFormatChange={handleDateFormatChange}
              />
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
