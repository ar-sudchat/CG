import React, { useState, useContext, useEffect } from 'react';
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
  card: {
    backgroundColor: '#374151', // gray-700
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, color: '#9ca3af', marginBottom: 4 },
  sectionTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#f9fafb', marginBottom: 10, marginTop: 20 },
  checklistCheckbox: {
    fontSize: 20, // Emoji size
    marginRight: 10,
  },
  checklistText: {
    color: '#f9fafb',
    fontSize: 16,
    flex: 1, // Allow text to wrap
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
  sectionTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 10, marginTop: 20 },
  checklistCheckbox: {
    fontSize: 20,
    marginRight: 10,
  },
  checklistText: {
    color: '#1f2937',
    fontSize: 16,
    flex: 1,
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
  checklistRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // Add padding for touchability
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    // Background color will be set by the card style or specific checklist item style
  },
  disabledButton: {
    opacity: 0.5,
  },
});


const ChecklistScreen = () => {
    const { state, navigateTo, goBackToPreviousPage, setState: setGlobalState, t } = useContext(AppContext);
    const isLightMode = state.currentTheme === 'light';
    const currentStyles = isLightMode ? lightStyles : darkStyles;

    // Get setupId from navigation params (passed from SelectSetupScreen)
    const setupId = state.currentTrade?.setupId;
    const setup = state.setups.find(s => s.id === setupId);

    // State to manage the checked status of each item
    // Initialize based on the setup's checklists
    const [technicalChecks, setTechnicalChecks] = useState(setup ? setup.checklist.map(() => false) : []);
    const [psychologyChecks, setPsychologyChecks] = useState(setup ? (setup.psychologyChecklist || []).map(() => false) : []);

    // Function to handle toggling a checklist item
    const handleCheck = (type, index) => {
        if (type === 'technical') {
            const newChecks = [...technicalChecks];
            newChecks[index] = !newChecks[index];
            setTechnicalChecks(newChecks);
        } else {
            const newChecks = [...psychologyChecks];
            newChecks[index] = !newChecks[index];
            setPsychologyChecks(newChecks);
        }
    };

    // Check if all required checklists are completed
    const allChecklistsCompleted =
        technicalChecks.every(Boolean) && psychologyChecks.every(Boolean);

    // Function to confirm checklist and return to NewTradeScreen
    const confirmChecklist = () => {
        // Update the global state to mark checklist as completed for the current trade
        setGlobalState(prevState => ({
            ...prevState,
            currentTrade: {
                ...prevState.currentTrade,
                checklistCompleted: allChecklistsCompleted,
                setupId: setupId, // Ensure setupId is carried over to NewTradeScreen
            }
        }));
        navigateTo('NewTrade'); // Go back to NewTrade form
    };

    // Handle case where setup is not found (e.g., direct navigation or data issue)
    if (!setup) {
        return (
            <View style={currentStyles.page}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
                        <Text style={currentStyles.iconText}>⬅️</Text>
                    </TouchableOpacity>
                    <Text style={currentStyles.headerTitle}>{t('check_conditions')}</Text>
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
                <Text style={currentStyles.headerTitle}>{t('check')}: {setup.name}</Text>
                <View style={{ width: 30 }} /> {/* Spacer */}
            </View>

            <ScrollView contentContainerStyle={styles.contentPadding}>
                {/* Technical Checklist Section */}
                <View style={currentStyles.card}>
                    <Text style={currentStyles.sectionTitleSmall}>{t('technical_checklist')}</Text>
                    {setup.checklist.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleCheck('technical', index)}
                            style={styles.checklistRowItem}
                        >
                            <Text style={currentStyles.checklistCheckbox}>
                                {technicalChecks[index] ? '✅' : '⬜'} {/* Checkbox emoji */}
                            </Text>
                            <Text style={currentStyles.checklistText}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Psychology Checklist Section */}
                <View style={currentStyles.card}>
                    <Text style={currentStyles.sectionTitleSmall}>{t('psychology_checklist')}</Text>
                    {(setup.psychologyChecklist || []).map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleCheck('psychology', index)}
                            style={styles.checklistRowItem}
                        >
                            <Text style={currentStyles.checklistCheckbox}>
                                {psychologyChecks[index] ? '✅' : '⬜'}
                            </Text>
                            <Text style={currentStyles.checklistText}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Confirm Conditions Button */}
                <TouchableOpacity
                    onPress={confirmChecklist}
                    style={[
                        currentStyles.actionButtonGreen,
                        !allChecklistsCompleted && styles.disabledButton, // Disable if not all checked
                    ]}
                    disabled={!allChecklistsCompleted}
                >
                    <Text style={currentStyles.actionButtonText}>{t('confirm_conditions')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

export default ChecklistScreen;
