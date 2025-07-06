// src/components/TimeSheet.jsx
import React, { useState, useEffect } from "react";
import DateRangePicker from "./DateRangePicker";
import { supabase } from "../supabaseClient";
import eventBus from "../utils/EventBus";

export default function TimeSheet({ sessions, formatDuration, onEditSession, onDeleteSession, tracker, timeFormat = '12h', selectedTimezone = 'auto', dateFormat = 'MM/DD/YYYY' }) {
  // Helper function to calculate earnings based on duration and hourly rate
  const calculateEarnings = async (pin, clockIn, duration) => {
    if (!duration) return 0;
    
    try {
      // Get the hourly rate that was in effect at the time of the session
      const hourlyRate = await tracker.getHourlyRate(pin, clockIn);
      return (duration / (1000 * 60 * 60)) * hourlyRate;
    } catch (error) {
      console.error("Error calculating earnings:", error);
      return 0;
    }
  };
  
  // State to store calculated earnings
  const [sessionEarnings, setSessionEarnings] = useState({});
  const [editingSession, setEditingSession] = useState(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [selectedUser, setSelectedUser] = useState("all"); // Default to show all users
  const [uniqueUsers, setUniqueUsers] = useState([]);
  // Initialize with "This Week" date range
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [allSessions, setAllSessions] = useState(sessions);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add a refresh trigger state

  // Handle date range change from DateRangePicker
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  // Update sessions when date range changes or when refreshTrigger changes
  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        if (tracker) {
          const filteredSessions = await tracker.getSessions(startDate, endDate);
          setAllSessions(filteredSessions);
          setError(null);
        } else {
          setAllSessions(sessions);
        }
      } catch (err) {
        console.error("Error fetching sessions:", err);
        setError("Failed to load sessions. Please try again.");
        setAllSessions(sessions); // Fallback to props
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSessions();
  }, [startDate, endDate, tracker, sessions, refreshTrigger]); // Add refreshTrigger to dependencies

  // Extract unique users from allSessions
  useEffect(() => {
    const users = new Map(); // Use Map to store unique user info
    allSessions.forEach(session => {
      if (session.name && session.pin) {
        const userKey = `${session.pin}`; // Use PIN as unique key
        users.set(userKey, { name: session.name, pin: session.pin });
      }
    });
    // Convert Map values to array of user objects
    setUniqueUsers(Array.from(users.values()));
  }, [allSessions]);
  
  // Calculate earnings for all sessions
  useEffect(() => {
    const calculateAllEarnings = async () => {
      const earnings = {};
      
      for (const session of allSessions) {
        if (session.duration) {
          try {
            const amount = await calculateEarnings(session.pin, session.clockIn, session.duration);
            earnings[session.id] = amount;
          } catch (err) {
            console.error(`Error calculating earnings for session ${session.id}:`, err);
            earnings[session.id] = 0;
          }
        } else {
          earnings[session.id] = 0;
        }
      }
      
      setSessionEarnings(earnings);
    };
    
    calculateAllEarnings();
  }, [allSessions, refreshTrigger]); // Add refreshTrigger to dependencies

  // Handle user selection change
  const handleUserFilterChange = (e) => {
    setSelectedUser(e.target.value);
  };

  // Filter sessions based on selected user
  const filteredSessions = selectedUser === "all" 
    ? allSessions 
    : allSessions.filter(session => session.pin === selectedUser);

  const handleEditClick = (session) => {
    setEditingSession(session.id);
    // Convert ISO strings to local datetime-local format
    setEditClockIn(formatDateTimeForInput(session.clockIn));
    setEditClockOut(formatDateTimeForInput(session.clockOut));
  };

  const handleSaveEdit = async () => {
    try {
      // Convert back to ISO strings
      const clockInISO = new Date(editClockIn).toISOString();
      const clockOutISO = new Date(editClockOut).toISOString();
      
      await onEditSession(editingSession, clockInISO, clockOutISO);
      setEditingSession(null);
      setError(null);
      
      // Trigger a refresh to update the data
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Error saving edit:", err);
      setError("Failed to save changes. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditingSession(null);
  };

  const handleDeleteClick = async (sessionId) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
      try {
        await onDeleteSession(sessionId);
        setError(null);
        
        // Trigger a refresh to update the data
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error("Error deleting session:", err);
        setError("Failed to delete session. Please try again.");
      }
    }
  };
  
  // Function to manually refresh data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Subscribe to user events to refresh data when users are modified
  useEffect(() => {
    const userAddedUnsubscribe = eventBus.subscribe('user-added', refreshData);
    const userUpdatedUnsubscribe = eventBus.subscribe('user-updated', refreshData);
    const userDeletedUnsubscribe = eventBus.subscribe('user-deleted', refreshData);
    
    // Clean up subscriptions when component unmounts
    return () => {
      userAddedUnsubscribe();
      userUpdatedUnsubscribe();
      userDeletedUnsubscribe();
    };
  }, []);

  // Helper function to format date for datetime-local input
  const formatDateTimeForInput = (isoString) => {
    const date = new Date(isoString);
    // Format: YYYY-MM-DDThh:mm
    return date.toISOString().slice(0, 16);
  };

  // Format time/date based on user preferences
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    const timezone = selectedTimezone === 'auto' ? undefined : selectedTimezone;
    
    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: timeFormat === '12h',
      timeZone: timezone
    };

    const dateOptions = {
      timeZone: timezone
    };

    let formattedDate;
    if (dateFormat === 'MM/DD/YYYY') {
      formattedDate = date.toLocaleDateString('en-US', { ...dateOptions, month: '2-digit', day: '2-digit', year: 'numeric' });
    } else if (dateFormat === 'DD/MM/YYYY') {
      formattedDate = date.toLocaleDateString('en-GB', { ...dateOptions, day: '2-digit', month: '2-digit', year: 'numeric' });
    } else {
      formattedDate = date.toLocaleDateString('sv-SE', { ...dateOptions, year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    const formattedTime = date.toLocaleTimeString('en-US', timeOptions);

    return `${formattedDate} ${formattedTime}`;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold">Session History</h2>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <label htmlFor="userFilter" className="text-sm font-medium">
              Filter by User:
            </label>
            <select
              id="userFilter"
              value={selectedUser}
              onChange={handleUserFilterChange}
              className="p-2 border rounded text-black w-full sm:w-auto"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user.pin} value={user.pin}>
                  {user.name} (PIN: {user.pin})
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            {/* Use the new DateRangePicker component */}
            <DateRangePicker 
              onChange={handleDateRangeChange} 
              initialRange="thisWeek" 
            />
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <p className="text-center py-4">Loading sessions...</p>
      ) : (
        <ul className="space-y-2">
          {filteredSessions.length ? (
            filteredSessions.map((session) => (
              <li key={session.id} className="p-3 session-history-bg border border-gray-300 rounded-lg shadow-md rounded text-black">
                {editingSession === session.id ? (
                  <div className="edit-form">
                    <strong>{session.name}</strong> (PIN: {session.pin})<br />
                    <div className="mb-2">
                      <label className="block text-sm font-medium">Clock In:</label>
                      <input
                        type="datetime-local"
                        value={editClockIn}
                        onChange={(e) => setEditClockIn(e.target.value)}
                        className="mt-1 p-1 border rounded text-black"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm font-medium">Clock Out:</label>
                      <input
                        type="datetime-local"
                        value={editClockOut}
                        onChange={(e) => setEditClockOut(e.target.value)}
                        className="mt-1 p-1 border rounded text-black"
                      />
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={handleSaveEdit}
                        className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <strong>{session.name}</strong> (PIN: {session.pin})<br />
                    In: {formatDateTime(session.clockIn)}<br />
                    Out: {formatDateTime(session.clockOut)}<br />
                    Duration: {formatDuration(session.duration)}<br />
                    Earnings: ${sessionEarnings[session.id] ? sessionEarnings[session.id].toFixed(2) : "0.00"}
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => handleEditClick(session)}
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(session.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))
          ) : (
            <p className="text-gray-500">No sessions recorded yet.</p>
          )}
        </ul>
      )}
    </div>
  );
}
