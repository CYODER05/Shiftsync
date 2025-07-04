// src/components/Settings.jsx
import React from "react";

export default function Settings({ backgroundColorMode, toggleBackgroundColorMode }) {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold">Settings</h2>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="setting-option">
            <label className="block text-sm font-medium mb-2">
              Background Color Mode:
            </label>
            <select
              className="w-full sm:w-auto p-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={backgroundColorMode}
              onChange={(e) => toggleBackgroundColorMode(e.target.value)}
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
            <p className="text-sm text-gray-600 mt-2">
              Choose between light and dark theme for the application interface.
            </p>
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
              <p className="text-sm text-gray-600">
                Reload the application to refresh all data and clear any temporary issues.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
