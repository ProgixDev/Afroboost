import React from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileText,
  Phone,
  Star,
  UserPlus,
  BarChart3,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { Text, BlurHeader, IconTile, QueryBoundary, type IconTileTone } from '@/components/ui';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/lib/api';
import { useTheme, radius } from '@/lib/theme';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatRelative, haptic } from '@/lib/utils';
import type { Notification } from '@/types';

const KIND_META: Record<Notification['kind'], { icon: LucideIcon; tone: IconTileTone }> = {
  post: { icon: FileText, tone: 'primary' },
  call: { icon: Phone, tone: 'info' },
  review: { icon: Star, tone: 'accent' },
  customer: { icon: UserPlus, tone: 'success' },
  report: { icon: BarChart3, tone: 'deep' },
};

export default function NotificationsCenter() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const lng = useSettingsStore((s) => s.language);
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const hasUnread = (query.data ?? []).some((n) => !n.read);

  const renderItem = ({ item }: { item: Notification }) => {
    const meta = KIND_META[item.kind] ?? KIND_META.post;
    return (
      <Pressable
        onPress={() => {
          if (!item.read) {
            haptic('select');
            markRead.mutate(item.id);
          }
        }}
        style={{
          flexDirection: 'row',
          gap: 14,
          padding: 14,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: item.read ? c.border : c.accentMuted,
          backgroundColor: item.read ? c.surface : c.surfaceElevated,
          alignItems: 'flex-start',
        }}
      >
        <IconTile icon={meta.icon} tone={meta.tone} size="md" soft={item.read} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="bodyEmphasis" style={{ flex: 1 }} numberOfLines={1}>{item.title}</Text>
            {!item.read ? (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />
            ) : null}
          </View>
          <Text variant="body" color="muted" numberOfLines={2}>{item.body}</Text>
          <Text variant="caption" color="mutedFg" style={{ marginTop: 2 }}>{formatRelative(item.at, lng)}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurHeader
        back
        title={t('notifications.title')}
        right={
          hasUnread ? (
            <Pressable
              onPress={() => {
                haptic('select');
                markAll.mutate();
              }}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 }}
            >
              <CheckCheck size={16} color={c.accent} />
              <Text variant="caption" style={{ color: c.accent, fontFamily: 'Inter_600SemiBold' }}>
                {t('notifications.markAllRead')}
              </Text>
            </Pressable>
          ) : null
        }
      />
      <QueryBoundary
        query={query}
        empty={{
          icon: BarChart3,
          tone: 'muted',
          title: t('notifications.empty'),
          description: t('notifications.emptyDesc'),
        }}
      >
        {(data: Notification[]) => (
          <FlatList
            data={data}
            keyExtractor={(n) => n.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 120 }}
          />
        )}
      </QueryBoundary>
    </View>
  );
}
