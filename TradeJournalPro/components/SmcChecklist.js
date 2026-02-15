import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STEPS = [
    {
        id: 'structure',
        number: 1,
        title: 'Structure',
        subtitle: 'Trend / Demand / Supply',
        icon: 'trending-up',
        color: '#3b82f6',
        checks: [
            { id: 's1', text: 'ระบุเทรนด์: กราฟทำ High ใหม่ (Buy) หรือ Low ใหม่ (Sell)?' },
            { id: 's2', text: 'หา Base (Demand/Supply) แบบ Rally-Base-Rally' },
            { id: 's3', text: 'Base ส่งกราฟ Break Structure / New High ได้?' },
            { id: 's4', text: 'โซนยัง Fresh (Unmitigated) อยู่?' },
        ],
    },
    {
        id: 'liquidity',
        number: 2,
        title: 'Liquidity',
        subtitle: 'สภาพคล่อง / การรอ',
        icon: 'water',
        color: '#f59e0b',
        checks: [
            { id: 'l1', text: 'ห้ามไล่ราคา (Don\'t Chase)' },
            { id: 'l2', text: 'มอง High ใหม่ = Liquidity (เชื้อเพลิง)' },
            { id: 'l3', text: 'รอราคาย่อกลับมาหาโซน Demand/Supply' },
        ],
    },
    {
        id: 'poi',
        number: 3,
        title: 'POI',
        subtitle: 'Point of Interest',
        icon: 'locate',
        color: '#8b5cf6',
        checks: [
            { id: 'p1', text: 'หา Base ที่ส่งกราฟไป Break Structure' },
            { id: 'p2', text: 'เช็ค Fresh (ไม่เคยโดนแตะ)' },
            { id: 'p3', text: 'มี Imbalance / FVG หรือไม่?' },
            { id: 'p4', text: 'ถ้าไม่มี → หา Hidden Demand (แท่งย่อยที่มี Imbalance)' },
            { id: 'p5', text: 'ตีโซนใน TF M15/M5 แล้วตั้ง Alert' },
        ],
    },
    {
        id: 'confirmation',
        number: 4,
        title: 'Confirmation',
        subtitle: 'ยืนยันจุดเข้า (LTF M1)',
        icon: 'checkmark-done',
        color: '#10b981',
        checks: [
            { id: 'c1', text: 'W2: Sweep & Break (กวาด Low → เบรก Neckline)' },
            { id: 'c2', text: 'W3: Higher Low (ยก Low → เบรกขึ้น)' },
            { id: 'c3', text: 'Demand/Supply Flip (Demand ชนะ Supply)' },
            { id: 'c4', text: 'BOS Continuation (เบรกโครงสร้าง → รอ Retest)' },
        ],
    },
];

