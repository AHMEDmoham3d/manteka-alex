import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'coach';

export interface Organization {
  id: string;
  name: string;
  type: 'club' | 'youth_center';
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  organization_id: string | null;
  created_at: string;
  organization?: Organization;
}

export interface Player {
  id: string;
  full_name: string;
  age: number | null;
  belt: string | null;
  coach_id: string;
  created_at: string;
  coach?: Profile;
}
