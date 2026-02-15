// App.js
import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import screen components
import MainScreen from './screens/MainScreen';
import AccountsScreen from './screens/AccountsScreen';
import NewAccountScreen from './screens/NewAccountScreen';
import AccountDetailScreen from './screens/AccountDetailScreen';
import SetupsScreen from './screens/SetupsScreen';
import NewSetupScreen from './screens/NewSetupScreen';
import SetupDetailScreen from './screens/SetupDetailScreen';
import HistoryScreen from './screens/HistoryScreen';
import TradeDetailScreen from './screens/TradeDetailScreen';
import NewTradeScreen from './screens/NewTradeScreen';
import SelectSetupScreen from './screens/SelectSetupScreen';
import ChecklistScreen from './screens/ChecklistScreen';

// Import new screens for Forex & SMC/ICT Analysis
import LivePricesScreen from './screens/LivePricesScreen';
import PairDetailScreen from './screens/PairDetailScreen';
import AlertsScreen from './screens/AlertsScreen';
import NewAlertScreen from './screens/NewAlertScreen';
import AiAnalysisScreen from './screens/AiAnalysisScreen';
import KnowledgeBaseScreen from './screens/KnowledgeBaseScreen';
import AnalysisScreen from './screens/AnalysisScreen';

// Import Auth screens
import LoginScreen from './screens/Auth/LoginScreen';
import RegisterScreen from './screens/Auth/RegisterScreen';

// Import Providers
import { AppDataProvider } from './context/AppDataContext';
import { AppContext, AppProvider } from './context/AppContext';
import { SocketProvider } from './context/SocketContext';

// Create navigators outside components
const AuthStack = createStackNavigator();
const AppStack = createStackNavigator();
const RootStack = createStackNavigator();

// Navigation ref for use in context
const navigationRef = createNavigationContainerRef();

const AuthStackScreens = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const AppStackScreens = () => (
  <AppStack.Navigator screenOptions={{ headerShown: false }}>
    <AppStack.Screen name="Main" component={MainScreen} />
    <AppStack.Screen name="Accounts" component={AccountsScreen} />
    <AppStack.Screen name="NewAccount" component={NewAccountScreen} />
    <AppStack.Screen name="AccountDetail" component={AccountDetailScreen} />
    <AppStack.Screen name="Setups" component={SetupsScreen} />
    <AppStack.Screen name="NewSetup" component={NewSetupScreen} />
    <AppStack.Screen name="SetupDetail" component={SetupDetailScreen} />
    <AppStack.Screen name="History" component={HistoryScreen} />
    <AppStack.Screen name="TradeDetail" component={TradeDetailScreen} />
    <AppStack.Screen name="NewTrade" component={NewTradeScreen} />
    <AppStack.Screen name="SelectSetup" component={SelectSetupScreen} />
    <AppStack.Screen name="Checklist" component={ChecklistScreen} />
    <AppStack.Screen name="LivePrices" component={LivePricesScreen} />
    <AppStack.Screen name="PairDetail" component={PairDetailScreen} />
    <AppStack.Screen name="Alerts" component={AlertsScreen} />
    <AppStack.Screen name="NewAlert" component={NewAlertScreen} />
    <AppStack.Screen name="AiAnalysis" component={AiAnalysisScreen} />
    <AppStack.Screen name="KnowledgeBase" component={KnowledgeBaseScreen} />
    <AppStack.Screen name="Analysis" component={AnalysisScreen} />
  </AppStack.Navigator>
);

// Inner component that checks auth state to decide which stack to show
const RootNavigator = () => {
  const { user, isLoading } = useContext(AppContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1f2937' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="App" component={AppStackScreens} />
      ) : (
        <>
          <RootStack.Screen name="Auth" component={AuthStackScreens} />
          <RootStack.Screen name="App" component={AppStackScreens} />
        </>
      )}
    </RootStack.Navigator>
  );
};

const App = () => {
  return (
    <AppDataProvider>
      <NavigationContainer ref={navigationRef}>
        <AppProvider navigationRef={navigationRef}>
          <SocketProvider>
            <RootNavigator />
          </SocketProvider>
        </AppProvider>
      </NavigationContainer>
    </AppDataProvider>
  );
};

export default App;
