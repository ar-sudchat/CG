import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { AppContext } from '../../context/AppContext'; // Adjust path as needed (assuming Auth folder)

// --- Stylesheets for Dark and Light Modes (Copied for consistency, centralize in a real app) ---
const darkStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#1f2937', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, justifyContent: 'center' },
  appTitle: { fontSize: 30, fontWeight: 'bold', color: '#f9fafb', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#9ca3af', marginBottom: 30, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '500', color: '#9ca3af', marginBottom: 4, marginTop: 16 },
  input: {
    backgroundColor: '#374151', // gray-700
    borderColor: '#4b5563', // gray-600
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#f9fafb', // white
    fontSize: 16,
    marginBottom: 12,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  actionButton: {
    backgroundColor: '#2563eb', // blue-600
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  linkButtonText: {
    color: '#60a5fa', // blue-400
    fontSize: 14,
    fontWeight: '500',
  },
  logoIcon: {
    fontSize: 60, // Large size for the logo
    color: '#60a5fa', // blue-400
    textAlign: 'center',
    marginBottom: 20,
  },
});

const lightStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, justifyContent: 'center' },
  appTitle: { fontSize: 30, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#4b5563', marginBottom: 30, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 4, marginTop: 16 },
  input: {
    backgroundColor: '#ffffff', // white
    borderColor: '#d1d5db', // gray-300
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#1f2937', // gray-800
    fontSize: 16,
    marginBottom: 12,
  },
  placeholderText: {
    color: '#6b7280',
  },
  actionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  linkButtonText: {
    color: '#2563eb', // blue-600
    fontSize: 14,
    fontWeight: '500',
  },
  logoIcon: {
    fontSize: 60,
    color: '#2563eb', // blue-600
    textAlign: 'center',
    marginBottom: 20,
  },
});

// --- Global styles (common to both themes or structural) ---
const styles = StyleSheet.create({
  // No specific global styles needed here as page style handles background
  // and other elements are styled by currentStyles
});


const RegisterScreen = () => {
  const { state, navigateTo, setState: setGlobalState, t } = useContext(AppContext);
  const isLightMode = state.currentTheme === 'light';
  const currentStyles = isLightMode ? lightStyles : darkStyles;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = () => {
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert(t('please_fill_all_fields'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('password_mismatch') || 'รหัสผ่านไม่ตรงกัน');
      return;
    }
    // Basic email validation (can be more robust)
    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert(t('invalid_email') || 'รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    // --- Placeholder for API call ---
    // In a real app, you would call your backend registration API here:
    // try {
    //   const response = await authApi.register(username, email, password);
    //   if (response.success) {
    //     Alert.alert('Registration Successful', 'You can now log in.');
    //     navigateTo('Login'); // Navigate to login screen after successful registration
    //   } else {
    //     Alert.alert('Registration Failed', response.message || 'Something went wrong.');
    //   }
    // } catch (error) {
    //   Alert.alert('Error', 'Could not connect to server.');
    // }

    // --- For now, simulate successful registration and navigate to LoginScreen ---
    Alert.alert('Registration Successful', 'Simulated registration. Please log in.');
    navigateTo('Login'); // Navigate to LoginScreen after simulated registration
  };

  return (
    <ScrollView contentContainerStyle={[currentStyles.page, { flexGrow: 1 }]}>
      {/* Logo Icon (using emoji for simplicity) */}
      <Text style={currentStyles.logoIcon}>📈</Text> {/* Changed emoji for variety */}

      {/* App Title and Subtitle */}
      <Text style={currentStyles.appTitle}>{t('app_title')}</Text>
      <Text style={currentStyles.subtitle}>{t('register_subtitle') || 'สร้างบัญชีเพื่อเริ่มต้นบันทึกการเทรด'}</Text>

      {/* Username Input */}
      <Text style={currentStyles.label}>{t('username')}</Text>
      <TextInput
        style={currentStyles.input}
        placeholder={t('username')}
        placeholderTextColor={currentStyles.placeholderText.color}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      {/* Email Input */}
      <Text style={currentStyles.label}>{t('email') || 'อีเมล'}</Text>
      <TextInput
        style={currentStyles.input}
        placeholder={t('email_placeholder') || 'your@email.com'}
        placeholderTextColor={currentStyles.placeholderText.color}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      {/* Password Input */}
      <Text style={currentStyles.label}>{t('password')}</Text>
      <TextInput
        style={currentStyles.input}
        placeholder={t('password')}
        placeholderTextColor={currentStyles.placeholderText.color}
        secureTextEntry // Hide password characters
        value={password}
        onChangeText={setPassword}
      />

      {/* Confirm Password Input */}
      <Text style={currentStyles.label}>{t('confirm_password') || 'ยืนยันรหัสผ่าน'}</Text>
      <TextInput
        style={currentStyles.input}
        placeholder={t('confirm_password') || 'ยืนยันรหัสผ่าน'}
        placeholderTextColor={currentStyles.placeholderText.color}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {/* Register Button */}
      <TouchableOpacity onPress={handleRegister} style={currentStyles.actionButton}>
        <Text style={currentStyles.actionButtonText}>{t('register_button') || 'ลงทะเบียน'}</Text>
      </TouchableOpacity>

      {/* Link to Login Screen */}
      <TouchableOpacity onPress={() => navigateTo('Login')} style={currentStyles.linkButton}>
        <Text style={currentStyles.linkButtonText}>{t('login_link') || 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default RegisterScreen;
