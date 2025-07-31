import React, { useState, useContext, useEffect } from 'react';
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
  textArea: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#f9fafb',
    fontSize: 16,
    marginBottom: 12,
    height: 80, // Slightly reduced height for better fit
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  sectionTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#f9fafb', marginBottom: 10, marginTop: 20 },
  checklistInput: {
    backgroundColor: '#4b5563', // gray-600
    borderColor: '#6b7280', // gray-500
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#f9fafb',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  addChecklistButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addChecklistButtonText: {
    color: '#60a5fa', // blue-400
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonGreen: {
    backgroundColor: '#10b981', // green-600
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionButtonRed: {
    backgroundColor: '#ef4444', // red-600
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginLeft: 8, // Add margin for two buttons side-by-side
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
  textArea: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#1f2937',
    fontSize: 16,
    marginBottom: 12,
    height: 80,
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: '#6b7280',
  },
  sectionTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 10, marginTop: 20 },
  checklistInput: {
    backgroundColor: '#f9fafb', // gray-50
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#1f2937',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  addChecklistButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addChecklistButtonText: {
    color: '#2563eb', // blue-600
    fontSize: 14,
    fontWeight: '500',
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
  actionButtonRed: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginLeft: 8,
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
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteChecklistButton: {
    padding: 8,
  },
  deleteChecklistText: {
    fontSize: 18, // For emoji icon
    color: '#ef4444', // red-500
  },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 20,
  },
});


