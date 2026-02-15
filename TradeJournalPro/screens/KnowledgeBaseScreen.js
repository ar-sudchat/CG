import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { getDocuments, uploadDocument, deleteDocument } from '../api/analysis';

const TABS = [
    { id: 'guide', label: 'SMC Guide', icon: 'book' },
    { id: 'docs', label: 'Documents', icon: 'document-text' },
];

const DOC_CATEGORIES = [
    { value: 'general', label: 'General' },
    { value: 'smc', label: 'SMC' },
    { value: 'ict', label: 'ICT' },
    { value: 'order_block', label: 'Order Block' },
    { value: 'fvg', label: 'FVG' },
    { value: 'liquidity', label: 'Liquidity' },
    { value: 'kill_zone', label: 'Kill Zone' },
    { value: 'ote', label: 'OTE' },
];

// ===== SMC Guide Content (from Confirmation.md / The Ninja [TH]) =====
const GUIDE_SECTIONS = [
    {
        id: 'overview',
        title: 'ภาพรวมระบบ SMC',
        icon: 'layers',
        color: '#8b5cf6',
        content: `ระบบการเทรดนี้เน้นการรอ ไม่บังคับกราฟ และแบ่งลำดับการวิเคราะห์ออกเป็น 4 ขั้นตอนหลัก:

1. Trend/Structure (Demand/Supply)
2. Liquidity
3. POI (Point of Interest)
4. Confirmation

"ไม่มีระบบใดชนะ 100%" สิ่งสำคัญคือการทำซ้ำในท่าเดิมที่ถนัด (Consistency) และมีการบริหารความเสี่ยง (MM) ที่ดี`,
    },
    {
        id: 'structure',
        title: '1. Structure (Trend / Demand / Supply)',
        icon: 'trending-up',
        color: '#3b82f6',
        content: `การหาโครงสร้างและโซน:

• รูปแบบ Demand: มองหาแพทเทิร์น Rally-Base-Rally (RBR)
• Base (Demand) ต้องส่งกราฟขึ้นไป Break Structure (ชนะแนวต้าน Lower High ฝั่งซ้าย) หรือทำ New High
• ถ้ากราฟทำ High ใหม่ = Demand คุมตลาด → โฟกัสหน้า Buy
• ถ้ากราฟทำ Low ใหม่ = Supply คุมตลาด → โฟกัสหน้า Sell
• โซนต้อง Fresh (ยังไม่เคยถูกใช้งาน / Unmitigated)

วิธีหาเทรนด์:
ถามตัวเองว่า "ล่าสุด กราฟทำ High ใหม่ หรือทำ Low ใหม่?" และ "Base ไหนที่เป็นคนส่งกราฟไปทำลายโครงสร้างนั้น?"

สัญญาณการเปลี่ยนเทรนด์:
• Change of Character (ChoCH): ราคาทำลาย Low ล่าสุดที่ส่งกราฟขึ้นไปทำ High
• แพทเทิร์นกลับตัว เช่น Double Top (ตัว M) ที่จุดสูงสุดของรอบ`,
    },
    {
        id: 'liquidity',
        title: '2. Liquidity (สภาพคล่อง)',
        icon: 'water',
        color: '#f59e0b',
        content: `การดูสภาพคล่อง:

• ห้ามไล่ราคา (Don't Chase) เมื่อได้โซน Demand แล้ว ให้รอราคาย่อตัวกลับมา
• การพุ่งขึ้นทำ High ใหม่ = การสร้าง Liquidity (เชื้อเพลิง)
• ราคามักจะย้อนกลับมาเคลียร์ Liquidity ก่อนเสมอ
• ให้รอราคากลับมาหาโซน Demand ที่เราเล็งไว้ตอนแรก

สิ่งสำคัญ:
การไปไล่ Buy ด้านบนมีความเสี่ยง เพราะราคามักจะย้อนกลับมาเคลียร์ Liquidity ก่อน`,
    },
    {
        id: 'poi',
        title: '3. POI (Point of Interest)',
        icon: 'locate',
        color: '#8b5cf6',
        content: `การคัดเลือกจุดเข้าเทรด:

เงื่อนไขของ POI ที่ดี:
1. เป็นโซนที่ส่งกราฟไปทำลายโครงสร้าง (Break Structure)
2. ต้อง Fresh (Unmitigated) - ยังไม่เคยถูกแตะ
3. สำคัญที่สุด: ต้องมี Imbalance / FVG (Fair Value Gap)
4. ถ้า Base หลักไม่มี Imbalance → หา Hidden Demand (แท่งย่อยที่มี Imbalance)

Timeframe แนะนำ: M15 หรือ M5

Hidden Demand:
• คือแท่งเทียนในโซนซื้อที่มี Imbalance ชัดเจน
• หาใน M15/M5 บริเวณจุด BOS
• ตีโซนคลุมแท่ง Hidden Demand แล้วตั้ง Alert
• เมื่อราคาแตะ ให้ย่อยไปดู M1 รอ Confirmation`,
    },
    {
        id: 'confirmation',
        title: '4. Confirmation (ยืนยันจุดเข้า)',
        icon: 'checkmark-done',
        color: '#10b981',
        content: `เมื่อราคาลงมาแตะ POI ให้ไปดู Timeframe M1 เพื่อหา Setup:

W2 Model (Sweep & Break):
• ราคาลงมา Sweep (กิน Stop Loss โลว์เดิม)
• แล้วดีดกลับขึ้นไปเบรก Neckline
• จุดสังเกต: รูปร่างคล้ายตัว W ขาขวาต่ำกว่าขาซ้าย

W3 Model (Higher Low):
• ราคายก Low สูงขึ้น (ไม่ทำ Low ใหม่)
• แล้วเบรกขึ้นไป
• จุดสังเกต: รูปร่างคล้ายตัว W ขาขวาสูงกว่าขาซ้าย

Demand/Supply Flip:
• Demand รับอยู่แล้วส่งกราฟสวนกลับขึ้นไปทำลาย Supply ได้
• แสดงว่าฝั่งซื้อกลับมาควบคุมตลาด

BOS Continuation:
• รอเกิด Break of Structure แล้วหาจังหวะเข้าตอนย่อ (Retest)`,
    },
    {
        id: 'advanced',
        title: 'เทคนิคขั้นสูง',
        icon: 'flash',
        color: '#ef4444',
        content: `3 Drives / Divergence:
• ราคาทำ Low ต่ำลง 3 ครั้ง + Divergence
• แล้ว Break Structure กลับขึ้นไป

Wyckoff Spring:
• รอ Spring (หลุด Low แล้วดึงกลับ)
• แล้ว Break โครงสร้างเพื่อยืนยัน

External vs Internal Structure:
• External Structure: ภาพใหญ่ กำหนดทิศทางหลัก ใช้ดูว่าหน้าเทรดฝั่งไหนได้เปรียบ
• Internal Structure: คลื่นย่อยระหว่าง Retracement ระวังสัญญาณหลอก
• ถ้าโครงสร้างภายในซับซ้อน → รอราคาเฉลยเป็นภาพใหญ่ก่อน`,
    },
    {
        id: 'execution',
        title: 'สรุปขั้นตอนการเทรด',
        icon: 'rocket',
        color: '#06b6d4',
        content: `Step-by-Step:

1. M15/M5: หา Base ที่ส่งกราฟทำ New High มี Imbalance (ตีกรอบรอไว้)
2. Wait: ตั้ง Alert รอราคาย่อกลับมาแตะโซน
3. M1: เมื่อแจ้งเตือนดัง ให้เข้าไปดู Timeframe 1 นาที
4. Confirm: รอเกิดโมเดล W2, W3 หรือ Flip
5. Entry: เข้าออเดอร์เมื่อครบเงื่อนไข วาง SL หลังโซนหรือใต้ Low

หมายเหตุ:
หากการรอ Confirmation ใน M1 ยากเกินไป สามารถ Pending Order ที่โซน M15/M5 ได้ แต่แลกมาด้วย Win Rate ที่อาจต่ำกว่า`,
    },
];

