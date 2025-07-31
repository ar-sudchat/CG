import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser, getMyProfile, updateMyPreferences } from '../api/auth';
import { Alert } from 'react-native';
import { AppDataContext } from './AppDataContext'; // Import AppDataContext to access language/theme

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { state: appState, dispatch: appDispatch } = useContext(AppDataContext);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        if (storedToken) {
          setToken(storedToken);
          const userData = await getMyProfile(storedToken);
          setUser(userData);
          // Set initial theme and language from user preferences
          if (userData && userData.preferences) {
            appDispatch({ type: 'SET_THEME', payload: userData.preferences.theme });
            appDispatch({ type: 'SET_LANGUAGE', payload: userData.preferences.language });
          }
        }
      } catch (error) {
        console.error('Failed to load user from storage', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [appDispatch]);

  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const userData = await loginUser(username, password);
      await AsyncStorage.setItem('userToken', userData.token);
      setUser(userData);
      setToken(userData.token);
      // Update theme and language from user preferences
      if (userData.preferences) {
        appDispatch({ type: 'SET_THEME', payload: userData.preferences.theme });
        appDispatch({ type: 'SET_LANGUAGE', payload: userData.preferences.language });
      }
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username, email, password) => {
    setIsLoading(true);
    try {
      const userData = await registerUser(username, email, password);
      await AsyncStorage.setItem('userToken', userData.token);
      setUser(userData);
      setToken(userData.token);
      // Set initial theme and language from user preferences (defaults to dark/th if not set by backend)
      if (userData.preferences) {
        appDispatch({ type: 'SET_THEME', payload: userData.preferences.theme });
        appDispatch({ type: 'SET_LANGUAGE', payload: userData.preferences.language });
      }
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: error.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setToken(null);
      setUser(null);
      // Reset app preferences to default on logout
      appDispatch({ type: 'SET_THEME', payload: 'dark' });
      appDispatch({ type: 'SET_LANGUAGE', payload: 'th' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updatePreferences = async (preferences) => {
    if (!token) return { success: false, message: "No token found" };
    try {
      const updatedUserPreferences = await updateMyPreferences(token, preferences);
      setUser(prevUser => ({
        ...prevUser,
        preferences: updatedUserPreferences.preferences
      }));
      appDispatch({ type: 'SET_THEME', payload: updatedUserPreferences.preferences.theme });
      appDispatch({ type: 'SET_LANGUAGE', payload: updatedUserPreferences.preferences.language });
      return { success: true };
    } catch (error) {
      console.error('Update preferences error:', error);
      return { success: false, message: error.message || 'Failed to update preferences' };
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};