const NewSetupScreen = () => {
  const { state, navigateTo, goBackToPreviousPage, setState: setGlobalState, t } = useContext(AppContext);
  const isLightMode = state.currentTheme === 'light';
  const currentStyles = isLightMode ? lightStyles : darkStyles;

  // Get setupId from navigation params if editing an existing setup
  const setupId = state.currentTrade?.setupId;
  const existingSetup = setupId ? state.setups.find(s => s.id === setupId) : null;

  const [setupName, setSetupName] = useState(existingSetup ? existingSetup.name : '');
  const [setupDescription, setSetupDescription] = useState(existingSetup ? existingSetup.description : '');
  const [technicalChecklist, setTechnicalChecklist] = useState(existingSetup ? [...existingSetup.checklist] : ['']);
  const [psychologyChecklist, setPsychologyChecklist] = useState(existingSetup ? [...(existingSetup.psychologyChecklist || [])] : ['']);

  // Ensure there's at least one empty item if starting new or if lists are empty
  useEffect(() => {
    if (!existingSetup && technicalChecklist.length === 0) {
      setTechnicalChecklist(['']);
    }
    if (!existingSetup && psychologyChecklist.length === 0) {
      setPsychologyChecklist(['']);
    }
  }, []); // Run only once on mount

  const handleAddChecklistItem = (type) => {
    if (type === 'technical') {
      setTechnicalChecklist([...technicalChecklist, '']);
    } else {
      setPsychologyChecklist([...psychologyChecklist, '']);
    }
  };

  const handleChecklistChange = (type, index, value) => {
    if (type === 'technical') {
      const newItems = [...technicalChecklist];
      newItems[index] = value;
      setTechnicalChecklist(newItems);
    } else {
      const newItems = [...psychologyChecklist];
      newItems[index] = value;
      setPsychologyChecklist(newItems);
    }
  };

  const handleRemoveChecklistItem = (type, index) => {
    if (type === 'technical') {
      const newItems = technicalChecklist.filter((_, i) => i !== index);
      setTechnicalChecklist(newItems);
    } else {
      const newItems = psychologyChecklist.filter((_, i) => i !== index);
      setPsychologyChecklist(newItems);
    }
  };

  const saveSetup = () => {
    // Filter out empty strings from checklists before saving
    const filteredTechnicalChecklist = technicalChecklist.filter(item => item.trim() !== '');
    const filteredPsychologyChecklist = psychologyChecklist.filter(item => item.trim() !== '');

    if (!setupName.trim() || !setupDescription.trim()) {
      Alert.alert(t('please_fill_all_fields'));
      return;
    }

    setGlobalState(prevState => {
      if (existingSetup) {
        // Update existing setup
        return {
          ...prevState,
          setups: prevState.setups.map(s =>
            s.id === setupId
              ? {
                  ...s,
                  name: setupName.trim(),
                  description: setupDescription.trim(),
                  checklist: filteredTechnicalChecklist,
                  psychologyChecklist: filteredPsychologyChecklist,
                }
              : s
          ),
        };
      } else {
        // Add new setup
        const newId = prevState.setups.length > 0 ? Math.max(...prevState.setups.map(s => s.id)) + 1 : 1;
        return {
          ...prevState,
          setups: [
            ...prevState.setups,
            {
              id: newId,
              name: setupName.trim(),
              description: setupDescription.trim(),
              checklist: filteredTechnicalChecklist,
              psychologyChecklist: filteredPsychologyChecklist,
            },
          ],
        };
      }
    });
    Alert.alert(t('setup_saved_successfully'));
    navigateTo('Setups'); // Go back to setups list
  };

  const deleteSetup = () => {
    if (!existingSetup) return; // Can only delete existing setups

    Alert.alert(
      t('confirm_delete_setup'),
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            setGlobalState(prevState => ({
              ...prevState,
              setups: prevState.setups.filter(s => s.id !== setupId),
              // Also remove trades associated with this setup (optional, depending on desired logic)
              trades: prevState.trades.filter(trade => trade.setupId !== setupId),
            }));
            Alert.alert(t('setup_deleted'));
            navigateTo('Setups'); // Go back to setups list
          },
        },
      ]
    );
  };

  return (
    <View style={currentStyles.page}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
          <Text style={currentStyles.iconText}>⬅️</Text>
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>
          {existingSetup ? t('edit_setup') : t('add_new_setup')}
        </Text>
        <View style={{ width: 30 }} />{/* Spacer for alignment */}
      </View>

      <ScrollView contentContainerStyle={styles.contentPadding}>
        {/* Setup Name Input */}
        <Text style={currentStyles.label}>{t('setup_name')}</Text>
        <TextInput
          style={currentStyles.input}
          placeholder={t('e_g_breakout_strategy_placeholder')}
          placeholderTextColor={currentStyles.placeholderText.color}
          value={setupName}
          onChangeText={setSetupName}
          autoCapitalize="words"
        />

        {/* Description Input */}
        <Text style={currentStyles.label}>{t('description')}</Text>
        <TextInput
          style={currentStyles.textArea}
          placeholder={t('e_g_trade_when_price_breaks_resistance_placeholder')}
          placeholderTextColor={currentStyles.placeholderText.color}
          multiline
          numberOfLines={2}
          value={setupDescription}
          onChangeText={setSetupDescription}
          autoCapitalize="sentences"
        />

        {/* Technical Checklist Section */}
        <Text style={currentStyles.sectionTitleSmall}>{t('technical_checklist')}</Text>
        {technicalChecklist.map((item, index) => (
          <View key={index} style={styles.checklistRow}>
            <TextInput
              style={currentStyles.checklistInput}
              value={item}
              onChangeText={(text) => handleChecklistChange('technical', index, text)}
              placeholder={t('condition_placeholder')}
              placeholderTextColor={currentStyles.placeholderText.color}
            />
            <TouchableOpacity onPress={() => handleRemoveChecklistItem('technical', index)} style={styles.deleteChecklistButton}>
              <Text style={styles.deleteChecklistText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={() => handleAddChecklistItem('technical')} style={currentStyles.addChecklistButton}>
          <Text style={currentStyles.addChecklistButtonText}>{t('add_condition')}</Text>
        </TouchableOpacity>

        {/* Psychology Checklist Section */}
        <Text style={currentStyles.sectionTitleSmall}>{t('psychology_checklist')}</Text>
        {psychologyChecklist.map((item, index) => (
          <View key={index} style={styles.checklistRow}>
            <TextInput
              style={currentStyles.checklistInput}
              value={item}
              onChangeText={(text) => handleChecklistChange('psychology', index, text)}
              placeholder={t('condition_placeholder')}
              placeholderTextColor={currentStyles.placeholderText.color}
            />
            <TouchableOpacity onPress={() => handleRemoveChecklistItem('psychology', index)} style={styles.deleteChecklistButton}>
              <Text style={styles.deleteChecklistText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={() => handleAddChecklistItem('psychology')} style={currentStyles.addChecklistButton}>
          <Text style={currentStyles.addChecklistButtonText}>{t('add_condition')}</Text>
        </TouchableOpacity>

        {/* Save and Delete Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity onPress={saveSetup} style={[currentStyles.actionButtonGreen, { flex: 1 }]}>
            <Text style={currentStyles.actionButtonText}>{t('save_setup')}</Text>
          </TouchableOpacity>
          {existingSetup && (
            <TouchableOpacity onPress={deleteSetup} style={[currentStyles.actionButtonRed, { flex: 1 }]}>
              <Text style={currentStyles.actionButtonText}>{t('delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default NewSetupScreen;