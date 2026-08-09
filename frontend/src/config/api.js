/**
 * Smart API Base URL Resolver for Electron & Web Browser
 * Resolves empty window.location.hostname in Electron file:// protocol automatically.
 */
const getHostname = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname.trim() !== '') {
    return window.location.hostname;
  }
  return '127.0.0.1';
};

export const API_HOST = getHostname();
export const API_PORT = 3001;
export const SERVER_ORIGIN = `http://${API_HOST}:${API_PORT}`;
export const API_BASE_URL = `${SERVER_ORIGIN}/api`;

export default API_BASE_URL;
