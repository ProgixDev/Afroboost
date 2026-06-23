import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Users, FileText, MessageSquare, ChevronRight } from 'lucide-react-native';
import { Text, IconTile, EmptyState } from '@/components/ui';
import { useGlobalSearch } from '@/lib/api';
import { useTheme, radius } from '@/lib/theme';
import { haptic } from '@/lib/utils';

export default function SearchModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const query = useGlobalSearch(q);
  const results = query.data;
  const ready = q.trim().length >= 2;
  const total = results
    ? results.customers.length + results.posts.length + results.conversations.length
    : 0;

  const go = (path: string) => {
    haptic('select');
    router.back();
    // Defer so the modal dismiss animation doesn't fight the push.
    setTimeout(() => router.push(path as never), 10);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8 }}>
      {/* Search bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: c.surfaceElevated, borderRadius: radius.lg,
            borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, height: 46,
          }}
        >
          <Search size={18} color={c.muted} strokeWidth={1.75} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder={t('search.placeholder')}
            placeholderTextColor={c.mutedFg}
            style={{ flex: 1, color: c.foreground, fontFamily: 'Inter_400Regular', fontSize: 15 }}
            returnKeyType="search"
          />
          {q.length > 0 ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <X size={18} color={c.muted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ color: c.accent, fontFamily: 'Inter_600SemiBold' }}>{t('common.cancel')}</Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 18 }}
      >
        {!ready ? (
          <EmptyState icon={Search} title={t('search.title')} description={t('search.hint')} />
        ) : ready && total === 0 && !query.isLoading ? (
          <EmptyState icon={Search} title={t('search.empty')} description={t('search.emptyDesc')} />
        ) : (
          <>
            <Section
              title={t('search.customers')}
              icon={Users}
              tone="success"
              items={(results?.customers ?? []).map((x) => ({
                id: x.id, title: x.name, sub: x.phone ?? x.email ?? '',
                onPress: () => go(`/(tabs)/crm/${x.id}`),
              }))}
            />
            <Section
              title={t('search.posts')}
              icon={FileText}
              tone="primary"
              items={(results?.posts ?? []).map((x) => ({
                id: x.id, title: x.caption.slice(0, 48), sub: x.channels.join(' · '),
                onPress: () => go(`/(tabs)/content/${x.id}`),
              }))}
            />
            <Section
              title={t('search.conversations')}
              icon={MessageSquare}
              tone="info"
              items={(results?.conversations ?? []).map((x) => ({
                id: x.id, title: x.customerName, sub: x.lastMessage,
                onPress: () => go(`/(tabs)/inbox/${x.id}`),
              }))}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  icon,
  tone,
  items,
}: {
  title: string;
  icon: React.ComponentProps<typeof IconTile>['icon'];
  tone: React.ComponentProps<typeof IconTile>['tone'];
  items: { id: string; title: string; sub: string; onPress: () => void }[];
}) {
  const { c } = useTheme();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text variant="overline" color="mutedFg">{title}</Text>
      {items.map((it) => (
        <Pressable
          key={it.id}
          onPress={it.onPress}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
            borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
          }}
        >
          <IconTile icon={icon} tone={tone} size="sm" soft />
          <View style={{ flex: 1 }}>
            <Text variant="bodyEmphasis" numberOfLines={1}>{it.title}</Text>
            {it.sub ? <Text variant="caption" color="muted" numberOfLines={1}>{it.sub}</Text> : null}
          </View>
          <ChevronRight size={18} color={c.muted} />
        </Pressable>
      ))}
    </View>
  );
}
