import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Picker, // For select dropdowns
  Alert,
  Platform,
  Dimensions, // For responsive image placeholders
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
    height: 100,
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  card: {
    backgroundColor: '#374151', // gray-700
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, color: '#9ca3af', marginBottom: 4 },
  actionButton: { // For select image buttons
    backgroundColor: '#4b5563', // gray-600
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionButtonGreen: { // For save trade button
    backgroundColor: '#10b981', // green-600
    paddingVertical: 16, // Larger padding for main action
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  actionButtonSmall: { // For "Check" button in checklist status
    backgroundColor: '#2563eb', // blue-600
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonTextSmall: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  imagePlaceholderText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 50,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    marginTop: 10,
  },
  statusYellow: { color: '#fbbf24', fontSize: 14 },
  statusGreen: { color: '#4ade80', fontSize: 14 },
  picker: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 6,
    color: '#f9fafb', // Text color for selected item
    marginBottom: 12,
    height: 50,
  },
  pickerItem: {
    color: '#f9fafb', // Text color for picker items
    fontSize: 16,
  },
  pickerUnit: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 6,
    color: '#f9fafb',
    height: 50,
    width: 80,
  },
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
    height: 100,
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: '#6b7280',
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
  actionButton: {
    backgroundColor: '#e5e7eb', // gray-200
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
  actionButtonGreen: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
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
  actionButtonSmall: {
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
  actionButtonTextSmall: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  imagePlaceholderText: {
    color: '#4b5563',
    textAlign: 'center',
    paddingVertical: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 10,
  },
  statusYellow: { color: '#fbbf24', fontSize: 14 },
  statusGreen: { color: '#4ade80', fontSize: 14 },
  picker: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 6,
    color: '#1f2937',
    marginBottom: 12,
    height: 50,
  },
  pickerItem: {
    color: '#1f2937',
    fontSize: 16,
  },
  pickerUnit: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 6,
    color: '#1f2937',
    height: 50,
    width: 80,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePreviewContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 150, // Fixed height for preview area
    // Background and border will be set by currentStyles.imagePlaceholderText
  },
  disabledButton: {
    opacity: 0.5,
  },
});