const KnowledgeBaseScreen = ({ navigation }) => {
    const { token } = useAuth();
    const { t } = useAppData();
    const [activeTab, setActiveTab] = useState('guide');
    const [expandedSection, setExpandedSection] = useState('overview');

    // Documents state
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

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ===== RENDER =====
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

            {/* Tab Selector */}
            <View style={styles.tabRow}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <Ionicons
                            name={tab.icon}
                            size={16}
                            color={activeTab === tab.id ? '#fff' : '#9ca3af'}
                        />
                        <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ===== GUIDE TAB ===== */}
            {activeTab === 'guide' && (
                <ScrollView style={styles.guideScroll} contentContainerStyle={styles.guideContent}>
                    {/* Title */}
                    <View style={styles.guideTitleRow}>
                        <Ionicons name="school" size={22} color="#8b5cf6" />
                        <View style={styles.guideTitleInfo}>
                            <Text style={styles.guideTitleText}>SMC Checklist System</Text>
                            <Text style={styles.guideSubtitle}>Based on The Ninja [TH] methodology</Text>
                        </View>
                    </View>

                    {/* Sections */}
                    {GUIDE_SECTIONS.map((section) => {
                        const isExpanded = expandedSection === section.id;
                        return (
                            <View key={section.id} style={styles.sectionCard}>
                                <TouchableOpacity
                                    style={styles.sectionHeader}
                                    onPress={() => setExpandedSection(isExpanded ? null : section.id)}
                                >
                                    <View style={[styles.sectionIcon, { backgroundColor: section.color + '20' }]}>
                                        <Ionicons name={section.icon} size={18} color={section.color} />
                                    </View>
                                    <Text style={styles.sectionTitle}>{section.title}</Text>
                                    <Ionicons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color="#6b7280"
                                    />
                                </TouchableOpacity>
                                {isExpanded && (
                                    <View style={styles.sectionBody}>
                                        <Text style={styles.sectionText}>{section.content}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* ===== DOCUMENTS TAB ===== */}
            {activeTab === 'docs' && (
                <>
                    {/* Category Selector */}
                    <Text style={styles.sectionLabel}>{t('category')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                        {DOC_CATEGORIES.map(cat => (
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
                                        <Text style={styles.docIconText}>{doc.fileType === 'pdf' ? 'PDF' : 'IMG'}</Text>
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
                </>
            )}
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

    // Tabs
    tabRow: {
        flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: '#1f2937', gap: 8,
    },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, borderRadius: 10,
        backgroundColor: '#374151', borderWidth: 1, borderColor: '#4b5563',
    },
    tabBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    tabText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
    tabTextActive: { color: '#fff' },

    // ===== GUIDE TAB =====
    guideScroll: { flex: 1 },
    guideContent: { padding: 16 },
    guideTitleRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#1a1f35', borderRadius: 12, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: '#8b5cf620',
    },
    guideTitleInfo: { flex: 1 },
    guideTitleText: { color: '#f9fafb', fontSize: 18, fontWeight: 'bold' },
    guideSubtitle: { color: '#7a8baa', fontSize: 12, marginTop: 2 },

    // Section Cards
    sectionCard: {
        backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 8,
        borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
    },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    },
    sectionIcon: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    sectionTitle: { flex: 1, color: '#f9fafb', fontSize: 14, fontWeight: '700' },
    sectionBody: {
        paddingHorizontal: 14, paddingBottom: 16, paddingTop: 0,
        borderTopWidth: 1, borderTopColor: '#334155',
    },
    sectionText: {
        color: '#cbd5e1', fontSize: 13, lineHeight: 22, paddingTop: 12,
    },

    // ===== DOCUMENTS TAB =====
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
