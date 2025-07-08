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
  const [email, setEmail] = useState(""); // Add email state
  const [hourlyRate, setHourlyRate] = useState("");
  const [role, setRole] = useState("member"); // Default to member
  const [activeTab, setActiveTab] = useState("members"); // Add tab state
  const [error, setError] = useState("");
  
  // Role-related state
  const [roles, setRoles] = useState([]);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleHourlyRate, setRoleHourlyRate] = useState("");
  const [roleColor, setRoleColor] = useState("#3B82F6");
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(""); // For user role assignment
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

  const refreshRoles = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching roles...");
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error("Error fetching roles:", error);
        setError("Failed to load roles. Please try again.");
        setRoles([]);
      } else {
        console.log("Roles fetched:", data);
        setRoles(data || []);
        setError("");
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      setError("Failed to load roles. Please try again.");
      setRoles([]);
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
        await refreshRoles();
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
      const success = await tracker.addUser(pin, name, parseFloat(hourlyRate), role, email);
      if (!success) {
        setError("Failed to add user. PIN might already exist or input is invalid.");
        return;
      }
      setName("");
      setPin("");
      setEmail("");
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
      setEmail(user.email || "");
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
    setEmail("");
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

  const openAddUserModal = (defaultRole = "member") => {
    setName("");
    setPin(generateUniquePin()); // Pre-fill with a unique PIN
    setEmail("");
    setHourlyRate("");
    setRole(defaultRole);
    setError("");
    setEditingPin(null);
    setApplyRateToAllEntries(false); // Reset the option
    setShowModal(true);
  };

  // Role management functions
  const handleAddRole = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('positions')
        .insert([{
          name: roleName,
          description: roleDescription,
          hourly_rate: parseFloat(roleHourlyRate) || 0,
          color: roleColor
        }])
        .select();

      if (error) {
        console.error("Error adding role:", error);
        setError("Failed to add role. Role name might already exist.");
        return;
      }

      setRoleName("");
      setRoleDescription("");
      setRoleHourlyRate("");
      setRoleColor("#3B82F6");
      setError("");
      setShowRoleModal(false);
      await refreshRoles();
    } catch (err) {
      console.error("Error adding role:", err);
      setError("Failed to add role. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRole = (role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setRoleHourlyRate(role.hourly_rate.toString());
    setRoleColor(role.color);
    setError("");
    setShowRoleModal(true);
  };

  const handleUpdateRole = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('positions')
        .update({
          name: roleName,
          description: roleDescription,
          hourly_rate: parseFloat(roleHourlyRate) || 0,
          color: roleColor
        })
        .eq('id', editingRoleId);

      if (error) {
        console.error("Error updating role:", error);
        setError("Failed to update role. Role name might already exist.");
        return;
      }

      setRoleName("");
      setRoleDescription("");
      setRoleHourlyRate("");
      setRoleColor("#3B82F6");
      setEditingRoleId(null);
      setError("");
      setShowRoleModal(false);
      await refreshRoles();
    } catch (err) {
      console.error("Error updating role:", err);
      setError("Failed to update role. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm("Are you sure you want to delete this role? This will remove the role assignment from all team members.")) return;
    
    setIsLoading(true);
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('positions')
        .update({ is_active: false })
        .eq('id', roleId);

      if (error) {
        console.error("Error deleting role:", error);
        setError("Failed to delete role. Please try again.");
        return;
      }

      await refreshRoles();
      setError("");
    } catch (err) {
      console.error("Error deleting role:", err);
      setError("Failed to delete role. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openAddRoleModal = () => {
    setRoleName("");
    setRoleDescription("");
    setRoleHourlyRate("");
    setRoleColor("#3B82F6");
    setEditingRoleId(null);
    setError("");
    setShowRoleModal(true);
  };

  const handleCancelRoleEdit = () => {
    setRoleName("");
    setRoleDescription("");
    setRoleHourlyRate("");
    setRoleColor("#3B82F6");
    setEditingRoleId(null);
    setError("");
    setShowRoleModal(false);
  };

  // Filter users based on active tab and search term
  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === "all" || 
                        (activeTab === "admin" && user.role?.toLowerCase() === "admin") ||
                        (activeTab === "members" && (!user.role || user.role.toLowerCase() !== "admin"));
      return matchesSearch && matchesTab;
    });
  };

  const getTabCounts = () => {
    const adminCount = users.filter(user => user.role?.toLowerCase() === "admin").length;
    const memberCount = users.filter(user => !user.role || user.role.toLowerCase() !== "admin").length;
    return { adminCount, memberCount, totalCount: users.length };
  };

  const { adminCount, memberCount } = getTabCounts();
  const filteredUsers = getFilteredUsers();

  return (
    <div className="w-full h-full bg-primary">
      {/* Header */}
      <div className="dash-table-bg border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Team Management</h1>
      </div>

      {/* Navigation Tabs */}
      <div className="dash-table-bg border-b border-primary">
        <div className="px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("members")}
              className={`py-4 px-1 font-medium text-sm transition-colors nav-tab ${
                activeTab === "members" ? "active" : ""
              }`}
            >
              MEMBERS ({memberCount})
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`py-4 px-1 font-medium text-sm transition-colors nav-tab ${
                activeTab === "admin" ? "active" : ""
              }`}
            >
              ADMIN ({adminCount})
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`py-4 px-1 font-medium text-sm transition-colors nav-tab ${
                activeTab === "roles" ? "active" : ""
              }`}
            >
              ROLES ({roles.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Search and Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input pl-10 pr-4 py-2 rounded-lg"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {activeTab === "roles" ? (
              <button
                onClick={openAddRoleModal}
                className="btn-primary px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                ADD ROLE
              </button>
            ) : (
              <button
                onClick={() => openAddUserModal(activeTab === "admin" ? "admin" : "member")}
                className="btn-primary px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                ADD {activeTab === "admin" ? "ADMIN" : "MEMBER"}
              </button>
            )}
            <button className="btn-secondary px-4 py-2 font-medium rounded-lg transition-colors">
              Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="dash-table-bg rounded-lg shadow-md border border-gray-300 overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium">
              {activeTab === "roles" ? "Job Roles" : activeTab === "admin" ? "Administrators" : "Team Members"}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="">
                <tr>
                  {activeTab === "roles" ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        ROLE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        DESCRIPTION
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        DEFAULT RATE (USD)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        COLOR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        ACTIONS
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        NAME
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        EMAIL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        BILLABLE RATE (USD)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        ROLE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        ACTIONS
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="dash-table-bg divide-y divide-slate-200 dark:divide-slate-700">
                {activeTab === "roles" ? (
                  <>
                    {roles.map((role) => (
                      <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div 
                                className="h-10 w-10 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: role.color }}
                              >
                                <span className="text-sm font-medium text-white">
                                  {role.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {role.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {role.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            ${role.hourly_rate.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-full border border-slate-300"
                              style={{ backgroundColor: role.color }}
                            ></div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {role.color}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditRole(role)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRole(role.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {roles.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <div className="text-slate-500 dark:text-slate-400">
                            No roles found. Create your first role to get started.
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <>
                    {filteredUsers.map((user) => (
                      <tr key={user.pin} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {user.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {user.email || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              <HourlyRateDisplay pin={user.pin} refreshTrigger={refreshTrigger} />
                            </span>
                            <button
                              onClick={() => openRateEditModal(user.pin)}
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                              Change
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role?.toLowerCase() === "admin"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}>
                            {user.role?.toLowerCase() === "admin" ? "Admin" : "Member"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditUser(user.pin)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.pin)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <div className="text-slate-500 dark:text-slate-400">
                            {searchTerm ? `No users found matching "${searchTerm}"` : `No ${activeTab} found`}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-0">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-96 max-w-full">
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              {editingPin ? "Edit Employee" : `Add New ${role === "admin" ? "Admin" : "Member"}`}
            </h3>
            
            <div className="space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                type="email"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-digit PIN"
                maxLength="4"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {!editingPin && (
                <input
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="Hourly Rate (USD)"
                  type="number"
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
              </input>
              
              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                {editingPin ? (
                  <button
                    onClick={handleUpdateUser}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? "Updating..." : "Update"}
                  </button>
                ) : (
                  <button
                    onClick={handleAddUser}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? "Adding..." : "Add Employee"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hourly Rate Modal */}
      {showRateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-96 max-w-full">
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              Edit Hourly Rate
            </h3>
            
            <div className="space-y-4">
              <input
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="Hourly Rate (USD)"
                type="number"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="applyRateToAllEntries"
                  checked={applyRateToAllEntries}
                  onChange={(e) => setApplyRateToAllEntries(e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="applyRateToAllEntries" className="text-sm text-slate-700 dark:text-slate-300">
                  Apply new hourly rate to all past entries
                </label>
              </div>
              
              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelRateEdit}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateHourlyRate}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Update Rate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-96 max-w-full">
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              {editingRoleId ? "Edit Role" : "Add New Role"}
            </h3>
            
            <div className="space-y-4">
              <input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Role Name (e.g., Manager, Cashier, Cook)"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <textarea
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Role Description (optional)"
                rows="3"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                value={roleHourlyRate}
                onChange={(e) => setRoleHourlyRate(e.target.value)}
                placeholder="Default Hourly Rate (USD)"
                type="number"
                step="0.01"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Role Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={roleColor}
                    onChange={(e) => setRoleColor(e.target.value)}
                    className="w-12 h-12 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer"
                  />
                  <input
                    value={roleColor}
                    onChange={(e) => setRoleColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelRoleEdit}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                {editingRoleId ? (
                  <button
                    onClick={handleUpdateRole}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? "Updating..." : "Update Role"}
                  </button>
                ) : (
                  <button
                    onClick={handleAddRole}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? "Adding..." : "Add Role"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
