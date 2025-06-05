// src/components/AdminPanel.jsx
import { useEffect, useState } from "react";
import TimeTracker from "../utils/TimeTracker";
import DateRangePicker, { getDateRange } from "../components/DateRangePicker";
import { supabase } from "../supabaseClient";
import eventBus from "../utils/EventBus";

const tracker = new TimeTracker();

export default function AdminPanel() {
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState([]);
  const [users, setUsers] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [sortBy, setSortBy] = useState("name"); // 'name', 'time', 'earnings'
  // Initialize with "This Week" date range
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add a refresh trigger state

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [filteredSessions, activeSessions, usersList] = await Promise.all([
          tracker.getSessions(startDate, endDate),
          tracker.getActiveSessions(),
          tracker.getUsers()
        ]);
        
        setSessions(filteredSessions);
        setActive(activeSessions);
        setUsers(usersList);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval); // Clean up on unmount
  }, [startDate, endDate, sortBy, refreshTrigger]); // Add refreshTrigger to dependencies

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

  const getUserTotals = async () => {
    const totals = {};

    // Combine users from sessions and active
    const allUsers = new Map();

    sessions.forEach(({ name, pin }) => {
      const key = `${pin}`; // Use PIN as the unique key
      allUsers.set(key, { name, pin });
    });

    users.forEach(({ name, pin }) => {
      const key = `${pin}`; // Use PIN as the unique key
      allUsers.set(key, { name, pin });
    });

    // Initialize all totals
    for (const [key, user] of allUsers) {
      totals[key] = { 
        name: user.name, 
        pin: user.pin, 
        displayName: `${user.name}`, // Include PIN in display name
        time: 0, 
        earnings: 0, 
        isActive: false 
      };
    }

    // Add session durations
    for (const { name, pin, duration, clockIn } of sessions) {
      const key = `${pin}`; // Use PIN as the unique key
      try {
        // Use the hourly rate that was in effect at the time of the session
        const hourlyRate = await tracker.getHourlyRate(pin, clockIn);
        if (totals[key]) { // Check if the key exists
          totals[key].time += duration;
          totals[key].earnings += (duration / (1000 * 60 * 60)) * hourlyRate; // Calculate earnings
        }
      } catch (err) {
        console.error(`Error getting hourly rate for pin ${pin}:`, err);
        // Continue with next session if there's an error
      }
    }

    // Check if current date is within the selected date range
    const isCurrentDateInRange = () => {
      // If no date range is selected, include active sessions
      if (!startDate || !endDate) return true;
      
      const currentDate = new Date();
      
      // For date comparison, we need to compare just the date parts (year, month, day)
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const currentDay = currentDate.getDate();
      
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();
      
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endDay = endDate.getDate();
      
      // Check if current date is on or after start date
      const isAfterStart = 
        (currentYear > startYear) || 
        (currentYear === startYear && currentMonth > startMonth) || 
        (currentYear === startYear && currentMonth === startMonth && currentDay >= startDay);
      
      // Check if current date is on or before end date
      const isBeforeEnd = 
        (currentYear < endYear) || 
        (currentYear === endYear && currentMonth < endMonth) || 
        (currentYear === endYear && currentMonth === endMonth && currentDay <= endDay);
      
      // Current date is within range if it's both after start and before end
      return isAfterStart && isBeforeEnd;
    };

    const currentDateInRange = isCurrentDateInRange();

    // Add live session durations only if current date is in range
    if (currentDateInRange) {
      for (const { name, pin, clockIn } of active) {
        const key = `${pin}`; // Use PIN as the unique key
        const elapsed = now - new Date(clockIn).getTime();
        try {
          // Use the hourly rate that was in effect at the time of clock in
          const hourlyRate = await tracker.getHourlyRate(pin, clockIn);
          if (totals[key]) { // Check if the key exists
            totals[key].time += elapsed;
            totals[key].earnings += (elapsed / (1000 * 60 * 60)) * hourlyRate; // Calculate earnings
            totals[key].isActive = true; // Mark user as active
          }
        } catch (err) {
          console.error(`Error getting hourly rate for active session pin ${pin}:`, err);
          // Continue with next active session if there's an error
        }
      }
    }

    return totals;
  };

  // State to store calculated totals
  const [userTotals, setUserTotals] = useState({});
  
  // Calculate user totals when sessions, active, or now changes
  useEffect(() => {
    const calculateTotals = async () => {
      try {
        const totals = await getUserTotals();
        setUserTotals(totals);
      } catch (err) {
        console.error("Error calculating user totals:", err);
      }
    };
    
    calculateTotals();
  }, [sessions, active, now]);

  const sortedUserTotals = Object.values(userTotals).sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "time") {
      return b.time - a.time;
    } else if (sortBy === "earnings") {
      return b.earnings - a.earnings;
    }
    return 0;
  });

  // Handle date range change from DateRangePicker
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
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

  return (
    <div className="w-[80%] ml-auto mr-auto pt-[40px] pb-[40px] block">
      {/* Sorting and Date Range */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <label htmlFor="sortBy" className="mr-2">
            Sort By:
          </label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-2 border rounded text-black">
            <option value="name">Name</option>
            <option value="time">Time</option>
            <option value="earnings">Earnings</option>
          </select>
        </div>
        <div>
          {/* Use the new DateRangePicker component */}
          <DateRangePicker 
            onChange={handleDateRangeChange} 
            initialRange="thisWeek" 
          />
        </div>
      </div>

      {/* User Totals */}
      <table className="w-full border border-gray-300 rounded-lg shadow-md dash-table-bg">
        <thead className="text-xl font-bold mb-4">
          <tr>
            <th>EMPLOYEE</th>
            <th>TIME</th>
            <th>BILLABLE</th>{/* Added earnings column */}
          </tr>
        </thead>
        <tbody className="space-y-2">
          {sortedUserTotals.map(({ name, pin, displayName, time, earnings, isActive }, i) => (
            <tr key={i} className="p-3 text-center [&:not(:last-child)]:border-b border-dashed border-[#eae7dc]">
              <td>
                <div className="h-[3rem] flex items-center justify-center">
                  <strong>{displayName}</strong>
                </div>
              </td>
              <td>
                <span className="font-mono">{formatDuration(time)}</span>
                <span className="inline-block">
                {isActive && (
                    <span className="ml-2 inline-block relative w-2 h-2 outline rounded-full active-icon-bg" title="Currently Active"><span className="ml-2 absolute w-1 h-1 bg-green-600 rounded-full left-[-50%] top-[50%] translate-[-50%]" title="Currently Active"></span></span>
                  )}
                </span>
              </td>
              <td>
                <span className="font-mono">${earnings.toFixed(2)}</span> {/* Display earnings */}
              </td>
            </tr>
          ))}
          {!Object.keys(userTotals).length && (
            <tr>
              <td className="text-gray-500">No user totals yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
