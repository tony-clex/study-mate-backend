const env = typeof process !== 'undefined' ? process.env : undefined;

const rawApiUrl =
  env?.EXPO_PUBLIC_API_URL ||
  env?.API_URL ||
  env?.BACKEND_URL ||
  'http://192.168.1.172:3000';

export const API_URL = rawApiUrl.replace(/\/$/, '');
