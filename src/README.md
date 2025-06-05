# ShiftSync - Time Tracking Application

ShiftSync is a time tracking application that allows employees to clock in and out, and administrators to manage employees and view time sheets.

## Supabase Integration

This application uses Supabase as its backend database, providing several benefits:

- Data persistence across devices
- Multi-user concurrent access
- Better data integrity with constraints
- Improved query capabilities for reporting
- Scalability for larger datasets

## Database Schema

The application uses the following tables in Supabase:

1. **users** - Stores employee information
   - id: UUID (primary key)
   - pin: VARCHAR(4) (unique)
   - name: VARCHAR(255)
   - role: VARCHAR(255)
   - current_hourly_rate: DECIMAL(10, 2)
   - is_admin: BOOLEAN
   - created_at: TIMESTAMP
   - updated_at: TIMESTAMP

2. **sessions** - Stores clock in/out records
   - id: UUID (primary key)
   - user_pin: VARCHAR(4) (foreign key to users.pin)
   - clock_in: TIMESTAMP
   - clock_out: TIMESTAMP
   - duration: BIGINT (in milliseconds)
   - created_at: TIMESTAMP
   - updated_at: TIMESTAMP

3. **active_sessions** - Stores currently active sessions
   - id: UUID (primary key)
   - user_pin: VARCHAR(4) (foreign key to users.pin)
   - clock_in: TIMESTAMP
   - created_at: TIMESTAMP

4. **hourly_rate_history** - Stores history of hourly rate changes
   - id: UUID (primary key)
   - user_pin: VARCHAR(4) (foreign key to users.pin)
   - rate: DECIMAL(10, 2)
   - effective_from: TIMESTAMP
   - created_at: TIMESTAMP

## Setup Instructions

### Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from the API settings

### Configuration

1. Update the `supabaseUrl` and `supabaseAnonKey` in `supabaseClient.js` with your project values

### Database Setup

The application will automatically set up the database schema when it starts. If you want to manually set up the schema, you can run:

```bash
node setupSupabase.js
```

This script will:
1. Create necessary tables by inserting initial records
2. Add default users if none exist

## Table Creation

The application creates tables by attempting to insert records. If a table doesn't exist, Supabase will automatically create it with the appropriate schema. This approach avoids the need for SQL execution privileges.

## Default Users

When the database is first initialized, the following default users are created:

- Alice (PIN: 1234)
- Bob (PIN: 5678)
- Charlie (PIN: 2468)
- Admin (PIN: 9999) - Has admin privileges

## Development

### Running the Application

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## Features

- Employee clock in/out
- Admin panel for managing employees
- Time sheet with filtering and date range selection
- Hourly rate tracking with history
- Role-based access control
