import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { AppContext } from '../context/AppContext'; // Adjust path as needed

// --- Stylesheets for Dark and Light Modes (Copied for consistency, centralize in a real app) ---
const darkStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#1f2937', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f9fafb' },
  iconText: { color: '#9ca3af', fontSize: 24 },
  placeholderText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 40,
  },
  listItem: {
    backgroundColor: '#374151', // gray-700
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemText: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listItemSubText: {
    color: '#9ca3af',
    fontSize: 12,
  },
});

const lightStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  iconText: { color: '#4b5563', fontSize: 24 },
  placeholderText: {
    color: '#4b5563',
    textAlign: 'center',
    paddingVertical: 40,
  },
  listItem: {
    backgroundColor: '#ffffff', // white
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb', // gray-200
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listItemSubText: {
    color: '#4b5563',
    fontSize: 12,
  },
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


const SelectSetupScreen = () => {
  const { state, navigateTo, goBackToPreviousPage, t } = useContext(AppContext);
  const isLightMode = state.currentTheme === 'light';
  const currentStyles = isLightMode ? lightStyles : darkStyles;

  return (
    <View style={currentStyles.page}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
          <Text style={currentStyles.iconText}>⬅️</Text>
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>{t('select_setup')}</Text>
        <View style={{ width: 30 }} /> {/* Spacer for alignment */}
      </View>

      <ScrollView contentContainerStyle={styles.contentPadding}>
        <Text style={currentStyles.placeholderText}>{t('select_setup_description')}</Text>

        {/* List of Setups */}
        {state.setups.length === 0 ? (
          <Text style={currentStyles.placeholderText}>{t('no_setups_available')}</Text>
        ) : (
          state.setups.map(setup => (
            <TouchableOpacity
              key={setup.id}
              // Navigate to Checklist screen, passing the selected setupId
              onPress={() => navigateTo('Checklist', { setupId: setup.id })}
              style={currentStyles.listItem}
            >
              <View>
                <Text style={currentStyles.listItemText}>{setup.name}</Text>
                <Text style={currentStyles.listItemSubText}>{setup.description}</Text>
              </View>
              <Text style={currentStyles.iconText}>➡️</Text> {/* Right arrow icon */}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default SelectSetupScreen;
