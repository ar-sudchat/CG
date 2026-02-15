import React, { createContext, useReducer, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightStyles, darkStyles } from '../utils/styles'; // Import styles
import { translations } from '../utils/constants'; // Import translations

const AppDataContext = createContext();

const appDataReducer = (state, action) => {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, currentTheme: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, currentLanguage: action.payload };
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload };
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT':
      return { ...state, accounts: state.accounts.map(acc => acc._id === action.payload._id ? action.payload : acc) };
    case 'DELETE_ACCOUNT':
      return { ...state, accounts: state.accounts.filter(acc => acc._id !== action.payload) };
    case 'SET_SETUPS':
      return { ...state, setups: action.payload };
    case 'ADD_SETUP':
      return { ...state, setups: [...state.setups, action.payload] };
    case 'UPDATE_SETUP':
      return { ...state, setups: state.setups.map(setup => setup._id === action.payload._id ? action.payload : setup) };
    case 'DELETE_SETUP':
      return { ...state, setups: state.setups.filter(setup => setup._id !== action.payload) };
    case 'SET_TRADES':
      return { ...state, trades: action.payload };
    case 'ADD_TRADE':
      return { ...state, trades: [...state.trades, action.payload] };
    case 'UPDATE_TRADE':
      return { ...state, trades: state.trades.map(trade => trade._id === action.payload._id ? action.payload : trade) };
    case 'DELETE_TRADE':
      return { ...state, trades: state.trades.filter(trade => trade._id !== action.payload) };
    case 'SET_CURRENT_TRADE_DRAFT': // For NewTradeScreen's temporary data
      return { ...state, currentTradeDraft: { ...state.currentTradeDraft, ...action.payload } };
    case 'CLEAR_CURRENT_TRADE_DRAFT':
      return { ...state, currentTradeDraft: {} };
    default:
      return state;
  }
};

export const AppDataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appDataReducer, {
    currentTheme: 'light', // Default theme
    currentLanguage: 'th', // Default language
    accounts: [],
    setups: [],
    trades: [],
    currentTradeDraft: {}, // Temporary data for new trade flow
  });

  const t = (key) => {
    return translations[state.currentLanguage]?.[key] || key;
  };

  const toggleTheme = async () => {
    const newTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
    dispatch({ type: 'SET_THEME', payload: newTheme });
    await AsyncStorage.setItem('appTheme', newTheme);
  };

  const setLanguage = async (lang) => {
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
    await AsyncStorage.setItem('appLanguage', lang);
  };

  // Load initial preferences from AsyncStorage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('appTheme');
        const storedLang = await AsyncStorage.getItem('appLanguage');
        if (storedTheme) {
          dispatch({ type: 'SET_THEME', payload: storedTheme });
        }
        if (storedLang) {
          dispatch({ type: 'SET_LANGUAGE', payload: storedLang });
        }
      } catch (error) {
        console.error("Failed to load app preferences:", error);
      }
    };
    loadPreferences();
  }, []);

  const currentStyles = state.currentTheme === 'light' ? lightStyles : darkStyles;

  return (
    <AppDataContext.Provider value={{ state, dispatch, t, toggleTheme, setLanguage, currentStyles }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  return useContext(AppDataContext);
};