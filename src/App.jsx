// src/App.jsx
import { useState, useEffect } from "react";
import Clock from "./components/Clock";
import Display from "./components/Display";
import Message from "./components/Message";
import Keypad from "./components/Keypad";
import TimeTracker from "./utils/TimeTracker";
import AdminPanel from "./Pages/AdminPanel";
import UserManagement from "./components/UserManagement";
import TimeSheet from "./components/TimeSheet"; // Import the TimeSheet component
import Settings from "./components/Settings"; // Import the Settings component
import { supabase } from "./supabaseClient";
import LandingPage from "./Pages/LandingPage";
import LoginPage from "./Pages/LoginPage";
import SignupPage from "./Pages/SignupPage";
import Dashboard from "./Pages/Dashboard";

const tracker = new TimeTracker();

export default function App() {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [currentView, setCurrentView] = useState("timeTracking"); // State to manage the current view
  const [backgroundColorMode, setBackgroundColorMode] = useState("light"); // Default to light mode
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // State to manage settings menu visibility
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  // Authentication states
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("landing"); // landing, login, signup, dashboard, pin, kiosk
  const [kioskData, setKioskData] = useState(null);
  
  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        // Check URL parameters for direct navigation
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        const kioskParam = urlParams.get('kiosk');
        
        // Check for kiosk URL parameter - this takes priority over everything else
        if (kioskParam) {
          try {
            // Load kiosk data from database
            const { data: kiosk, error } = await supabase
              .from('kiosks')
              .select('*')
              .eq('id', kioskParam)
              .eq('is_active', true)
              .single();
            
            if (error || !kiosk) {
              console.error('Kiosk not found or inactive:', error);
              setAuthView('landing');
            } else {
              setKioskData(kiosk);
              setAuthView('kiosk');
            }
          } catch (error) {
            console.error('Error loading kiosk:', error);
            setAuthView('landing');
          }
          setIsLoading(false);
          return;
        }
        
        if (viewParam === 'pin') {
          setAuthView('pin');
          setIsLoading(false);
          return;
        }
        
        // Check if user is already signed in with Supabase Auth
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          setAuthView("dashboard");
        } else {
          // If no Supabase Auth session, show landing page
          setAuthView("landing");
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
    
    // Set up auth state change listener - but don't override kiosk mode
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Don't change auth view if we're in kiosk mode
        const urlParams = new URLSearchParams(window.location.search);
        const kioskParam = urlParams.get('kiosk');
        
        if (kioskParam) {
          return; // Stay in kiosk mode regardless of auth changes
        }
        
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          setAuthView("dashboard");
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setAuthView("landing");
        }
      }
    );
    
    // Cleanup subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
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

  // Navigation handlers
  const goToLogin = () => {
    setAuthView("login");
  };

  const goToSignup = () => {
    setAuthView("signup");
  };

  const goToLanding = () => {
    setAuthView("landing");
  };

  const goToPinLogin = () => {
    setAuthView("pin");
    setInput("");
    setMessage("");
  };

  const handleLogout = () => {
    setUser(null);
    setAuthView("landing");
    setCurrentView("timeTracking"); // Reset view on logout
  };

  // Handle PIN-based login
  const handlePinLogin = async (pin, kioskId = null) => {
    try {
      
      // Get user name
      const userName = await tracker.getUser(pin);
      
      if (!userName) {
        setMessage("Invalid PIN");
        setTimeout(() => setMessage(""), 3000);
        return;
      }
      
      // Check if user is already clocked in
      const isClocked = await tracker.isClockedIn(pin);
      
      if (isClocked) {
        // Clock out the user
        const session = await tracker.clockOut(pin, kioskId);
        if (session) {
          setMessage(`${userName.name || userName} has been clocked out.`);
        } else {
          setMessage("Error clocking out. Please try again.");
        }
      } else {
        // Clock in the user
        const success = await tracker.clockIn(pin, kioskId);
        if (success) {
          setMessage(`${userName.name || userName} has been clocked in.`);
        } else {
          setMessage("Error clocking in. Please try again.");
        }
      }
      
      // Clear the message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
      
    } catch (error) {
      console.error("Error in handlePinLogin:", error);
      setMessage("Error processing request. Please try again.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Handle keypad input for PIN login screen
  const handleKeyPress = (key) => {
    if (key === "C") return setInput("");
    if (key === "←") return setInput((prev) => prev.slice(0, -1));
    setInput((prev) => (prev + key).slice(0, 4));
  };

  // Handle PIN submission from keypad
  const handleSubmit = async () => {
    const pin = input;
    const kioskId = kioskData ? kioskData.id : null;
    await handlePinLogin(pin, kioskId);
    setInput("");
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 w-full h-full bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8 text-white tracking-wider">SHIFTSYNC</h1>
          <div className="w-12 h-12 border-t-3 border-white border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Render different views based on authView state
  return (
    <div className={`app-container ${backgroundColorMode}`}>
      {authView === "landing" && (
        <LandingPage onLogin={goToLogin} onSignup={goToSignup} />
      )}
      
      {authView === "login" && (
        <LoginPage 
          onBack={goToLanding} 
          onLoginSuccess={(user) => {
            setUser(user);
            setAuthView("dashboard");
          }}
          onPinLogin={goToPinLogin}
        />
      )}
      
      {authView === "signup" && (
        <SignupPage 
          onBack={goToLanding} 
          onSignupSuccess={(user) => {
            setUser(user);
            setAuthView("dashboard");
          }}
        />
      )}
      
      {authView === "pin" && (
        <div className="flex flex-col items-center justify-center space-y-4 min-h-screen bg-gray-50">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold mb-2">SHIFTSYNC</h1>
            <p className="text-xl text-gray-600">Enter PIN to Continue</p>
          </div>
          <Clock />
          <Display input={input} />
          <Keypad onKeyPress={handleKeyPress} onSubmit={handleSubmit} />
          <Message text={message} />
          <button
            onClick={goToLanding}
            className="mt-4 text-blue-600 hover:text-blue-500"
          >
            ← Back to Home
          </button>
        </div>
      )}
      
      {authView === "kiosk" && kioskData && (
        <div className="flex flex-col items-center justify-center space-y-4 min-h-screen bg-gray-50">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold mb-2">SHIFTSYNC</h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">{kioskData.name}</h2>
            {kioskData.location && (
              <p className="text-lg text-gray-600 mb-2">{kioskData.location}</p>
            )}
            <p className="text-xl text-gray-600">Enter PIN to Continue</p>
            {kioskData.description && (
              <p className="text-sm text-gray-500 mt-2">{kioskData.description}</p>
            )}
          </div>
          <Clock />
          <Display input={input} />
          <Keypad onKeyPress={handleKeyPress} onSubmit={handleSubmit} />
          <Message text={message} />
        </div>
      )}
      
      {authView === "dashboard" && (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
