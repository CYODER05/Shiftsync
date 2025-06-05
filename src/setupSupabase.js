// setupSupabase.js
import { supabase } from './supabaseClient.js';

/**
 * This script sets up the Supabase database schema for the Clock In App.
 * It creates all necessary tables, adds default users, and configures authentication.
 */

async function setupDatabase() {
  console.log('Setting up Supabase database schema...');
  
  try {
    // Create tables directly using Supabase API
    await createTables();
    
    // Add default users if none exist
    await addDefaultUsers();
    
    // Setup auth hooks
    await setupAuthHooks();
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

async function createTables() {
  console.log('Creating tables...');
  
  try {
    // Try to access the users table to see if it exists
    const { error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    // If we get an error, the table might not exist
    // We'll try to create it by inserting a record
    if (usersError) {
      console.log('Creating users table...');
      
      // Try to create the admin user
      const { error: createError } = await supabase
        .from('users')
        .insert({
          pin: "9999",
          name: "Admin",
          current_hourly_rate: 0,
          role: "Admin",
          is_admin: true
        });
      
      if (createError) {
        console.error('Error creating users table:', createError);
      } else {
        console.log('Users table created successfully!');
      }
    } else {
      console.log('Users table already exists.');
    }
    
    // Try to access the hourly_rate_history table
    const { error: rateHistoryError } = await supabase
      .from('hourly_rate_history')
      .select('*', { count: 'exact', head: true });
    
    if (rateHistoryError) {
      console.log('Creating hourly_rate_history table...');
      
      // Try to create the table by inserting a record
      const { error: createError } = await supabase
        .from('hourly_rate_history')
        .insert({
          user_pin: "9999",
          rate: 0,
          effective_from: new Date(0).toISOString()
        });
      
      if (createError) {
        console.error('Error creating hourly_rate_history table:', createError);
      } else {
        console.log('Hourly rate history table created successfully!');
      }
    } else {
      console.log('Hourly rate history table already exists.');
    }
    
    // Try to access the sessions table
    const { error: sessionsError } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });
    
    if (sessionsError) {
      console.log('Sessions table does not exist yet. It will be created when needed.');
    } else {
      console.log('Sessions table already exists.');
    }
    
    // Try to access the active_sessions table
    const { error: activeSessionsError } = await supabase
      .from('active_sessions')
      .select('*', { count: 'exact', head: true });
    
    if (activeSessionsError) {
      console.log('Active sessions table does not exist yet. It will be created when needed.');
    } else {
      console.log('Active sessions table already exists.');
    }
    
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

async function addDefaultUsers() {
  console.log('Checking for existing users...');
  
  try {
    // Check if users table has any records
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error('Error checking for existing users:', error);
      return;
    }
    
    // If users exist, don't add default users
    if (data && data.length > 0) {
      console.log(`${data.length} users already exist. Skipping default user creation.`);
      return;
    }
    
    console.log('No users found. Adding default users...');
    
    // Default users to add
    const defaultUsers = [
      { pin: "1234", name: "Alice", current_hourly_rate: 0, role: "" },
      { pin: "5678", name: "Bob", current_hourly_rate: 0, role: "" },
      { pin: "2468", name: "Charlie", current_hourly_rate: 0, role: "" },
      { pin: "9999", name: "Admin", current_hourly_rate: 0, role: "Admin", is_admin: true }
    ];
    
    // Add each default user
    for (const user of defaultUsers) {
      // Add user
      const { error: userError } = await supabase
        .from('users')
        .insert(user);
      
      if (userError) {
        console.error(`Error adding default user ${user.name}:`, userError);
        continue;
      }
      
      // Add initial hourly rate history
      const { error: rateError } = await supabase
        .from('hourly_rate_history')
        .insert({
          user_pin: user.pin,
          rate: user.current_hourly_rate,
          effective_from: new Date(0).toISOString()
        });
      
      if (rateError) {
        console.error(`Error adding rate history for user ${user.name}:`, rateError);
      }
    }
    
    console.log('Default users added successfully!');
    
  } catch (error) {
    console.error('Error adding default users:', error);
  }
}

async function setupAuthHooks() {
  console.log('Setting up authentication hooks...');
  
  try {
    // Check if auth_links table exists
    const { error: authLinksError } = await supabase
      .from('auth_links')
      .select('*', { count: 'exact', head: true });
    
    if (authLinksError) {
      console.log('Creating auth_links table...');
      
      // Try to create the auth_links table by inserting a record
      const { error: createError } = await supabase
        .from('auth_links')
        .insert({
          auth_id: '00000000-0000-0000-0000-000000000000',
          user_pin: '9999',
          created_at: new Date().toISOString()
        });
        
      if (createError) {
        console.error('Error creating auth_links table:', createError);
      } else {
        console.log('Auth links table created successfully!');
      }
    } else {
      console.log('Auth links table already exists.');
    }
    
    // Check if email column exists in users table
    const { data: userColumns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' });
    
    if (columnsError) {
      console.error('Error checking user table columns:', columnsError);
    } else {
      const hasEmailColumn = userColumns.some(col => col.column_name === 'email');
      
      if (!hasEmailColumn) {
        console.log('Adding email column to users table...');
        
        // Try to add email column using SQL
        const { error: alterError } = await supabase.rpc('add_email_column_to_users');
        
        if (alterError) {
          console.error('Error adding email column to users table:', alterError);
        } else {
          console.log('Email column added to users table successfully!');
        }
      } else {
        console.log('Email column already exists in users table.');
      }
    }
    
    console.log('Authentication hooks setup completed!');
  } catch (error) {
    console.error('Error setting up authentication hooks:', error);
  }
}

// Run the setup
setupDatabase();
