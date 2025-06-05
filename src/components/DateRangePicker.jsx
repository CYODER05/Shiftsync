// src/components/DateRangePicker.jsx
import React, { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./DateRangePicker.css"; // We'll create this file next

// Helper function to calculate date ranges
export const getDateRange = (range) => {
  const today = new Date();
  let start, end;

  switch (range) {
    case "today":
      start = new Date(today);
      end = new Date(today);
      end.setHours(23, 59, 59, 999); // Set to end of the day
      break;
    case "thisWeek":
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay()); // First day of current week (Sunday)
      start.setHours(0, 0, 0, 0);
      
      end = new Date(today);
      end.setDate(today.getDate() + (6 - today.getDay())); // Last day of current week (Saturday)
      end.setHours(23, 59, 59, 999);
      break;
    case "lastWeek":
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay() - 7); // First day of last week
      start.setHours(0, 0, 0, 0);
      
      end = new Date(today);
      end.setDate(today.getDate() - today.getDay() - 1); // Last day of last week
      end.setHours(23, 59, 59, 999);
      break;
    case "thisMonth":
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "lastMonth":
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "thisYear":
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start = null;
      end = null;
  }

  return [start, end];
};

export default function DateRangePicker({ onChange, initialRange = "thisWeek" }) {
  // Initialize with the provided initial range
  const [dateRange, setDateRange] = useState(getDateRange(initialRange));
  const [startDate, endDate] = dateRange;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRangeOption, setSelectedRangeOption] = useState(initialRange);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  // Date range handlers
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    setSelectedRangeOption("custom"); // Reset to custom when manually selecting dates
    onChange(dates); // Notify parent component
  };

  const handleQuickSelect = (range) => {
    const newRange = getDateRange(range);
    setDateRange(newRange);
    setSelectedRangeOption(range); // Set the selected option name
    onChange(newRange); // Notify parent component
    setIsOpen(false); // Close the calendar after selection
  };

  // Close the calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get button position for calendar positioning
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 });
  
  useEffect(() => {
    if (buttonRef.current && isOpen) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.height * 1.25,
        right: window.innerWidth - rect.right + window.scrollX
      });
    }
  }, [isOpen]);

  return (
    <div className="date-range-picker-container">
      <button 
        ref={buttonRef}
        className="date-range-picker-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedRangeOption === "custom"
          ? startDate && endDate
            ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
            : "Select Date Range"
          : selectedRangeOption === "today"
          ? "Today"
          : selectedRangeOption === "thisWeek"
          ? "This Week"
          : selectedRangeOption === "lastWeek"
          ? "Last Week"
          : selectedRangeOption === "thisMonth"
          ? "This Month"
          : selectedRangeOption === "lastMonth"
          ? "Last Month"
          : selectedRangeOption === "thisYear"
          ? "This Year"
          : "Select Date Range"}
      </button>

      {isOpen && (
        <div 
          ref={containerRef}
          className="date-range-picker-dropdown"
          style={{
            position: 'absolute',
            top: `${buttonPosition.top}px`,
            right: `${buttonPosition.right}px`,
            zIndex: 1000
          }}
        >
          <div className="date-range-picker-options">
            <button onClick={() => handleQuickSelect("today")}>Today</button>
            <button onClick={() => handleQuickSelect("thisWeek")}>This Week</button>
            <button onClick={() => handleQuickSelect("lastWeek")}>Last Week</button>
            <button onClick={() => handleQuickSelect("thisMonth")}>This Month</button>
            <button onClick={() => handleQuickSelect("lastMonth")}>Last Month</button>
            <button onClick={() => handleQuickSelect("thisYear")}>This Year</button>
          </div>
          <div className="date-range-picker-calendar">
            <DatePicker
              selected={startDate}
              onChange={handleDateRangeChange}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              inline
            />
          </div>
        </div>
      )}
    </div>
  );
}
