import React, { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, EmptyState, BlurHeader, QueryBoundary } from '@/components/ui';
import { PostCard } from '@/components/domain/PostCard';
import { usePosts } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import type { PostStatus, Post } from '@/types';

type TabKey = 'feed' | 'review' | 'scheduled' | 'drafts';
const STATUS_FOR_TAB: Record<TabKey, PostStatus[]> = {
  feed: ['published', 'failed'],
  review: ['queued'],
  scheduled: ['scheduled'],
  drafts: ['draft'],
};

export default function ContentIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('feed');
  const query = usePosts();

  const items = useMemo(
    () => (query.data ?? []).filter((p) => STATUS_FOR_TAB[tab].includes(p.status)),
    [tab, query.data],
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurHeader title={t('tabs.content')} />
      <View style={{ paddingTop: 12, paddingBottom: 8 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'feed', label: t('content.tabs.feed') },
            { value: 'review', label: t('content.tabs.review') },
            { value: 'scheduled', label: t('content.tabs.scheduled') },
            { value: 'drafts', label: t('content.tabs.drafts') },
          ]}
        />
      </View>
      <QueryBoundary
        query={query}
        empty={{
          icon: Sparkles,
          tone: 'accent',
          title: t('content.empty'),
          description: 'Tapez le bouton sparkle pour créer votre première publication.',
        }}
      >
        {() => (
          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 110 }}
            renderItem={({ item }: { item: Post }) => (
              <PostCard post={item} onPress={() => router.push({ pathname: '/(tabs)/content/[id]', params: { id: item.id } })} />
            )}
            ListEmptyComponent={
              <EmptyState
                icon={Sparkles}
                tone="accent"
                title={t('content.empty')}
                description="Tapez le bouton sparkle pour créer votre première publication."
              />
            }
          />
        )}
      </QueryBoundary>
    </View>
  );
}
