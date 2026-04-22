'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.supabaseAdmin = exports.supabase = void 0;
const supabase_js_1 = require('@supabase/supabase-js');
const dotenv = __importStar(require('dotenv'));
dotenv.config();
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const isValidUrl = (url) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};
const isValidJwtKey = (key) => {
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
exports.supabase = (0, supabase_js_1.createClient)(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
exports.supabaseAdmin = (0, supabase_js_1.createClient)(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
//# sourceMappingURL=supabase.client.js.map
