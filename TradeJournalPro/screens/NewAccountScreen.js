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
import { AppContext } from '../context/AppContext'; // Adjust path as needed

// --- Stylesheets for Dark and Light Modes (Copied for consistency, centralize in a real app) ---
const darkStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#1f2937', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f9fafb' },
  iconText: { color: '#9ca3af', fontSize: 24 },
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
  placeholderText: { // For input placeholders
    color: '#9ca3af',
  },
  actionButtonGreen: {
    backgroundColor: '#10b981', // green-600
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

const lightStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  iconText: { color: '#4b5563', fontSize: 24 },
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
  placeholderText: { // For input placeholders
    color: '#6b7280', // gray-500
  },
  actionButtonGreen: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
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
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

// --- Global styles (common to both themes or structural) ---
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 0,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  iconButton: {
    padding: 4,
  },
  contentPadding: {
    paddingBottom: 20,
  },
});


const NewAccountScreen = () => {
  const { state, navigateTo, goBackToPreviousPage, setState: setGlobalState, t } = useContext(AppContext);
  const isLightMode = state.currentTheme === 'light';
  const currentStyles = isLightMode ? lightStyles : darkStyles;

  const [accountName, setAccountName] = useState('');
  const [accountBalance, setAccountBalance] = useState('0'); // Keep as string for TextInput

  const saveAccount = () => {
    // Basic validation
    if (!accountName.trim() || isNaN(parseFloat(accountBalance))) {
      Alert.alert(t('please_fill_all_fields'));
      return;
    }

    const newBalance = parseFloat(accountBalance);

    setGlobalState(prevState => {
      const newId = prevState.accounts.length > 0 ? Math.max(...prevState.accounts.map(a => a.id)) + 1 : 1;
      return {
        ...prevState,
        accounts: [...prevState.accounts, { id: newId, name: accountName.trim(), balance: newBalance }]
      };
    });
    Alert.alert(t('account_saved_successfully'));
    goBackToPreviousPage(); // Go back to accounts list
  };

  return (
    <View style={currentStyles.page}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
          <Text style={currentStyles.iconText}>⬅️</Text>
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>{t('add_new_account')}</Text>
        <View style={{ width: 30 }} />{/* Spacer for alignment */}
      </View>

      <ScrollView contentContainerStyle={styles.contentPadding}>
        {/* Account Name Input */}
        <Text style={currentStyles.label}>{t('account_name')}</Text>
        <TextInput
          style={currentStyles.input}
          placeholder={t('e_g_main_account_placeholder')}
          placeholderTextColor={currentStyles.placeholderText.color}
          value={accountName}
          onChangeText={setAccountName}
          autoCapitalize="words"
        />

        {/* Initial Balance Input */}
        <Text style={currentStyles.label}>{t('initial_balance')}</Text>
        <TextInput
          style={currentStyles.input}
          placeholder="10000"
          placeholderTextColor={currentStyles.placeholderText.color}
          keyboardType="numeric" // Only numbers
          value={accountBalance}
          onChangeText={setAccountBalance}
        />

        {/* Save Account Button */}
        <TouchableOpacity onPress={saveAccount} style={currentStyles.actionButtonGreen}>
          <Text style={currentStyles.actionButtonText}>{t('save_account')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default NewAccountScreen;