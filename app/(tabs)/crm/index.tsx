import React, { useMemo, useState } from 'react';
import { View, FlatList, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Upload, Download, MoreVertical, Users } from 'lucide-react-native';
import { Text, EmptyState, Input, Sheet, Button, BlurHeader, QueryBoundary } from '@/components/ui';
import { CustomerListItem } from '@/components/domain/CustomerListItem';
import { useCustomers } from '@/lib/api';
import type { Customer } from '@/types';
import { useTheme } from '@/lib/theme';
import { toast } from '@/stores/toastStore';

type Sort = 'name' | 'recent' | 'source';

export default function CrmIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [menuOpen, setMenuOpen] = useState(false);
  const query = useCustomers();

  const items = useMemo(() => {
    let list = query.data ?? [];
    if (q) list = list.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()));
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'source') list = [...list].sort((a, b) => a.source.localeCompare(b.source));
    if (sort === 'recent') list = [...list].sort((a, b) => (b.lastContactAt ?? '').localeCompare(a.lastContactAt ?? ''));
    return list;
  }, [q, sort, query.data]);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurHeader
        title={t('crm.title')}
        right={
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={{ padding: 6 }}>
            <MoreVertical size={20} color={c.foreground} />
          </Pressable>
        }
      />
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
        <Text variant="overline" color="mutedFg">{items.length} clients</Text>
        <Input variant="filled" placeholder={t('crm.search')} value={q} onChangeText={setQ} leftIcon={<Search size={16} color={c.muted} />} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['recent', 'name', 'source'] as Sort[]).map((k) => {
            const active = sort === k;
            const label = k === 'recent' ? t('crm.sortRecent') : k === 'name' ? t('crm.sortName') : t('crm.sortSource');
            return (
              <Pressable
                key={k}
                onPress={() => setSort(k)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: active ? c.surfaceHigh : 'transparent',
                  borderWidth: 1, borderColor: active ? c.accent : c.border,
                }}
              >
                <Text variant="caption" style={{ color: active ? c.foreground : c.muted, fontFamily: 'Inter_500Medium' }}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <QueryBoundary query={query} empty={{ icon: Users, title: t('crm.empty') }}>
        {() => (
          <FlatList
            data={items}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
            renderItem={({ item }: { item: Customer }) => (
              <CustomerListItem customer={item} onPress={() => router.push({ pathname: '/(tabs)/crm/[customerId]', params: { customerId: item.id } })} />
            )}
            ListEmptyComponent={<EmptyState icon={Users} title={t('crm.empty')} />}
          />
        )}
      </QueryBoundary>
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Text variant="h2" style={{ marginBottom: 12 }}>Actions</Text>
        <View style={{ gap: 8 }}>
          <Button title={t('crm.import')} variant="outline" leftIcon={<Upload size={16} color={c.foreground} />} fullWidth onPress={() => { setMenuOpen(false); router.push('/(tabs)/crm/import'); }} />
          <Button title={t('crm.export')} variant="outline" leftIcon={<Download size={16} color={c.foreground} />} fullWidth onPress={() => { setMenuOpen(false); toast({ title: t('crm.exported'), variant: 'success' }); }} />
        </View>
      </Sheet>
    </View>
  );
}
