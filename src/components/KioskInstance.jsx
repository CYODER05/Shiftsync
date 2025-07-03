// src/components/KioskInstance.jsx
import { useState } from 'react';
import Clock from './Clock';
import Display from './Display';
import Keypad from './Keypad';
import Message from './Message';
import TimeTracker from '../utils/TimeTracker';

const tracker = new TimeTracker();

export default function KioskInstance({ kiosk, onBack }) {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');

  const handleKeyPress = (key) => {
    if (key === 'C') return setInput('');
    if (key === '←') return setInput((prev) => prev.slice(0, -1));
    setInput((prev) => (prev + key).slice(0, 4));
  };

  const handleSubmit = async () => {
    const pin = input;
    await handlePinLogin(pin);
    setInput('');
  };

  const handlePinLogin = async (pin) => {
    try {
      // Get user name
      const userName = await tracker.getUser(pin);
      
      if (!userName) {
        setMessage('Invalid PIN');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      
      // Check if user is already clocked in
      const isClocked = await tracker.isClockedIn(pin);
      
      if (isClocked) {
        // Clock out the user
        const session = await tracker.clockOut(pin);
        if (session) {
          setMessage(`${userName.name || userName} has been clocked out.`);
        } else {
          setMessage('Error clocking out. Please try again.');
        }
      } else {
        // Clock in the user
        const success = await tracker.clockIn(pin);
        if (success) {
          setMessage(`${userName.name || userName} has been clocked in.`);
        } else {
          setMessage('Error clocking in. Please try again.');
        }
      }
      
      // Clear the message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('Error in handlePinLogin:', error);
      setMessage('Error processing request. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 min-h-screen bg-gray-50">
      {/* Header with kiosk info and back button */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-500 font-medium"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Kiosk Management
        </button>
        
        <div className="text-right">
          <h2 className="text-lg font-semibold text-gray-900">{kiosk.name}</h2>
          {kiosk.location && (
            <p className="text-sm text-gray-600">{kiosk.location}</p>
          )}
        </div>
      </div>

      {/* Main kiosk interface */}
      <div className="text-center mb-4 mt-16">
        <h1 className="text-4xl font-bold mb-2">SHIFTSYNC</h1>
        <p className="text-xl text-gray-600">Enter PIN to Continue</p>
        {kiosk.description && (
          <p className="text-sm text-gray-500 mt-2">{kiosk.description}</p>
        )}
      </div>
      
      <Clock />
      <Display input={input} />
      <Keypad onKeyPress={handleKeyPress} onSubmit={handleSubmit} />
      <Message text={message} />
    </div>
  );
}
