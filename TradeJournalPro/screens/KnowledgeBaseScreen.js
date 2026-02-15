import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, RefreshControl } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { getDocuments, uploadDocument, deleteDocument } from '../api/analysis';

const CATEGORIES = [
    { value: 'general', label: 'General' },
    { value: 'smc', label: 'SMC' },
    { value: 'ict', label: 'ICT' },
    { value: 'order_block', label: 'Order Block' },
    { value: 'fvg', label: 'FVG' },
    { value: 'liquidity', label: 'Liquidity' },
    { value: 'kill_zone', label: 'Kill Zone' },
    { value: 'ote', label: 'OTE' },
];

const KnowledgeBaseScreen = ({ navigation }) => {
    const { token } = useAuth();
    const { t } = useAppData();
    const [documents, setDocuments] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('general');
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            const data = await getDocuments(token);
            setDocuments(data);
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDocuments();
        setRefreshing(false);
    };

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/png', 'image/jpeg'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            setUploading(true);

            const doc = await uploadDocument(token, file, selectedCategory, '');
            setDocuments(prev => [doc, ...prev]);
            Alert.alert('Success', t('document_uploaded'));
        } catch (error) {
            Alert.alert('Error', String(error));
        }
        setUploading(false);
    };

    const handleDelete = (docId, name) => {
        Alert.alert(
            t('confirm_delete'),
            `${t('confirm_delete_document')}: ${name}`,
            [
                { text: t('close'), style: 'cancel' },
                {
                    text: t('delete'), style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDocument(token, docId);
                            setDocuments(prev => prev.filter(d => d._id !== docId));
                        } catch (error) {
                            console.error('Delete error:', error);
                        }
                    },
                },
            ]
        );
    };

    const fileTypeIcon = (type) => {
        if (type === 'pdf') return 'PDF';
        return 'IMG';
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>{'<'} {t('close')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('menu_knowledge')}</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Category Selector */}
            <Text style={styles.sectionLabel}>{t('category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map(cat => (
                    <TouchableOpacity
                        key={cat.value}
                        style={[styles.catChip, selectedCategory === cat.value && styles.catChipActive]}
                        onPress={() => setSelectedCategory(cat.value)}
                    >
                        <Text style={[styles.catChipText, selectedCategory === cat.value && styles.catChipTextActive]}>
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Upload Button */}
            <TouchableOpacity
                style={[styles.uploadButton, uploading && { opacity: 0.6 }]}
                onPress={handleUpload}
                disabled={uploading}
            >
                <Text style={styles.uploadButtonText}>
                    {uploading ? t('uploading') + '...' : `+ ${t('upload_document')} (PDF/PNG/JPG)`}
                </Text>
            </TouchableOpacity>

            {/* Document List */}
            <ScrollView
                style={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {documents.length === 0 ? (
                    <Text style={styles.emptyText}>{t('no_documents')}</Text>
                ) : (
                    documents.map(doc => (
                        <TouchableOpacity
                            key={doc._id}
                            style={styles.docCard}
                            onLongPress={() => handleDelete(doc._id, doc.originalName)}
                        >
                            <View style={[styles.docIcon, {
                                backgroundColor: doc.fileType === 'pdf' ? '#7f1d1d' : '#1e3a5f'
                            }]}>
                                <Text style={styles.docIconText}>{fileTypeIcon(doc.fileType)}</Text>
                            </View>
                            <View style={styles.docInfo}>
                                <Text style={styles.docName} numberOfLines={1}>{doc.originalName}</Text>
                                <View style={styles.docMeta}>
                                    <Text style={styles.docCategory}>{doc.category}</Text>
                                    <Text style={styles.docSize}>{formatSize(doc.fileSize)}</Text>
                                    <View style={[styles.processedDot, {
                                        backgroundColor: doc.isProcessed ? '#4ade80' : '#f59e0b'
                                    }]} />
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => handleDelete(doc._id, doc.originalName)} style={styles.deleteBtn}>
                                <Text style={styles.deleteBtnText}>X</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 12,
        backgroundColor: '#1f2937',
    },
    backText: { color: '#60a5fa', fontSize: 16 },
    headerTitle: { color: '#f9fafb', fontSize: 18, fontWeight: 'bold' },
    sectionLabel: { color: '#9ca3af', fontSize: 14, paddingHorizontal: 16, marginTop: 12, marginBottom: 8 },
    categoryScroll: { paddingHorizontal: 16, maxHeight: 44 },
    catChip: {
        backgroundColor: '#374151', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
        marginRight: 8, borderWidth: 1, borderColor: '#4b5563',
    },
    catChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    catChipText: { color: '#9ca3af', fontSize: 13 },
    catChipTextActive: { color: '#fff', fontWeight: '600' },
    uploadButton: {
        backgroundColor: '#2563eb', marginHorizontal: 16, marginTop: 16, paddingVertical: 14,
        borderRadius: 10, alignItems: 'center',
    },
    uploadButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    emptyText: { color: '#6b7280', textAlign: 'center', paddingVertical: 40, fontSize: 16 },
    docCard: {
        backgroundColor: '#374151', borderRadius: 10, padding: 14, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center',
    },
    docIcon: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    docIconText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    docInfo: { flex: 1 },
    docName: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
    docMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
    docCategory: { color: '#7c3aed', fontSize: 12, fontWeight: '500' },
    docSize: { color: '#6b7280', fontSize: 12 },
    processedDot: { width: 8, height: 8, borderRadius: 4 },
    deleteBtn: { padding: 8 },
    deleteBtnText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
});

export default KnowledgeBaseScreen;