const NewTradeScreen = () => {
    const { state, navigateTo, goBackToPreviousPage, setState: setGlobalState, t } = useContext(AppContext);
    const isLightMode = state.currentTheme === 'light';
    const currentStyles = isLightMode ? lightStyles : darkStyles;

    // State for form fields
    const [selectedAccount, setSelectedAccount] = useState(state.accounts[0]?.id.toString() || '');
    const [selectedSetup, setSelectedSetup] = useState(''); // Will be set after checklist
    const [pair, setPair] = useState('');
    const [direction, setDirection] = useState('Buy');
    const [riskValue, setRiskValue] = useState('');
    const [riskUnit, setRiskUnit] = useState('R');
    const [pnl, setPnl] = useState('');
    const [outcome, setOutcome] = useState('TP');
    const [notes, setNotes] = useState('');
    const [entryImage, setEntryImage] = useState(null); // Placeholder for image data (Base64 or URL)
    const [exitImage, setExitImage] = useState(null); // Placeholder for image data

    // Effect to update selectedSetup if it comes from the checklist flow
    useEffect(() => {
        if (state.currentTrade.setupId) {
            setSelectedSetup(state.currentTrade.setupId.toString());
        }
        // Set initial account if available and not already set
        if (state.accounts.length > 0 && !selectedAccount) {
            setSelectedAccount(state.accounts[0].id.toString());
        }
    }, [state.currentTrade.setupId, state.accounts]); // Re-run if setupId or accounts change

    const handleSaveTrade = () => {
        // Validation: Check if checklist was completed
        if (!state.currentTrade.checklistCompleted) {
            Alert.alert(t('check_conditions_before_save'));
            return;
        }
        // Basic form validation
        if (!selectedAccount || !selectedSetup || !pair.trim() || !riskValue.trim() || !pnl.trim()) {
            Alert.alert(t('please_fill_all_fields'));
            return;
        }

        const account = state.accounts.find(a => a.id === parseInt(selectedAccount));
        const setup = state.setups.find(s => s.id === parseInt(selectedSetup));

        if (!account || !setup) {
            Alert.alert(t('invalid_account_or_setup'));
            return;
        }

        const newTrade = {
            id: state.trades.length > 0 ? Math.max(...state.trades.map(t => t.id)) + 1 : 1,
            setupId: setup.id,
            setupName: setup.name,
            checklist: setup.checklist, // Store the checklist items from the selected setup
            psychologyChecklist: setup.psychologyChecklist || [], // Store psychology checklist
            accountId: parseInt(selectedAccount),
            pair: pair.trim(),
            direction,
            riskValue: parseFloat(riskValue),
            riskUnit,
            pnl: parseFloat(pnl),
            outcome,
            notes: notes.trim(),
            entryImageDataUrl: entryImage, // Placeholder for actual image data/URL
            exitImageDataUrl: exitImage, // Placeholder for actual image data/URL
            date: new Date().toISOString(), // Record current date/time
        };

        // Update global state with new trade and updated account balance
        setGlobalState(prevState => {
            const updatedAccounts = prevState.accounts.map(acc =>
                acc.id === account.id ? { ...acc, balance: acc.balance + newTrade.pnl } : acc
            );
            return {
                ...prevState,
                trades: [...prevState.trades, newTrade],
                accounts: updatedAccounts,
                currentTrade: {}, // Clear currentTrade after saving for next use
            };
        });

        Alert.alert(t('trade_saved_successfully'));
        navigateTo('Main'); // Go back to main dashboard after saving
    };

    // Placeholder for image picking logic
    const handleImagePick = (type) => {
        Alert.alert(
            `Select ${type} Image`,
            `In a real app, you'd use a library like 'expo-image-picker' here to select an image from the gallery or camera.`,
            [
                { text: 'OK', onPress: () => {
                    // Simulate image selection by setting a dummy value
                    const dummyImageBase64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`; // A tiny transparent image
                    if (type === 'entry') setEntryImage(dummyImageBase64);
                    else setExitImage(dummyImageBase64);
                }},
            ]
        );
    };

    // Determine checklist status text and style
    const checklistStatusText = state.currentTrade.checklistCompleted
        ? `${t('checked')}: ${state.setups.find(s => s.id === state.currentTrade.setupId)?.name || 'N/A'}`
        : t('not_checked_yet');
    const checklistStatusStyle = state.currentTrade.checklistCompleted
        ? currentStyles.statusGreen
        : currentStyles.statusYellow;

    return (
        <View style={currentStyles.page}>
            {/* Header Section */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
                    <Text style={currentStyles.iconText}>❌</Text> {/* Close icon */}
                </TouchableOpacity>
                <Text style={currentStyles.headerTitle}>{t('new_trade_button')}</Text>
                <View style={{ width: 30 }} />{/* Spacer for alignment */}
            </View>

            <ScrollView contentContainerStyle={styles.contentPadding}>
                {/* Checklist Status Section */}
                <View style={currentStyles.card}>
                    <View style={styles.cardHeaderRow}>
                        <View>
                            <Text style={currentStyles.cardTitle}>{t('trade_conditions')}</Text>
                            <Text style={checklistStatusStyle}>{checklistStatusText}</Text>
                        </View>
                        <TouchableOpacity onPress={() => navigateTo('SelectSetup')} style={currentStyles.actionButtonSmall}>
                            <Text style={currentStyles.actionButtonTextSmall}>{t('check')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Trade Details Form */}
                <Text style={currentStyles.label}>{t('account')}</Text>
                <Picker
                    selectedValue={selectedAccount}
                    style={currentStyles.picker}
                    onValueChange={(itemValue) => setSelectedAccount(itemValue)}
                    itemStyle={currentStyles.pickerItem} // For iOS picker text color
                >
                    {state.accounts.length === 0 ? (
                        <Picker.Item label={t('no_accounts_available')} value="" enabled={false} />
                    ) : (
                        state.accounts.map(acc => (
                            <Picker.Item key={acc.id} label={`${acc.name} (${acc.balance.toFixed(2)}$)`} value={acc.id.toString()} />
                        ))
                    )}
                </Picker>

                <Text style={currentStyles.label}>{t('pair')}</Text>
                <TextInput
                    style={currentStyles.input}
                    placeholder={t('e_g_eurusd_placeholder')}
                    placeholderTextColor={currentStyles.placeholderText.color}
                    value={pair}
                    onChangeText={setPair}
                    autoCapitalize="characters" // e.g., EURUSD
                />

                <Text style={currentStyles.label}>{t('direction')}</Text>
                <Picker
                    selectedValue={direction}
                    style={currentStyles.picker}
                    onValueChange={(itemValue) => setDirection(itemValue)}
                    itemStyle={currentStyles.pickerItem}
                >
                    <Picker.Item label={t('buy')} value="Buy" />
                    <Picker.Item label={t('sell')} value="Sell" />
                </Picker>

                <Text style={currentStyles.label}>{t('risk')}</Text>
                <View style={styles.inputWithUnit}>
                    <TextInput
                        style={[currentStyles.input, { flex: 1, marginBottom: 0 }]} // flex:1 to take available space
                        placeholder="1.5"
                        placeholderTextColor={currentStyles.placeholderText.color}
                        keyboardType="numeric"
                        value={riskValue}
                        onChangeText={setRiskValue}
                    />
                    <Picker
                        selectedValue={riskUnit}
                        style={currentStyles.pickerUnit}
                        onValueChange={(itemValue) => setRiskUnit(itemValue)}
                        itemStyle={currentStyles.pickerItem}
                    >
                        <Picker.Item label="R" value="R" />
                        <Picker.Item label="$" value="Amount" />
                    </Picker>
                </View>

                <Text style={currentStyles.label}>{t('pnl')}</Text>
                <TextInput
                    style={currentStyles.input}
                    placeholder="250.75"
                    placeholderTextColor={currentStyles.placeholderText.color}
                    keyboardType="numeric"
                    value={pnl}
                    onChangeText={setPnl}
                />

                <Text style={currentStyles.label}>{t('trade_outcome')}</Text>
                <Picker
                    selectedValue={outcome}
                    style={currentStyles.picker}
                    onValueChange={(itemValue) => setOutcome(itemValue)}
                    itemStyle={currentStyles.pickerItem}
                >
                    <Picker.Item label={t('tp')} value="TP" />
                    <Picker.Item label={t('sl')} value="SL" />
                    <Picker.Item label={t('be')} value="BE" />
                    <Picker.Item label={t('manual_close')} value="Manual" />
                </Picker>

                {/* Image Upload Sections */}
                <View style={currentStyles.card}>
                    <Text style={currentStyles.cardTitle}>{t('entry_image')}</Text>
                    <TouchableOpacity onPress={() => handleImagePick('entry')} style={currentStyles.actionButton}>
                        <Text style={currentStyles.actionButtonText}>{t('select_entry_image')}</Text>
                    </TouchableOpacity>
                    {entryImage && (
                      <View style={styles.imagePreviewContainer}>
                        <Text style={currentStyles.imagePlaceholderText}></Text>
                      </View>
                    )}
                </View>
                <View style={currentStyles.card}>
                    <Text style={currentStyles.cardTitle}>{t('exit_image')}</Text>
                    <TouchableOpacity onPress={() => handleImagePick('exit')} style={currentStyles.actionButton}>
                        <Text style={currentStyles.actionButtonText}>{t('select_exit_image')}</Text>
                    </TouchableOpacity>
                    {exitImage && (
                      <View style={styles.imagePreviewContainer}>
                        <Text style={currentStyles.imagePlaceholderText}></Text>
                      </View>
                    )}
                </View>

                <Text style={currentStyles.label}>{t('notes')}</Text>
                <TextInput
                    style={currentStyles.textArea}
                    placeholder={t('e_g_good_entry_placeholder')}
                    placeholderTextColor={currentStyles.placeholderText.color}
                    multiline
                    numberOfLines={4}
                    value={notes}
                    onChangeText={setNotes}
                    autoCapitalize="sentences"
                />

                {/* Save Trade Button */}
                <TouchableOpacity onPress={handleSaveTrade} style={currentStyles.actionButtonGreen}>
                    <Text style={currentStyles.actionButtonText}>{t('save_trade')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

export default NewTradeScreen;
