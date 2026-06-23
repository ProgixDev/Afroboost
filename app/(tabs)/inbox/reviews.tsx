import React from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import { Text, EmptyState, BlurHeader } from '@/components/ui';
import { ReviewCard } from '@/components/domain/ReviewCard';
import { mockReviews } from '@/mocks';
import { useTheme } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

export default function Reviews() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const avg = mockReviews.reduce((s, r) => s + r.rating, 0) / mockReviews.length;
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurHeader back title={t('inbox.reviews')} />
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Star size={14} color={c.accent} fill={c.accent} />
        <Text variant="mono">{avg.toFixed(1)} · {mockReviews.length} avis</Text>
      </View>
      <FlatList
        data={mockReviews}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 110 }}
        renderItem={({ item }) => <ReviewCard review={item} />}
        ListEmptyComponent={<EmptyState icon={Star} title={t('inbox.empty')} />}
      />
    </View>
  );
}