const SmcChecklist = ({ dark = true, collapsed: initialCollapsed = true }) => {
    const [collapsed, setCollapsed] = useState(initialCollapsed);
    const [checked, setChecked] = useState({});
    const [expandedStep, setExpandedStep] = useState(null);

    const c = {
        bg: dark ? '#111827' : '#ffffff',
        card: dark ? '#1a2332' : '#f8fafc',
        text: dark ? '#f9fafb' : '#0f172a',
        sub: dark ? '#7a8baa' : '#64748b',
        border: dark ? '#1e2a45' : '#e2e8f0',
        checkBg: dark ? '#0d1117' : '#f1f5f9',
    };

    const toggleCheck = (id) => {
        setChecked(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const resetAll = () => {
        setChecked({});
    };

    const getStepProgress = (step) => {
        const total = step.checks.length;
        const done = step.checks.filter(ch => checked[ch.id]).length;
        return { done, total };
    };

    const totalChecks = STEPS.reduce((sum, s) => sum + s.checks.length, 0);
    const totalDone = STEPS.reduce((sum, s) => sum + s.checks.filter(ch => checked[ch.id]).length, 0);

    if (collapsed) {
        return (
            <TouchableOpacity
                style={[styles.collapsedBar, { backgroundColor: c.bg, borderColor: c.border }]}
                onPress={() => setCollapsed(false)}
            >
                <View style={styles.collapsedLeft}>
                    <Ionicons name="checkbox-outline" size={16} color="#8b5cf6" />
                    <Text style={[styles.collapsedTitle, { color: c.text }]}>SMC Checklist</Text>
                    <View style={styles.progressPill}>
                        <Text style={styles.progressPillText}>{totalDone}/{totalChecks}</Text>
                    </View>
                </View>
                <Ionicons name="chevron-down" size={16} color={c.sub} />
            </TouchableOpacity>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: c.bg, borderColor: c.border }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="checkbox-outline" size={18} color="#8b5cf6" />
                    <Text style={[styles.title, { color: c.text }]}>SMC Checklist 4 ขั้นตอน</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={resetAll} style={styles.resetBtn}>
                        <Ionicons name="refresh" size={14} color="#ef4444" />
                        <Text style={styles.resetText}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setCollapsed(true)} style={styles.collapseBtn}>
                        <Ionicons name="chevron-up" size={16} color={c.sub} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressBar, { backgroundColor: c.checkBg }]}>
                <View style={[styles.progressFill, { width: `${(totalDone / totalChecks) * 100}%` }]} />
            </View>
            <Text style={[styles.progressLabel, { color: c.sub }]}>
                {totalDone === totalChecks ? 'Checklist ครบ! พร้อมเข้าเทรด' : `${totalDone}/${totalChecks} completed`}
            </Text>

            {/* Steps */}
            <ScrollView style={styles.stepsScroll} nestedScrollEnabled>
                {STEPS.map((step) => {
                    const { done, total } = getStepProgress(step);
                    const isExpanded = expandedStep === step.id;
                    const isComplete = done === total;

                    return (
                        <View key={step.id} style={[styles.stepCard, { backgroundColor: c.card, borderColor: isComplete ? step.color : c.border }]}>
                            <TouchableOpacity
                                style={styles.stepHeader}
                                onPress={() => setExpandedStep(isExpanded ? null : step.id)}
                            >
                                <View style={[styles.stepNumber, { backgroundColor: isComplete ? step.color : 'transparent', borderColor: step.color }]}>
                                    {isComplete ? (
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                    ) : (
                                        <Text style={[styles.stepNumberText, { color: step.color }]}>{step.number}</Text>
                                    )}
                                </View>
                                <View style={styles.stepInfo}>
                                    <Text style={[styles.stepTitle, { color: c.text }]}>{step.title}</Text>
                                    <Text style={[styles.stepSubtitle, { color: c.sub }]}>{step.subtitle}</Text>
                                </View>
                                <View style={styles.stepRight}>
                                    <Text style={[styles.stepCount, { color: step.color }]}>{done}/{total}</Text>
                                    <Ionicons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={14}
                                        color={c.sub}
                                    />
                                </View>
                            </TouchableOpacity>

                            {isExpanded && (
                                <View style={styles.checksContainer}>
                                    {step.checks.map((check) => (
                                        <TouchableOpacity
                                            key={check.id}
                                            style={[styles.checkRow, { backgroundColor: c.checkBg }]}
                                            onPress={() => toggleCheck(check.id)}
                                        >
                                            <View style={[styles.checkbox, {
                                                backgroundColor: checked[check.id] ? step.color : 'transparent',
                                                borderColor: checked[check.id] ? step.color : c.border,
                                            }]}>
                                                {checked[check.id] && (
                                                    <Ionicons name="checkmark" size={12} color="#fff" />
                                                )}
                                            </View>
                                            <Text style={[styles.checkText, {
                                                color: checked[check.id] ? c.sub : c.text,
                                                textDecorationLine: checked[check.id] ? 'line-through' : 'none',
                                            }]}>
                                                {check.text}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    // Collapsed bar
    collapsedBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 10,
    },
    collapsedLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    collapsedTitle: { fontSize: 14, fontWeight: '700' },
    progressPill: {
        backgroundColor: '#8b5cf6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    },
    progressPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    // Expanded container
    container: { borderRadius: 12, borderWidth: 1, marginTop: 10, overflow: 'hidden' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 12, paddingBottom: 8,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 15, fontWeight: '700' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    resetText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
    collapseBtn: { padding: 4 },

    // Progress
    progressBar: { height: 4, borderRadius: 2, marginHorizontal: 12 },
    progressFill: { height: 4, borderRadius: 2, backgroundColor: '#8b5cf6' },
    progressLabel: { fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 8 },

    // Steps
    stepsScroll: { maxHeight: 400, paddingHorizontal: 10, paddingBottom: 10 },
    stepCard: { borderRadius: 10, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
    stepHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
    stepNumber: {
        width: 28, height: 28, borderRadius: 14, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    stepNumberText: { fontSize: 13, fontWeight: 'bold' },
    stepInfo: { flex: 1 },
    stepTitle: { fontSize: 14, fontWeight: '700' },
    stepSubtitle: { fontSize: 11, marginTop: 1 },
    stepRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepCount: { fontSize: 12, fontWeight: '600' },

    // Checks
    checksContainer: { paddingHorizontal: 10, paddingBottom: 10, gap: 6 },
    checkRow: {
        flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, gap: 10,
    },
    checkbox: {
        width: 20, height: 20, borderRadius: 4, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    checkText: { flex: 1, fontSize: 13, lineHeight: 18 },
});

export default SmcChecklist;
