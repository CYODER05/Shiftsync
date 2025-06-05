// src/components/Clock.jsx
import { useEffect, useState } from "react";

export default function Clock() {
  const [now, setNow] = useState(new Date());

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let d = new Date();
    let dayOfWeek = d.getDay();
    let month = d.getMonth();
    let day = d.getDate();
    let hours = d.getHours();
    let minutes = d.getMinutes();
    let seconds = d.getSeconds();

    seconds = seconds < 10 ? `0${seconds}` : seconds;
    minutes = minutes < 10 ? `0${minutes}` : minutes;
    let ampm = hours >= 12 ? "PM" : "AM";
    hours = hours > 12 ? hours - 12 : hours;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <div className="w-screen flex justify-center pt-[1rem]"><div className="clock-display text-5xl/18 font-mono pb-[20px] text-center size-fit">{days[dayOfWeek]}, {months[month]} {day}<hr></hr>{hours}:{minutes}:{seconds} {ampm}</div></div>;
}