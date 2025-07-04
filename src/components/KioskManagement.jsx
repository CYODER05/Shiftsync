// src/components/KioskManagement.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import CreateKioskForm from './CreateKioskForm';
import KioskTable from './KioskTable';

export default function KioskManagement() {
  const [kiosks, setKiosks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Generate a secure 20-character alphanumeric ID
  const generateKioskId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Check if a kiosk ID already exists (collision detection)
  const checkIdExists = async (id) => {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('id')
        .eq('id', id)
        .single();
      
      return !error && data; // Returns true if ID exists
    } catch (error) {
      return false; // ID doesn't exist
    }
  };

  // Generate a unique kiosk ID with collision detection
  const generateUniqueKioskId = async (maxRetries = 10) => {
    for (let i = 0; i < maxRetries; i++) {
      const id = generateKioskId();
      const exists = await checkIdExists(id);
      if (!exists) {
        return id;
      }
    }
    throw new Error('Unable to generate unique kiosk ID after maximum retries');
  };

  useEffect(() => {
    initializeKiosksTable();
    loadKiosks();
  }, []);

  const initializeKiosksTable = async () => {
    try {
      // Check if kiosks table exists by trying to query it
      const { error: checkError } = await supabase
        .from('kiosks')
        .select('count')
        .limit(1);

      if (checkError) {
        console.log('Kiosks table does not exist, it needs to be created in Supabase');
        setError('Kiosks table needs to be created. Please create the kiosks table in your Supabase database.');
      }
    } catch (error) {
      console.error('Error checking kiosks table:', error);
    }
  };

  const loadKiosks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          setError('Kiosks table needs to be created in Supabase database.');
        } else {
          throw error;
        }
      } else {
        setKiosks(data || []);
        setError(null);
      }
    } catch (error) {
      console.error('Error loading kiosks:', error);
      setError('Failed to load kiosks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKiosk = async (kioskData) => {
    try {
      // Generate a unique ID for the kiosk
      const uniqueId = await generateUniqueKioskId();
      
      const { data, error } = await supabase
        .from('kiosks')
        .insert([{
          id: uniqueId,
          name: kioskData.name,
          description: kioskData.description,
          location: kioskData.location,
          is_active: true,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      setKiosks(prev => [data[0], ...prev]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating kiosk:', error);
      if (error.message.includes('Unable to generate unique kiosk ID')) {
        setError('Failed to generate unique kiosk ID. Please try again.');
      } else {
        setError('Failed to create kiosk. Please try again.');
      }
    }
  };

  const handleToggleKioskStatus = async (kioskId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('kiosks')
        .update({ is_active: !currentStatus })
        .eq('id', kioskId);

      if (error) throw error;

      setKiosks(prev => prev.map(kiosk => 
        kiosk.id === kioskId 
          ? { ...kiosk, is_active: !currentStatus }
          : kiosk
      ));
    } catch (error) {
      console.error('Error toggling kiosk status:', error);
      setError('Failed to update kiosk status. Please try again.');
    }
  };

  const handleDeleteKiosk = async (kioskId) => {
    if (!confirm('Are you sure you want to delete this kiosk?')) return;

    try {
      const { error } = await supabase
        .from('kiosks')
        .delete()
        .eq('id', kioskId);

      if (error) throw error;

      setKiosks(prev => prev.filter(kiosk => kiosk.id !== kioskId));
    } catch (error) {
      console.error('Error deleting kiosk:', error);
      setError('Failed to delete kiosk. Please try again.');
    }
  };


  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold">Kiosk Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-center"
        >
          Create New Kiosk
        </button>
      </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p>{error}</p>
            {error.includes('table needs to be created') && (
              <div className="mt-2 text-sm">
                <p>Please run this SQL in your Supabase SQL editor:</p>
                <pre className="bg-gray-800 text-white p-2 rounded mt-2 text-xs overflow-x-auto">
{`CREATE TABLE kiosks (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}
                </pre>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
          </div>
        ) : (
          <KioskTable
            kiosks={kiosks}
            onToggleStatus={handleToggleKioskStatus}
            onDelete={handleDeleteKiosk}
          />
        )}

        {showCreateForm && (
          <CreateKioskForm
            onSubmit={handleCreateKiosk}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
    </div>
  );
}
