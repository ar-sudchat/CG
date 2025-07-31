import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert, // For potential future edit/delete actions from detail screen
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
  card: {
    backgroundColor: '#374151', // gray-700
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, color: '#9ca3af', marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#f9fafb' },
  listItemSubText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  sectionTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#f9fafb', marginBottom: 10, marginTop: 20 },
  actionButton: { // For edit setup button
    backgroundColor: '#2563eb', // blue-600
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
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
  card: {
    backgroundColor: '#ffffff', // white
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb', // gray-200
  },
  cardTitle: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  listItemSubText: {
    color: '#4b5563',
    fontSize: 12,
  },
  sectionTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 10, marginTop: 20 },
  actionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
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
  // Additional styles from App.js that might be needed for consistency
  boldText: { fontWeight: 'bold' },
});


const SetupDetailScreen = () => {
    const { state, navigateTo, goBackToPreviousPage, t } = useContext(AppContext);
    const isLightMode = state.currentTheme === 'light';
    const currentStyles = isLightMode ? lightStyles : darkStyles;

    // Get setupId from navigation params (passed via navigateTo)
    const setupId = state.currentTrade?.setupId;
    const setup = state.setups.find(s => s.id === setupId);

    if (!setup) {
        return (
            <View style={currentStyles.page}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
                        <Text style={currentStyles.iconText}>⬅️</Text>
                    </TouchableOpacity>
                    <Text style={currentStyles.headerTitle}>{t('setup_detail')}</Text>
                    <View style={{ width: 30 }} /> {/* Spacer */}
                </View>
                <Text style={currentStyles.placeholderText}>{t('setup_not_found')}</Text>
            </View>
        );
    }

    return (
        <View style={currentStyles.page}>
            {/* Header Section */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
                    <Text style={currentStyles.iconText}>⬅️</Text>
                </TouchableOpacity>
                <Text style={currentStyles.headerTitle}>{setup.name}</Text>
                {/* Edit Setup Button */}
                <TouchableOpacity onPress={() => navigateTo('NewSetup', { setupId: setup.id })} style={currentStyles.actionButton}>
                  <Text style={currentStyles.actionButtonText}>{t('edit_setup')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.contentPadding}>
                {/* Description Card */}
                <View style={currentStyles.card}>
                    <Text style={currentStyles.cardTitle}>{t('description')}</Text>
                    <Text style={currentStyles.cardValue}>{setup.description || t('no_description')}</Text>
                </View>

                {/* Technical Checklist Card */}
                <View style={currentStyles.card}>
                    <Text style={currentStyles.sectionTitleSmall}>{t('technical_checklist')}</Text>
                    {setup.checklist && setup.checklist.length > 0 ? (
                        setup.checklist.map((item, index) => (
                            <Text key={index} style={currentStyles.listItemSubText}>• {item}</Text>
                        ))
                    ) : (
                        <Text style={currentStyles.placeholderText}>{t('no_conditions')}</Text>
                    )}
                </View>

                {/* Psychology Checklist Card */}
                <View style={currentStyles.card}>
                    <Text style={currentStyles.sectionTitleSmall}>{t('psychology_checklist')}</Text>
                    {setup.psychologyChecklist && setup.psychologyChecklist.length > 0 ? (
                        setup.psychologyChecklist.map((item, index) => (
                            <Text key={index} style={currentStyles.listItemSubText}>• {item}</Text>
                        ))
                    ) : (
                        <Text style={currentStyles.placeholderText}>{t('no_conditions')}</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

export default SetupDetailScreen;