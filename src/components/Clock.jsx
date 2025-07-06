// src/components/Clock.jsx
import { useEffect, useState } from "react";

export default function Clock({ timeFormat = '12h', timezone = 'auto', dateFormat = 'MM/DD/YYYY' }) {
  const [now, setNow] = useState(new Date());
  const [formattedDisplay, setFormattedDisplay] = useState({ dayDate: '', time: '' });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time based on user preferences
  const formatTime = (date) => {
    const tz = timezone === 'auto' ? undefined : timezone;
    
    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: timeFormat === '12h',
      timeZone: tz
    };

    const dateOptions = {
      timeZone: tz
    };

    let formattedDate;
    if (dateFormat === 'MM/DD/YYYY') {
      formattedDate = date.toLocaleDateString('en-US', { ...dateOptions, month: 'short', day: 'numeric' });
    } else if (dateFormat === 'DD/MM/YYYY') {
      formattedDate = date.toLocaleDateString('en-GB', { ...dateOptions, day: 'numeric', month: 'short' });
    } else {
      formattedDate = date.toLocaleDateString('sv-SE', { ...dateOptions, month: 'short', day: 'numeric' });
    }

    const formattedTime = date.toLocaleTimeString('en-US', timeOptions);
    const dayName = date.toLocaleDateString('en-US', { ...dateOptions, weekday: 'long' });

    return {
      dayDate: `${dayName}, ${formattedDate}`,
      time: formattedTime
    };
  };

  // Update formatted display when time or format settings change
  useEffect(() => {
    console.log('Clock component props changed:', { timeFormat, timezone, dateFormat });
    setFormattedDisplay(formatTime(now));
  }, [now, timeFormat, timezone, dateFormat]);

  return (
    <div className="w-screen flex justify-center pt-[1rem]">
      <div className="clock-display text-5xl/18 font-mono pb-[20px] text-center size-fit">
        {formattedDisplay.dayDate}
        <hr />
        {formattedDisplay.time}
      </div>
    </div>
  );
}
