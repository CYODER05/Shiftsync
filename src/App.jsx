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
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState("timeTracking"); // State to manage the current view
  const [backgroundColorMode, setBackgroundColorMode] = useState("light"); // Default to light mode
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // State to manage settings menu visibility
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  // Authentication states
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("landing"); // landing, login, signup, dashboard, pin
  
  // Check for existing session on app load
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        // Check URL parameters for direct navigation
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        
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
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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
    setIsAdmin(false);
    setUser(null);
    setAuthView("landing");
    setCurrentView("timeTracking"); // Reset view on logout
  };

  // Handle PIN-based login
  const handlePinLogin = async (pin) => {
    try {
      // Check if admin
      if (tracker.isAdmin(pin)) {
        setIsAdmin(true);
        setAuthView("dashboard");
        return;
      }
      
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
        const session = await tracker.clockOut(pin);
        if (session) {
          setMessage(`Goodbye ${userName.name || userName}! You have been clocked out.`);
        } else {
          setMessage("Error clocking out. Please try again.");
        }
      } else {
        // Clock in the user
        const success = await tracker.clockIn(pin);
        if (success) {
          setMessage(`Hello ${userName.name || userName}! You have been clocked in.`);
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
    await handlePinLogin(pin);
    setInput("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">SHIFTSYNC</h1>
          <p className="mb-4">Loading application...</p>
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
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
      
      {authView === "dashboard" && (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
