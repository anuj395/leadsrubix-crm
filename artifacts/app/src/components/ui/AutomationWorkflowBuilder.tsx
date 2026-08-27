import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InfoGuideBadge } from './InfoGuideBadge';
import { automationService, AutomationRule, DEFAULT_AUTOMATIONS } from '../../services/automationService';
import { theme } from '../../theme/theme';

export const AutomationWorkflowBuilder: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_AUTOMATIONS);
  const [ruleName, setRuleName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<AutomationRule['trigger']>('lead_created');
  const [selectedAction, setSelectedAction] = useState<AutomationRule['action']>('send_whatsapp');
  const [webhookUrl, setWebhookUrl] = useState('');

  const triggers: { key: AutomationRule['trigger']; label: string; icon: string }[] = [
    { key: 'lead_created', label: 'New Lead Created', icon: 'person-add-sharp' },
    { key: 'stage_changed', label: 'Lead Stage Changed', icon: 'swap-horizontal-sharp' },
    { key: 'call_log_added', label: 'Post-Call Logged', icon: 'call-sharp' },
    { key: 'quote_generated', label: 'CPQ Quote Shared', icon: 'document-text-sharp' },
  ];

  const actions: { key: AutomationRule['action']; label: string; icon: string }[] = [
    { key: 'send_whatsapp', label: 'Dispatch WhatsApp Template', icon: 'logo-whatsapp' },
    { key: 'send_email', label: 'Send Email Brochure', icon: 'mail-sharp' },
    { key: 'assign_agent', label: 'Round-Robin Assign Agent', icon: 'people-sharp' },
    { key: 'create_task', label: 'Auto Schedule Visit Task', icon: 'calendar-sharp' },
    { key: 'webhook', label: 'Zapier Custom Webhook', icon: 'flash-sharp' },
  ];

  const handleCreateRule = () => {
    if (!ruleName.trim()) {
      Alert.alert('Workflow Name Required', 'Please enter a name for your automation workflow.');
      return;
    }

    const newRule: AutomationRule = {
      id: `rule_${Date.now().toString().slice(-4)}`,
      name: ruleName.trim(),
      trigger: selectedTrigger,
      action: selectedAction,
      actionConfig: { webhookUrl: webhookUrl || 'https://hooks.zapier.com/hooks/catch/custom' },
      isActive: true,
      executionCount: 0,
    };

    setRules([newRule, ...rules]);
    setRuleName('');
    setWebhookUrl('');

    Alert.alert('Workflow Published!', `Zapier-style automation "${newRule.name}" is now live!`);
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeaderTitle}>ZAPIER-STYLE CUSTOM WORKFLOW ENGINE</Text>
        <InfoGuideBadge
          title="Workflow Automations"
          description="Build custom multi-step automation rules connecting triggers (New Lead, Stage Change) to actions (WhatsApp, Email, Webhooks)."
        />
      </View>

      {/* Visual Rule Builder Card */}
      <View style={styles.card3D}>
        <Text style={styles.cardTitle}>CREATE NEW WORKFLOW RULE</Text>

        <Text style={styles.inputLabel}>WORKFLOW RULE NAME *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Auto WhatsApp Welcome on Meta Inquiry..."
          placeholderTextColor="#94A3B8"
          value={ruleName}
          onChangeText={setRuleName}
        />

        {/* STEP 1: Select Trigger Node */}
        <Text style={styles.inputLabel}>1. WHEN THIS HAPPENS (TRIGGER) *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nodeScroll}>
          {triggers.map((t) => {
            const isSelected = selectedTrigger === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.nodeChip, isSelected && styles.triggerChipSelected]}
                onPress={() => setSelectedTrigger(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon as any} size={14} color={isSelected ? '#FFFFFF' : '#0284C7'} />
                <Text style={[styles.nodeChipText, isSelected && styles.nodeChipTextSelected]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* STEP 2: Select Action Node */}
        <Text style={styles.inputLabel}>2. DO THIS AUTOMATICALLY (ACTION) *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nodeScroll}>
          {actions.map((a) => {
            const isSelected = selectedAction === a.key;
            return (
              <TouchableOpacity
                key={a.key}
                style={[styles.nodeChip, isSelected && styles.actionChipSelected]}
                onPress={() => setSelectedAction(a.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={a.icon as any} size={14} color={isSelected ? '#FFFFFF' : '#059669'} />
                <Text style={[styles.nodeChipText, isSelected && styles.nodeChipTextSelected]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedAction === 'webhook' && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.inputLabel}>ZAPIER WEBHOOK ENDPOINT URL</Text>
            <TextInput
              style={styles.textInput}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              placeholderTextColor="#94A3B8"
              value={webhookUrl}
              onChangeText={setWebhookUrl}
              autoCapitalize="none"
            />
          </View>
        )}

        <TouchableOpacity style={styles.createBtn3D} onPress={handleCreateRule} activeOpacity={0.88}>
          <Ionicons name="flash-sharp" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Publish Automation Rule</Text>
        </TouchableOpacity>
      </View>

      {/* Active Workflows Inventory */}
      <View style={styles.card3D}>
        <Text style={styles.cardTitle}>ACTIVE WORKFLOW RULES ({rules.length})</Text>

        {rules.map((rule) => (
          <View key={rule.id} style={styles.ruleItemCard}>
            <View style={styles.ruleHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleNameText}>{rule.name}</Text>
                <Text style={styles.ruleSubtext}>
                  Executed <Text style={{ fontWeight: '700', color: theme.colors.brand700 }}>{rule.executionCount} times</Text>
                </Text>
              </View>

              <Switch
                value={rule.isActive}
                onValueChange={() => handleToggleRule(rule.id)}
                trackColor={{ false: '#CBD5E1', true: '#059669' }}
              />
            </View>

            <View style={styles.ruleFlowBadgeRow}>
              <View style={styles.triggerBadge}>
                <Text style={styles.triggerBadgeText}>TRIGGER: {rule.trigger.toUpperCase()}</Text>
              </View>
              <Ionicons name="arrow-forward-sharp" size={14} color="#94A3B8" />
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>ACTION: {rule.action.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  card3D: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  nodeScroll: {
    marginBottom: 14,
    marginHorizontal: -4,
  },
  nodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  triggerChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  actionChipSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  nodeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  nodeChipTextSelected: {
    color: '#FFFFFF',
  },
  createBtn3D: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand700,
    borderRadius: 12,
    height: 48,
    gap: 8,
    marginTop: 4,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ruleItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ruleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ruleNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  ruleSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  ruleFlowBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
  },
  triggerBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  triggerBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  actionBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
});
