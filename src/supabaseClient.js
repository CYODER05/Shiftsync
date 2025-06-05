// supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Replace these with your actual project values from Supabase
const supabaseUrl = 'https://yzgnhvgziwmhpreffjhv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Z25odmd6aXdtaHByZWZmamh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMDU3MTIsImV4cCI6MjA2Mzg4MTcxMn0.1sa7DLcLjAOBmliGnhulx1DldFFHkcq2fIJGyjhLi1E'

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
