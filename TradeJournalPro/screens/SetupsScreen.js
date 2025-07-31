import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert, // Although not directly used here, often needed in screens
  Dimensions, // For responsive styles if needed
} from 'react-native';
import { AppContext } from '../context/AppContext'; // Adjust path as needed

// --- Stylesheets for Dark and Light Modes (Copied for consistency, centralize in a real app) ---
const darkStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#1f2937', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f9fafb' },
  iconText: { color: '#9ca3af', fontSize: 24 },
  actionButton: {
    backgroundColor: '#2563eb', // blue-600 for consistency with main page "New Trade"
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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
  placeholderText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 40,
  },
});

const lightStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  iconText: { color: '#4b5563', fontSize: 24 },
  actionButton: {
    backgroundColor: '#2563eb', // blue-600
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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
  placeholderText: {
    color: '#4b5563',
    textAlign: 'center',
    paddingVertical: 40,
  },
});

// --- Global styles (common to both themes or structural) ---
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 0, // Padding handled by page itself
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  iconButton: {
    padding: 4,
  },
  contentPadding: {
    paddingBottom: 20, // Add some padding at the bottom of scroll views
  },
  // Additional styles from App.js that might be needed for consistency
  tradeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeDirectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tradeCardRight: {
    alignItems: 'flex-end',
  },
  tradeHistoryCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  tradeHistoryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tradeHistoryPair: { fontWeight: 'bold', fontSize: 20, marginTop: 4 },
  tradeHistoryAccount: { fontSize: 12 },
  tradeHistoryPnlSection: { alignItems: 'flex-end' },
  tradeHistoryPnl: { fontWeight: 'bold', fontSize: 24, },
  tradeHistoryDate: { fontSize: 12 },
  tradeHistoryCardBottom: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeHistorySetup: { fontSize: 14 },
  boldText: { fontWeight: 'bold' },
  tradeOutcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
});


const SetupsScreen = () => {
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
        <Text style={currentStyles.headerTitle}>{t('menu_setups')}</Text>
        <TouchableOpacity onPress={() => navigateTo('NewSetup')} style={styles.iconButton}>
          <Text style={currentStyles.iconText}>➕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentPadding}>
        {/* Create New Setup Button */}
        <TouchableOpacity onPress={() => navigateTo('NewSetup')} style={currentStyles.actionButton}>
          <Text style={currentStyles.actionButtonText}>{t('add_new_setup')}</Text>
        </TouchableOpacity>

        {/* List of Setups */}
        {state.setups.length === 0 ? (
          <Text style={currentStyles.placeholderText}>{t('no_setups_yet')}</Text>
        ) : (
          state.setups.map(setup => {
            const totalConditions = (setup.checklist?.length || 0) + (setup.psychologyChecklist?.length || 0);
            return (
              <TouchableOpacity
                key={setup.id}
                onPress={() => navigateTo('SetupDetail', { setupId: setup.id })}
                style={currentStyles.listItem}
              >
                <View>
                  <Text style={currentStyles.listItemText}>{setup.name}</Text>
                  <Text style={currentStyles.listItemSubText}>
                    {setup.description || t('no_description')}
                  </Text>
                  <Text style={currentStyles.listItemSubText}>
                    {t('conditions')}: {totalConditions} {t('items')}
                  </Text>
                </View>
                <Text style={currentStyles.iconText}>➡️</Text> {/* Right arrow icon */}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default SetupsScreen;