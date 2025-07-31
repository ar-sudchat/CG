// App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import your screen components
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

// Import Auth screens
import LoginScreen from './screens/Auth/LoginScreen';
import RegisterScreen from './screens/Auth/RegisterScreen';

// Import AppContext
import { AppContext, AppProvider } from './context/AppContext';

// --- Stylesheets for Dark and Light Modes (ควรย้ายไปไฟล์แยก หรือรวมใน App.js ถ้ายังไม่ได้แยก) ---
// เนื่องจากโค้ดสไตล์ค่อนข้างยาว ฉันจะละไว้ที่นี่ แต่คุณควรนำมาจาก App.js เดิมของคุณ
// หรือถ้าคุณแยกไฟล์สไตล์แล้ว ให้นำเข้าที่นี่
const darkStyles = StyleSheet.create({ /* ... */ });
const lightStyles = StyleSheet.create({ /* ... */ });
const styles = StyleSheet.create({ /* ... */ });

// สร้าง Stack Navigator
const AuthStack = createStackNavigator();
const AppStack = createStackNavigator();

// คอมโพเนนต์สำหรับหน้าจอ Authentication
const AuthStackScreens = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// คอมโพเนนต์สำหรับหน้าจอหลักของแอป
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
  </AppStack.Navigator>
);


const App = () => {
  // ใช้ AppContext เพื่อจัดการสถานะทั่วโลก
  const { state } = useContext(AppContext); // ดึง state จาก AppContext

  // กำหนด Root Navigator ที่จะสลับระหว่าง Auth Stack และ App Stack
  // ในแอปจริง คุณจะใช้สถานะการล็อกอิน (เช่น user token) เพื่อตัดสินใจว่าจะแสดง AuthStack หรือ AppStack
  // สำหรับตอนนี้ เราจะเริ่มที่ AuthStack ก่อน
  const RootStack = createStackNavigator();

  return (
    <AppProvider> {/* AppProvider จะครอบ NavigationContainer */}
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {/* ตรวจสอบสถานะการล็อกอินที่นี่ในแอปจริง */}
          {/* {userToken ? (
            <RootStack.Screen name="App" component={AppStackScreens} />
          ) : (
            <RootStack.Screen name="Auth" component={AuthStackScreens} />
          )} */}
          {/* สำหรับตอนนี้ เราจะแสดง AuthStack เสมอ เพื่อให้เห็น Login/Register */}
          <RootStack.Screen name="Auth" component={AuthStackScreens} />
          {/* เมื่อล็อกอินสำเร็จ navigateTo('Main') จะเปลี่ยนไปที่ AppStackScreens */}
          <RootStack.Screen name="App" component={AppStackScreens} />
        </RootStack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
};

export default App;