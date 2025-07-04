// src/components/UserManagement.jsx
import { useEffect, useState } from "react";
import TimeTracker from "../utils/TimeTracker";
import { supabase } from "../supabaseClient";
import eventBus from "../utils/EventBus";

// Create a single instance of TimeTracker to be used throughout the component
const tracker = new TimeTracker();

// Component to handle async hourly rate display
function HourlyRateDisplay({ pin, refreshTrigger }) {
  const [rate, setRate] = useState("...");
  
  useEffect(() => {
    async function fetchRate() {
      try {
        const hourlyRate = await tracker.getHourlyRate(pin);
        setRate(hourlyRate);
      } catch (error) {
        console.error("Error fetching hourly rate:", error);
        setRate(0);
      }
    }
    
    fetchRate();
  }, [pin, refreshTrigger]); // Re-fetch when pin or refreshTrigger changes
  
  return <>${rate}</>;
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [role, setRole] = useState(""); // Add state for role
  const [error, setError] = useState("");
  const [editingPin, setEditingPin] = useState(null); // Track which user is being edited
  const [showModal, setShowModal] = useState(false); // Control modal visibility
  const [showRateModal, setShowRateModal] = useState(false); // Control hourly rate modal visibility
  const [rateEditingPin, setRateEditingPin] = useState(null); // Track which user's rate is being edited
  const [applyRateToAllEntries, setApplyRateToAllEntries] = useState(false); // Whether to apply rate to all entries
  const [searchTerm, setSearchTerm] = useState(""); // For searching users by name
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add a refresh trigger state

  const refreshUsers = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching users...");
      const userList = await tracker.getUsers();
      console.log("Users fetched:", userList);
      
      if (!userList || userList.length === 0) {
        console.log("No users found or empty list returned");
      }
      
      setUsers(userList || []);
      setError("");
      
      // Increment the refresh trigger to force HourlyRateDisplay components to update
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again.");
      setUsers([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize the tracker and load users when component mounts
    const initializeComponent = async () => {
      try {
        // Make sure tracker is initialized
        await tracker.loadData();
        await refreshUsers();
      } catch (error) {
        console.error("Error initializing component:", error);
        setError("Failed to initialize. Please refresh the page.");
      }
    };
    
    initializeComponent();
    
    // Subscribe to user events
    const userAddedUnsubscribe = eventBus.subscribe('user-added', () => {
      refreshUsers();
    });
    
    const userUpdatedUnsubscribe = eventBus.subscribe('user-updated', () => {
      refreshUsers();
    });
    
    const userDeletedUnsubscribe = eventBus.subscribe('user-deleted', () => {
      refreshUsers();
    });
    
    // Clean up subscriptions when component unmounts
    return () => {
      userAddedUnsubscribe();
      userUpdatedUnsubscribe();
      userDeletedUnsubscribe();
    };
  }, []);

  const handleAddUser = async () => {
    setIsLoading(true);
    try {
      const success = await tracker.addUser(pin, name, parseFloat(hourlyRate), role);
      if (!success) {
        setError("Failed to add user. PIN might already exist or input is invalid.");
        return;
      }
      setName("");
      setPin("");
      setHourlyRate("");
      setRole("");
      setError("");
      setShowModal(false); // Close modal after successful add
      await refreshUsers();
    } catch (err) {
      console.error("Error adding user:", err);
      setError("Failed to add user. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (pin) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    
    setIsLoading(true);
    try {
      await tracker.deleteUser(pin);
      await refreshUsers();
      setError("");
    } catch (err) {
      console.error("Error deleting user:", err);
      setError("Failed to delete user. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async (pin) => {
    setEditingPin(pin); // Enable edit mode for this user
    const user = users.find((user) => user.pin === pin);
    if (user) {
      setName(user.name);
      setPin(user.pin);
      try {
        const rate = await tracker.getHourlyRate(pin);
        setHourlyRate(rate);
      } catch (err) {
        console.error("Error getting hourly rate:", err);
        setHourlyRate(0);
      }
      setRole(user.role || ""); // Set role from user data
      setShowModal(true); // Show modal for editing
    }
  };

  const handleUpdateUser = async () => {
    setIsLoading(true);
    try {
      const success = await tracker.updateUser(editingPin, name, pin, parseFloat(hourlyRate), role, applyRateToAllEntries);
      if (!success) {
        setError("Failed to update user. PIN might already exist or input is invalid.");
        return;
      }
      setName("");
      setPin("");
      setHourlyRate("");
      setRole("");
      setError("");
      setEditingPin(null); // Exit edit mode
      setShowModal(false); // Close modal after successful update
      setApplyRateToAllEntries(false); // Reset the option
      await refreshUsers();
    } catch (err) {
      console.error("Error updating user:", err);
      setError("Failed to update user. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateHourlyRate = async () => {
    setIsLoading(true);
    try {
      // Get current user data
      const user = users.find((user) => user.pin === rateEditingPin);
      if (!user) return;
      
      // Update only the hourly rate
      const success = await tracker.updateUser(
        rateEditingPin, 
        user.name, 
        rateEditingPin, 
        parseFloat(hourlyRate), 
        user.role || "", 
        applyRateToAllEntries
      );
      
      if (!success) {
        setError("Failed to update hourly rate.");
        return;
      }
      
      setHourlyRate("");
      setError("");
      setRateEditingPin(null);
      setShowRateModal(false);
      setApplyRateToAllEntries(false);
      await refreshUsers();
    } catch (err) {
      console.error("Error updating hourly rate:", err);
      setError("Failed to update hourly rate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPin(null); // Exit edit mode
    setName("");
    setPin("");
    setHourlyRate("");
    setRole("");
    setError("");
    setShowModal(false); // Hide modal
    setApplyRateToAllEntries(false); // Reset the option
  };

  const handleCancelRateEdit = () => {
    setRateEditingPin(null);
    setHourlyRate("");
    setError("");
    setShowRateModal(false);
    setApplyRateToAllEntries(false);
  };

  const openRateEditModal = async (pin) => {
    setRateEditingPin(pin);
    try {
      const rate = await tracker.getHourlyRate(pin);
      setHourlyRate(rate.toString());
    } catch (err) {
      console.error("Error getting hourly rate:", err);
      setHourlyRate("0");
    }
    setError("");
    setApplyRateToAllEntries(false);
    setShowRateModal(true);
  };

  // Generate a unique 4-digit PIN that doesn't conflict with existing users
  const generateUniquePin = () => {
    const existingPins = users.map(user => user.pin);
    let newPin;
    
    do {
      // Generate a random 4-digit number (1000-9999)
      newPin = Math.floor(1000 + Math.random() * 9000).toString();
    } while (existingPins.includes(newPin));
    
    return newPin;
  };

  const openAddUserModal = () => {
    setName("");
    setPin(generateUniquePin()); // Pre-fill with a unique PIN
    setHourlyRate("");
    setRole("");
    setError("");
    setEditingPin(null);
    setApplyRateToAllEntries(false); // Reset the option
    setShowModal(true);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold">User Management</h2>

      <div className="mb-4">
        <button
          onClick={openAddUserModal}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Add Employee
        </button>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center backdrop-blur-[2px] justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full text-black">
            <h3 className="text-xl font-bold mb-4">
              {editingPin ? "Edit Employee" : "Add New Employee"}
            </h3>
            
            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full p-2 border rounded"
              />
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-digit PIN"
                maxLength="4"
                className="w-full p-2 border rounded"
              />
              {!editingPin && (
                <input
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="Hourly Rate"
                  type="number"
                  className="w-full p-2 border rounded"
                />
              )}
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role (optional)"
                className="w-full p-2 border rounded"
              />
              
              {error && <p className="text-red-600">{error}</p>}
              
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                {editingPin ? (
                  <button
                    onClick={handleUpdateUser}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Update
                  </button>
                ) : (
                  <button
                    onClick={handleAddUser}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hourly Rate Modal */}
      {showRateModal && (
        <div className="fixed inset-0 flex items-center backdrop-blur-[2px] justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full text-black">
            <h3 className="text-xl font-bold mb-4">
              Edit Hourly Rate
            </h3>
            
            <div className="space-y-3">
              <input
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="Hourly Rate"
                type="number"
                className="w-full p-2 border rounded"
              />
              
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="applyRateToAllEntries"
                  checked={applyRateToAllEntries}
                  onChange={(e) => setApplyRateToAllEntries(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="applyRateToAllEntries">
                  Apply new hourly rate to all past entries
                </label>
              </div>
              
              {error && <p className="text-red-600">{error}</p>}
              
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={handleCancelRateEdit}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateHourlyRate}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        <div className="flex justify-between items-center mb-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 pl-8 border rounded-lg"
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 absolute left-2 top-2.5 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
        </div>
        <table className="w-full border border-gray-300 rounded-lg shadow-md bg-white">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Role</th>
              <th>Rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="space-y-2">
          {users
            .filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(({ name, pin, role }) => (
              <tr key={pin} className="p-3 text-center [&:not(:last-child)]:border-b border-dashed border-[#eae7dc]">
                <td>
                  <div className="h-[3rem] flex items-center justify-center">
                      <strong>{name}</strong>
                  </div>
                </td>
                <td>
                  {role && <span className="ml-2 text-gray-600">• {role}</span>}
                </td>
                <td>
                  <span className="ml-2 bg-[#eae7dc]">
                    <HourlyRateDisplay pin={pin} refreshTrigger={refreshTrigger} />
                    <button
                      onClick={() => openRateEditModal(pin)}
                      className="ml-2 px-2 bg-green-500 text-white hover:bg-green-600 text-xs"
                    >
                      Edit
                    </button>
                  </span>
                </td>
                <td>
                  <div>
                    <button
                      onClick={() => handleEditUser(pin)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(pin)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
          ))}
          {users.filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
            <tr>
              <td colSpan="4" className="text-center py-4 text-gray-500">
                No users found matching "{searchTerm}"
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
  );
}
