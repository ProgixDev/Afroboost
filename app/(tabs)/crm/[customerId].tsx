import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Phone, MapPin } from 'lucide-react-native';
import { Text, Avatar, Tabs, Card, Input, Button, Pill, BlurHeader } from '@/components/ui';
import { useCustomer, useUpdateCustomer } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { formatDate, haptic } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/stores/toastStore';

type Tab = 'profile' | 'history' | 'notes';

export default function CustomerDetail() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const lng = useSettingsStore((s) => s.language);
  const { data: cust, isLoading } = useCustomer(customerId);
  const updateCustomer = useUpdateCustomer();
  const [tab, setTab] = useState<Tab>('profile');
  const [notes, setNotes] = useState('');
  const [notesInit, setNotesInit] = useState(false);

  // Seed the notes field once the customer loads.
  if (cust && !notesInit) {
    setNotes(cust.notes ?? '');
    setNotesInit(true);
  }

  if (!cust) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <BlurHeader back />
        <Text style={{ padding: 20 }} color="muted">
          {isLoading ? '' : 'Client introuvable.'}
        </Text>
      </View>
    );
  }

  const saveNotes = async () => {
    haptic('success');
    await updateCustomer.mutateAsync({ id: cust.id, patch: { notes } });
    toast({ title: 'Notes enregistrées', variant: 'success' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ position: 'relative', paddingTop: insets.top + 56, paddingBottom: 24, alignItems: 'center', gap: 12 }}>
        <LinearGradient
          colors={[c.deep + '55', c.background] as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        <Avatar name={cust.name} size="xl" ring />
        <Text variant="display" center style={{ fontSize: 32 }}>{cust.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {cust.tags.map((tag) => <Pill key={tag} tone="accent" filled>{tag}</Pill>)}
          <Pill tone="muted">{t(`crm.sources.${cust.source}` as any)}</Pill>
        </View>
      </View>

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <BlurHeader back transparent />
      </View>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'profile', label: t('crm.tabs.profile') },
          { value: 'history', label: t('crm.tabs.history') },
          { value: 'notes', label: t('crm.tabs.notes') },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 110 }}>
        {tab === 'profile' && (
          <Card padding={0}>
            {cust.phone ? <Row icon={<Phone size={16} color={c.muted} />} label={t('crm.fields.phone')} value={cust.phone} /> : null}
            {cust.email ? <Row icon={<Mail size={16} color={c.muted} />} label={t('crm.fields.email')} value={cust.email} /> : null}
            {cust.address ? <Row icon={<MapPin size={16} color={c.muted} />} label={t('crm.fields.address')} value={cust.address} /> : null}
          </Card>
        )}
        {tab === 'history' && (
          <View style={{ gap: 12 }}>
            {(cust.history ?? []).map((h, i) => (
              <View key={h.id} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ alignItems: 'center', width: 16 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent, marginTop: 6 }} />
                  {i < (cust.history?.length ?? 0) - 1 ? <View style={{ flex: 1, width: 1, backgroundColor: c.border, marginTop: 4 }} /> : null}
                </View>
                <Card style={{ flex: 1 }}>
                  <Text variant="overline" color="mutedFg">{formatDate(h.at, 'PP', lng)}</Text>
                  <Text variant="bodyEmphasis" style={{ marginTop: 4 }}>{h.type}</Text>
                  <Text variant="serifItalic" color="muted" style={{ marginTop: 4 }}>{h.text}</Text>
                </Card>
              </View>
            ))}
          </View>
        )}
        {tab === 'notes' && (
          <View style={{ gap: 12 }}>
            <Input variant="filled" multiline value={notes} onChangeText={setNotes} placeholder="Notes…" />
            <Button title={t('common.save')} loading={updateCustomer.isPending} onPress={saveNotes} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text variant="overline" color="mutedFg">{label}</Text>
        <Text style={{ marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}
