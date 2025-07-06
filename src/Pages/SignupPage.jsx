// src/Pages/SignupPage.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import Clock from '../components/Clock';

export default function SignupPage({ onBack, onSignupSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // First, try to reset password for this email to check if it exists
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://example.com/reset' // dummy URL, we just want to check if email exists
      });

      // If reset password succeeds, it means the email exists
      if (!resetError) {
        setError('This email is already associated with an account. Please use a different email or try signing in.');
        setLoading(false);
        return;
      }

      // If we get a specific error about email not found, proceed with signup
      // Otherwise, if it's a different error, still try to sign up
      console.log('Reset password check result:', resetError);

      // Attempt to sign up - Supabase will handle duplicate email detection
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: 'admin', // Store admin role in auth metadata
          },
        },
      });

      // Log the full error for debugging
      if (authError) {
        console.error('Signup error details:', {
          message: authError.message,
          status: authError.status,
          code: authError.code,
          fullError: authError
        });
      }

      if (authError) {
        // Check for various duplicate email error patterns
        const isDuplicateEmail = 
          authError.message.includes('User already registered') || 
          authError.message.includes('already been registered') ||
          authError.message.includes('email address is already registered') ||
          authError.message.includes('already exists') ||
          authError.message.includes('duplicate') ||
          authError.message.includes('Email rate limit exceeded') ||
          authError.message.includes('signup_disabled') ||
          authError.message.includes('To signup, please provide your email') ||
          authError.code === 'user_already_exists' ||
          authError.code === 'email_address_invalid' ||
          authError.code === 'signup_disabled' ||
          authError.code === 'email_address_not_authorized' ||
          authError.status === 422 ||
          authError.status === 400;

        if (isDuplicateEmail) {
          setError('This email is already associated with an account. Please use a different email or try signing in.');
        } else {
          setError(authError.message || 'An error occurred during signup');
        }
        setLoading(false);
        return;
      }

      // Additional check: if signup returns a user but no session, it might be a duplicate
      if (authData && authData.user && !authData.session) {
        console.log('Signup returned user but no session - possible duplicate');
        setError('This email is already associated with an account. Please use a different email or try signing in.');
        setLoading(false);
        return;
      }

      // Check if signup was successful but user already exists (some Supabase configurations)
      if (authData && authData.user && !authData.user.email_confirmed_at && authData.user.created_at) {
        const createdTime = new Date(authData.user.created_at);
        const now = new Date();
        const timeDiff = now - createdTime;
        
        // If the user was created more than 10 seconds ago, it might be an existing user
        if (timeDiff > 10000) {
          setError('This email is already associated with an account. Please use a different email or try signing in.');
          setLoading(false);
          return;
        }
      }

      setSuccessMessage(
        'Account created successfully! Please check your email for verification instructions. Once verified, you can sign in to access the admin panel.'
      );
      
      // Call the success callback
      onSignupSuccess(authData.user);
    } catch (error) {
      // Handle any unexpected errors
      console.error('Signup error:', error);
      
      const isDuplicateEmail = error.message && (
        error.message.includes('already registered') || 
        error.message.includes('already been registered') ||
        error.message.includes('email address is already registered') ||
        error.message.includes('Invalid login credentials') ||
        error.message.includes('Email not confirmed') ||
        error.message.includes('duplicate') ||
        error.message.includes('already exists')
      );

      if (isDuplicateEmail) {
        setError('This email is already associated with an account. Please use a different email or try signing in.');
      } else {
        setError(error.message || 'An error occurred during signup');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">SHIFTSYNC</h1>
        <p className="text-xl text-gray-600">Create Account</p>
      </div>

      <div className="mt-8 w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        {successMessage ? (
          <div className="text-center">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <p className="text-green-700">{successMessage}</p>
            </div>
            <button
              onClick={onBack}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500">
              <p className="text-blue-700 text-sm">
                <strong>Create an Account:</strong> 
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                onClick={onBack}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Back to Home
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
