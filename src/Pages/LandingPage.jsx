// src/Pages/LandingPage.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import Clock from '../components/Clock';

export default function LandingPage({ onLogin, onSignup }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">SHIFTSYNC</h1>
        <p className="text-xl text-gray-600">Employee Time Tracking Made Simple</p>
      </div>
      
      <Clock />
      
      <div className="mt-8 space-y-4 w-full max-w-md">
        <button 
          onClick={onLogin}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 flex items-center justify-center"
        >
          <span>Sign In</span>
        </button>
        
        <button 
          onClick={onSignup}
          className="w-full py-3 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200 flex items-center justify-center"
        >
          <span>Create Admin Account</span>
        </button>
      </div>
      
      <div className="mt-8 text-center text-gray-600">
        <p>Track your work hours with ease</p>
        <p>Access your timesheet from anywhere</p>
        <p>Manage your team efficiently</p>
      </div>
    </div>
  );
}
