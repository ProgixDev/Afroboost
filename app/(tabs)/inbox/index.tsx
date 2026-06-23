import React, { useMemo, useState } from 'react';
import { View, FlatList, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Inbox } from 'lucide-react-native';
import { Text, EmptyState, Divider, BlurHeader, QueryBoundary } from '@/components/ui';
import { ConversationListItem } from '@/components/domain/ConversationListItem';
import { ChannelIcon } from '@/components/domain/ChannelIcon';
import { useConversations } from '@/lib/api';
import type { Channel, Conversation } from '@/types';
import { useTheme } from '@/lib/theme';

const FILTERS: { key: 'all' | Channel | 'phone' | 'googleReview'; labelKey: string }[] = [
  { key: 'all', labelKey: 'inbox.all' },
  { key: 'phone', labelKey: 'inbox.calls' },
  { key: 'sms', labelKey: 'inbox.sms' },
  { key: 'whatsapp', labelKey: 'inbox.whatsapp' },
  { key: 'instagram', labelKey: 'inbox.instagram' },
  { key: 'facebook', labelKey: 'inbox.facebook' },
  { key: 'googleReview', labelKey: 'inbox.reviews' },
];

export default function InboxIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('all');
  const query = useConversations();
  const conversations = query.data ?? [];

  const items = useMemo(() => {
    if (filter === 'all') return conversations;
    return conversations.filter((c) => c.channel === filter);
  }, [filter, conversations]);

  const unreadCount = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurHeader title={t('inbox.title')} />
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Text variant="overline" color="mutedFg">{items.length} conversations · {unreadCount} non lues</Text>
      </View>
      <View style={{ paddingBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  if (f.key === 'phone') router.push('/(tabs)/inbox/calls');
                  else if (f.key === 'googleReview') router.push('/(tabs)/inbox/reviews');
                  else setFilter(f.key);
                }}
                style={{
                  paddingHorizontal: 12, paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? c.surfaceHigh : 'transparent',
                  borderWidth: 1,
                  borderColor: active ? c.accent : c.border,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}
              >
                {f.key !== 'all' && f.key !== 'phone' && f.key !== 'googleReview' ? (
                  <ChannelIcon channel={f.key as Channel} size={12} />
                ) : null}
                <Text style={{ color: active ? c.foreground : c.muted, fontFamily: 'Inter_500Medium' }}>{t(f.labelKey)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <QueryBoundary
        query={query}
        empty={{ icon: Inbox, title: t('inbox.empty') }}
      >
        {() => (
          <FlatList
            data={items}
            keyExtractor={(c) => c.id}
            ItemSeparatorComponent={Divider}
            contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
            renderItem={({ item }: { item: Conversation }) => (
              <ConversationListItem
                conv={item}
                onPress={() => router.push({ pathname: '/(tabs)/inbox/[conversationId]', params: { conversationId: item.id } })}
              />
            )}
            ListEmptyComponent={<EmptyState icon={Inbox} title={t('inbox.empty')} />}
          />
        )}
      </QueryBoundary>
    </View>
  );
}
