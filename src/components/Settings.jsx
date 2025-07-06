// src/components/Settings.jsx
import React, { useState, useEffect } from "react";

export default function Settings({ 
  backgroundColorMode, 
  toggleBackgroundColorMode,
  timeFormat,
  selectedTimezone,
  dateFormat,
  onTimeFormatChange,
  onTimezoneChange,
  onDateFormatChange
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // US Timezones
  const usTimezones = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' }
  ];

  const timeFormats = [
    { value: '12h', label: '12-hour (3:45 PM)' },
    { value: '24h', label: '24-hour (15:45)' }
  ];

  const dateFormats = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/04/2025)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (04/01/2025)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-01-04)' }
  ];

  // Update current time every second for preview
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time based on user preferences
  const formatTimePreview = (date) => {
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
    const dayName = date.toLocaleDateString('en-US', { ...dateOptions, weekday: 'long' });

    return `${dayName}, ${formattedDate}, ${formattedTime}`;
  };
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold">Settings</h2>
      </div>

      <div className="max-w-2xl">
        <div className="settings-menu rounded-lg shadow-md p-6 space-y-6 border dark:border-slate-600">
          <div className="setting-option">
            <label className="block text-sm font-medium mb-2">
              Background Color Mode:
            </label>
            <select
              className="w-full sm:w-auto p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={backgroundColorMode}
              onChange={(e) => toggleBackgroundColorMode(e.target.value)}
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
            <p className="text-sm text-muted mt-2">
              Choose between light and dark theme for the application interface.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Time & Date Settings</h3>
            
            <div className="space-y-4">
              <div className="setting-option">
                <label className="block text-sm font-medium mb-2">
                  Time Format:
                </label>
                <select
                  className="w-full sm:w-auto p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={timeFormat}
                  onChange={(e) => onTimeFormatChange(e.target.value)}
                >
                  {timeFormats.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted mt-2">
                  Choose between 12-hour and 24-hour time display format.
                </p>
              </div>

              <div className="setting-option">
                <label className="block text-sm font-medium mb-2">
                  Timezone:
                </label>
                <select
                  className="w-full sm:w-auto p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedTimezone}
                  onChange={(e) => onTimezoneChange(e.target.value)}
                >
                  {usTimezones.map(timezone => (
                    <option key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted mt-2">
                  Select your timezone for accurate time tracking and display.
                </p>
              </div>

              <div className="setting-option">
                <label className="block text-sm font-medium mb-2">
                  Date Format:
                </label>
                <select
                  className="w-full sm:w-auto p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={dateFormat}
                  onChange={(e) => onDateFormatChange(e.target.value)}
                >
                  {dateFormats.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted mt-2">
                  Choose your preferred date display format.
                </p>
              </div>

              <div className="bg-white preview p-4 rounded-lg border dark:border-slate-600">
                <h4 className="text-sm font-medium mb-2">Preview:</h4>
                <p className="text-lg font-mono">
                  {formatTimePreview(currentTime)}
                </p>
                <p className="text-xs mt-1">
                  Live preview of your current time and date settings
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Application Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Application:</span>
                <span>ShiftSync Time Tracker</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Version:</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Features:</span>
                <span>Employee Management, Time Tracking, Kiosk Mode</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Refresh Application
              </button>
              <p className="text-sm text-muted">
                Reload the application to refresh all data and clear any temporary issues.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
