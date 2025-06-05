// src/Pages/LoginPage.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import Clock from '../components/Clock';

export default function LoginPage({ onBack, onLoginSuccess, onPinLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'pin'

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Login successful
      onLoginSuccess(data.user);
    } catch (error) {
      setError(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = () => {
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    
    onPinLogin(pin);
  };

  const toggleLoginMethod = () => {
    setLoginMethod(loginMethod === 'email' ? 'pin' : 'email');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">SHIFTSYNC</h1>
        <p className="text-xl text-gray-600">Sign In</p>
      </div>
      
      <Clock />
      
      <div className="mt-8 w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        {loginMethod === 'email' ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={toggleLoginMethod}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Use PIN instead
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                4-Digit PIN
              </label>
              <input
                id="pin"
                type="password"
                maxLength="4"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={toggleLoginMethod}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Use Email instead
              </button>
              
              <button
                type="button"
                onClick={handlePinLogin}
                disabled={pin.length !== 4 || loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-500"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
