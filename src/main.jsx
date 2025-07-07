// src/main.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { supabase } from "./supabaseClient";
import TimeTracker from "./utils/TimeTracker";

// Initialize the TimeTracker instance
const tracker = new TimeTracker();

// AppWrapper component to handle database initialization
function AppWrapper() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [initializationAttempts, setInitializationAttempts] = useState(0);

  useEffect(() => {
    async function initializeDatabase() {
      try {
        // Try to create tables directly
        await createTables();
        
        // Load data from Supabase
        await tracker.loadData();
        
        setError(null);
      } catch (err) {
        console.error("Error initializing database:", err);
        setError("Failed to connect to database. Please check your connection and try again.");
      } finally {
        setIsInitializing(false);
      }
    }

    async function createTables() {
      try {
        // Try to access the users table to see if it exists
        const { error: usersError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        
        // If we get an error, the table might not exist
        if (usersError) {
          console.log('Creating users table...');
          
          // Try to create the admin user
          const { error: createError } = await supabase
            .from('users')
            .insert({
              pin: "9999",
              name: "Admin",
              current_hourly_rate: 0,
              role: "Admin",
              is_admin: true
            });
          
          if (createError) {
            console.error('Error creating users table:', createError);
            throw createError;
          }
        }
        
        // Try to access the hourly_rate_history table
        const { error: rateHistoryError } = await supabase
          .from('hourly_rate_history')
          .select('*', { count: 'exact', head: true });
        
        if (rateHistoryError) {
          console.log('Creating hourly_rate_history table...');
          
          // Try to create the table by inserting a record
          const { error: createError } = await supabase
            .from('hourly_rate_history')
            .insert({
              user_pin: "9999",
              rate: 0,
              effective_from: new Date(0).toISOString()
            });
          
          if (createError) {
            console.error('Error creating hourly_rate_history table:', createError);
            throw createError;
          }
        }
      } catch (error) {
        console.error('Error creating tables:', error);
        throw error;
      }
    }

    // Only initialize if we haven't tried too many times
    if (initializationAttempts < 3) {
      initializeDatabase();
      setInitializationAttempts(prev => prev + 1);
    }
  }, [initializationAttempts]);

  if (isInitializing) {
    return (
      <div className="fixed inset-0 w-full h-full bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8 text-white tracking-wider">SHIFTSYNC</h1>
          <div className="w-12 h-12 border-t-3 border-white border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 w-full h-full bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-4 text-white tracking-wider">SHIFTSYNC</h1>
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <p className="mb-4 text-gray-300">Please check your connection to Supabase and try again.</p>
          <div className="space-y-2">
            <button 
              onClick={() => setInitializationAttempts(0)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <p className="text-sm text-gray-400 mt-2">
              Make sure your Supabase project is properly set up and the URL and key are correct.
            </p>
            <p className="text-sm text-gray-400">
              You may need to create the tables manually in the Supabase dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <App />;
}

// Hide the initial loading screen once React loads
const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.display = 'none';
  }
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);

// Hide the initial loader after React has mounted
setTimeout(hideInitialLoader, 100);
