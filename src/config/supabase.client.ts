import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Validate URL format
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

// Validate JWT key format (should start with 'eyJ')
const isValidJwtKey = (key: string | undefined): boolean => {
  if (!key) return false;
  return key.startsWith('eyJ');
};

if (!SUPABASE_URL) {
  throw new Error(
    'Missing SUPABASE_URL in .env - Please add your Supabase project URL',
  );
}

if (!isValidUrl(SUPABASE_URL)) {
  throw new Error(
    `Invalid SUPABASE_URL: "${SUPABASE_URL}" - Must be a valid URL starting with https://`,
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing SUPABASE_ANON_KEY in .env - Get this from Supabase Dashboard -> Settings -> API',
  );
}

if (!isValidJwtKey(SUPABASE_ANON_KEY)) {
  throw new Error(
    `Invalid SUPABASE_ANON_KEY: Keys should start with "eyJ" (JWT format). Got: "${SUPABASE_ANON_KEY.substring(0, 15)}..." - Please get correct keys from Supabase Dashboard -> Settings -> API`,
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in .env - Get this from Supabase Dashboard -> Settings -> API (use "service_role" key)',
  );
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
) as SupabaseClient;

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
) as SupabaseClient;
