import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser, getMyProfile, updateMyPreferences } from '../api/auth';
import { getAccounts } from '../api/accounts';
import { getSetups } from '../api/setups';
import { getTrades } from '../api/trades';
import { useAppData } from './AppDataContext';

// Combined AppContext - provides everything screens need
export const AppContext = createContext();

export const AppProvider = ({ children, navigationRef }) => {
  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get AppData context values
  const { state, dispatch, t, toggleTheme, setLanguage, currentStyles } = useAppData();

  // Navigation helper using ref from App.js
  const navigateTo = (screen, params) => {
    if (navigationRef?.isReady()) {
      navigationRef.navigate(screen, params);
    }
  };

  // Fetch user data (accounts, setups, trades) from backend
  const fetchUserData = async (userToken) => {
    try {
      const [accountsData, setupsData, tradesData] = await Promise.all([
        getAccounts(userToken).catch(() => []),
        getSetups(userToken).catch(() => []),
        getTrades(userToken).catch(() => []),
      ]);
      dispatch({ type: 'SET_ACCOUNTS', payload: accountsData });
      dispatch({ type: 'SET_SETUPS', payload: setupsData });
      dispatch({ type: 'SET_TRADES', payload: tradesData });
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  // Load user from storage on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        if (storedToken) {
          setToken(storedToken);
          const userData = await getMyProfile(storedToken);
          setUser(userData);
          if (userData && userData.preferences) {
            dispatch({ type: 'SET_THEME', payload: userData.preferences.theme });
            dispatch({ type: 'SET_LANGUAGE', payload: userData.preferences.language });
          }
          await fetchUserData(storedToken);
        }
      } catch (error) {
        console.error('Failed to load user from storage', error);
        await AsyncStorage.removeItem('userToken');
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const userData = await loginUser(username, password);
      await AsyncStorage.setItem('userToken', userData.token);
      setUser(userData);
      setToken(userData.token);
      if (userData.preferences) {
        dispatch({ type: 'SET_THEME', payload: userData.preferences.theme });
        dispatch({ type: 'SET_LANGUAGE', payload: userData.preferences.language });
      }
      await fetchUserData(userData.token);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: typeof error === 'string' ? error : (error.message || 'Login failed') };
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
      if (userData.preferences) {
        dispatch({ type: 'SET_THEME', payload: userData.preferences.theme });
        dispatch({ type: 'SET_LANGUAGE', payload: userData.preferences.language });
      }
      await fetchUserData(userData.token);
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: typeof error === 'string' ? error : (error.message || 'Registration failed') };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setToken(null);
      setUser(null);
      dispatch({ type: 'SET_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_SETUPS', payload: [] });
      dispatch({ type: 'SET_TRADES', payload: [] });
      dispatch({ type: 'SET_THEME', payload: 'dark' });
      dispatch({ type: 'SET_LANGUAGE', payload: 'th' });
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
      dispatch({ type: 'SET_THEME', payload: updatedUserPreferences.preferences.theme });
      dispatch({ type: 'SET_LANGUAGE', payload: updatedUserPreferences.preferences.language });
      return { success: true };
    } catch (error) {
      console.error('Update preferences error:', error);
      return { success: false, message: error.message || 'Failed to update preferences' };
    }
  };

  return (
    <AppContext.Provider value={{
      // AppData values
      state, dispatch, t, toggleTheme, setLanguage, currentStyles,
      // Auth values
      user, token, isLoading, login, register, logout, updatePreferences,
      // Navigation
      navigateTo,
      // Data refresh
      fetchUserData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook for auth-specific usage (backward compat for SocketContext)
export const useAuth = () => {
  const context = useContext(AppContext);
  return {
    user: context.user,
    token: context.token,
    isLoading: context.isLoading,
    login: context.login,
    register: context.register,
    logout: context.logout,
    updatePreferences: context.updatePreferences,
  };
};
