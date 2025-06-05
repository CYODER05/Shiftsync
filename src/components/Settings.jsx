// src/components/Settings.jsx
import React from "react";

export default function Settings({ backgroundColorMode, toggleBackgroundColorMode }) {
  return (
    <div className={`settings-menu ${backgroundColorMode === 'dark' ? 'bg-[#163452] text-white' : 'bg-white text-[#213547]'}`}>
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      <div className="setting-option">
        <label>Background Color Mode:</label>
        <select
          className={`mt-2 p-2 w-full rounded ${backgroundColorMode === 'dark' ? 'bg-[#0a1c2e] text-white border-[#64b5f6]' : 'bg-white text-[#213547] border-[#ccc]'}`}
          value={backgroundColorMode}
          onChange={(e) => toggleBackgroundColorMode(e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    </div>
  );
}
