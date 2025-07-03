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
      const { data, error } = await supabase
        .from('kiosks')
        .insert([{
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
      setError('Failed to create kiosk. Please try again.');
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
    <div className="w-full p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kiosk Management</h1>
            <p className="text-gray-600 mt-2">Manage your employee time tracking kiosks</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
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
  id SERIAL PRIMARY KEY,
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
    </div>
  );
}
