// src/Pages/Dashboard.jsx
import { useState, useEffect, useRef } from 'react';
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
import SessionManager from '../utils/SessionManager';
import ComponentStateManager from '../utils/ComponentStateManager';

const tracker = new TimeTracker();

export default function Dashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('timeTracking');
  const [userName, setUserName] = useState('');
  const [userPin, setUserPin] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [backgroundColorMode, setBackgroundColorMode] = useState('light');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [selectedTimezone, setSelectedTimezone] = useState('auto');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  
  // Refs to maintain component instances and prevent reloading
  const adminPanelRef = useRef(null);
  const userManagementRef = useRef(null);
  const timeSheetRef = useRef(null);
  const kioskManagementRef = useRef(null);
  const settingsRef = useRef(null);

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

  // Initialize session management
  useEffect(() => {
    const handleSessionWarning = () => {
      setShowSessionWarning(true);
    };

    const handleSessionLogout = () => {
      // Clean up component states
      ComponentStateManager.clearAllStates();
      handleLogout();
    };

    // Initialize session manager
    SessionManager.init(handleSessionLogout, handleSessionWarning);

    // Cleanup on unmount
    return () => {
      SessionManager.cleanup();
    };
  }, []);

  // Save component state when switching views
  useEffect(() => {
    // Save current view state when it changes
    ComponentStateManager.saveState('dashboard', { currentView });
  }, [currentView]);

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

  const toggleBackgroundColorMode = (mode) => {
    setBackgroundColorMode(mode);
  };

  // Helper function to save preferences with fallback
  const savePreferences = async (preferences) => {
    try {
      // First try to update existing record
      const { data: updateData, error: updateError } = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('user_id', user.id);
      
      if (updateError && updateError.code === 'PGRST116') {
        // No rows updated, try to insert
        const { data: insertData, error: insertError } = await supabase
          .from('user_preferences')
          .insert({ ...preferences, user_id: user.id });
        
        if (insertError) {
          return { success: false, error: insertError };
        }
        
        return { success: true, data: insertData };
      } else if (updateError) {
        return { success: false, error: updateError };
      }
      
      return { success: true, data: updateData };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Time settings handlers
  const handleTimeFormatChange = async (format) => {
    setTimeFormat(format);
    if (user?.id) {
      await savePreferences({
        time_format: format,
        timezone: selectedTimezone,
        date_format: dateFormat
      });
    }
  };

  const handleTimezoneChange = async (timezone) => {
    setSelectedTimezone(timezone);
    if (user?.id) {
      await savePreferences({
        time_format: timeFormat,
        timezone: timezone,
        date_format: dateFormat
      });
    }
  };

  const handleDateFormatChange = async (format) => {
    setDateFormat(format);
    if (user?.id) {
      await savePreferences({
        time_format: timeFormat,
        timezone: selectedTimezone,
        date_format: format
      });
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

  return (
    <div className={`app-container ${backgroundColorMode} min-h-screen`}>
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
                key="admin-panel"
                timeFormat={timeFormat}
                selectedTimezone={selectedTimezone}
                dateFormat={dateFormat}
              />
            )}
            {currentView === 'users' && <UserManagement key="user-management" />}
            {currentView === 'timeSheet' && (
              <TimeSheet
                key="time-sheet"
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
            {currentView === 'kiosk' && <KioskManagement key="kiosk-management" />}
            {currentView === 'settings' && (
              <Settings
                key="settings"
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

      {/* Session Warning Modal */}
      {showSessionWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Session Expiring Soon</h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                Your session will expire in 5 minutes due to inactivity. Would you like to continue your session?
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSessionWarning(false);
                  handleLogout();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Log Out Now
              </button>
              <button
                onClick={() => {
                  setShowSessionWarning(false);
                  SessionManager.resetTimer();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
