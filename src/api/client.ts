import axios from 'axios'

/**
 * Transport only — no auth policy lives here. Response handling for 401/403 is
 * registered by AuthProvider, which sits inside the router and so can navigate
 * softly and raise a toast instead of reloading the page.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})
