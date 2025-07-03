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
import TimeTracker from '../utils/TimeTracker';

const tracker = new TimeTracker();

export default function Dashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('timeTracking');
  const [userName, setUserName] = useState('');
  const [userPin, setUserPin] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backgroundColorMode, setBackgroundColorMode] = useState('light');
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      try {
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

  const toggleBackgroundColorMode = (mode) => {
    setBackgroundColorMode(mode);
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
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
    <div className={`app-container ${backgroundColorMode}`}>
      <div className="w-screen h-[100%] flex flex-col align-center">
        <div className="dashboard-head sticky top-0 z-10 w-screen flex justify-between items-center pr-[4rem] pt-[1rem] pb-[1rem] bg-[#c7c4bc]">
          <h1 className="dashboard-title font-bold absolute left-[50%] translate-x-[-50%]">
            SHIFTSYNC
          </h1>
          <div className="ml-auto flex items-center">
            {userName && (
              <span className="mr-4 text-gray-700">
                Welcome, {userName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-red-600 rounded hover:bg-red-200"
            >
              Log Out
            </button>
          </div>
        </div>
        <div className="flex h-[100%]">
          <div className="w-[10rem] bg-[#c7c4bc] sidebar">
            <div className="fixed text-center w-[10rem] h-[100%] grid grid-flow-col grid-rows-18">
              <div
                className={`cursor-pointer hover:bg-gray-200 hover:text-black flex items-center justify-center ${
                  currentView === 'timeTracking' ? 'bg-gray-200' : ''
                }`}
                onClick={timeTrackingBtn}
              >
                TIME TRACKING
              </div>
              <div
                className={`cursor-pointer hover:bg-gray-200 hover:text-black flex items-center justify-center ${
                  currentView === 'timeSheet' ? 'bg-gray-200' : ''
                }`}
                onClick={timeSheetBtn}
              >
                TIMESHEET
              </div>
                <div
                  className={`cursor-pointer hover:bg-gray-200 hover:text-black flex items-center justify-center ${
                    currentView === 'users' ? 'bg-gray-200' : ''
                  }`}
                  onClick={usersBtn}
                >
                  EMPLOYEES
                </div>
                <div
                  className={`cursor-pointer hover:bg-gray-200 hover:text-black flex items-center justify-center ${
                    currentView === 'kiosk' ? 'bg-gray-200' : ''
                  }`}
                  onClick={kioskBtn}
                >
                  KIOSK
                </div>
              <div
                className={`cursor-pointer hover:bg-gray-200 hover:text-black flex items-center justify-center row-[16] ${
                  isSettingsOpen ? 'bg-gray-200' : ''
                }`}
                onClick={openSettings}
              >
                SETTINGS
              </div>
            </div>
          </div>
          {/* Render content based on currentView */}
          {currentView === 'timeTracking' && <AdminPanel />}
          {currentView === 'users' && <UserManagement />}
          {currentView === 'timeSheet' && (
            <TimeSheet
              sessions={sessions}
              formatDuration={formatDuration}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteSession}
              tracker={tracker}
            />
          )}
          {currentView === 'kiosk' && (
            <div className="w-[80%] ml-auto mr-auto pt-[40px] pb-[40px] block">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-8">Employee Kiosk Access</h2>
                <p className="text-lg mb-8 text-gray-600">
                  Use this link to access the employee time tracking keypad
                </p>
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
                  <h3 className="text-xl font-semibold mb-4">Keypad Access</h3>
                  <p className="mb-6 text-gray-700">
                    Click the button below to open the employee keypad for clocking in and out.
                  </p>
                  <button
                    onClick={goToPinLogin}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
                  >
                    Open Employee Keypad
                  </button>
                </div>
                <div className="mt-8 text-sm text-gray-500">
                  <p>This will open the PIN entry screen where employees can clock in and out.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Menu */}
      {isSettingsOpen && (
        <div className="settings-overlay">
          <Settings
            backgroundColorMode={backgroundColorMode}
            toggleBackgroundColorMode={toggleBackgroundColorMode}
          />
          <button
            onClick={closeSettings}
            className={`mt-4 ${
              backgroundColorMode === 'dark'
                ? 'bg-[#0a1c2e] hover:bg-[#163452]'
                : 'bg-[#f0f0f0] hover:bg-[#e0e0e0]'
            }`}
          >
            Close Settings
          </button>
        </div>
      )}
    </div>
  );
}
