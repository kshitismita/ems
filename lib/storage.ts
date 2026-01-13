// Local storage utilities for client-side data management

export const getLocalStorage = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const item = window.localStorage.getItem(key);
    return item;
  } catch (error) {
    console.error(`Error getting localStorage item "${key}":`, error);
    return null;
  }
};

export const setLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error setting localStorage item "${key}":`, error);
  }
};

export const removeLocalStorage = (key: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing localStorage item "${key}":`, error);
  }
};

export const clearLocalStorage = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    window.localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};
