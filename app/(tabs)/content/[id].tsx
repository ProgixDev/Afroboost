import React, { useState } from 'react';
import { View, Image, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, MessageCircle, Eye, Edit3, Copy, Trash2, RefreshCw } from 'lucide-react-native';
import { Text, Card, Button, Pill, BlurHeader, AnimatedNumber, Modal } from '@/components/ui';
import { ChannelIcon } from '@/components/domain/ChannelIcon';
import { useTheme } from '@/lib/theme';
import { mockPosts } from '@/mocks';
import { formatDate } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/stores/toastStore';
import { useTranslation } from 'react-i18next';

export default function PostDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const lng = useSettingsStore((s) => s.language);
  const post = mockPosts.find((p) => p.id === id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <BlurHeader back />
        <Text>Publication introuvable.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <Image source={{ uri: post.imageUrl }} style={{ width: '100%', aspectRatio: 1, backgroundColor: c.border }} />
        <View style={{ padding: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {post.channels.map((ch) => <ChannelIcon key={ch} channel={ch as any} size={16} withBg />)}
            <Pill tone={post.status === 'published' ? 'success' : post.status === 'scheduled' ? 'info' : post.status === 'failed' ? 'danger' : 'muted'} filled>
              {post.status}
            </Pill>
          </View>
          <Text variant="serifItalic" style={{ fontSize: 18, lineHeight: 26 }}>"{post.caption}"</Text>
          {post.engagement ? (
            <Card>
              <Text variant="overline" color="mutedFg" style={{ marginBottom: 14 }}>{t('content.post.engagement')}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Stat icon={<Heart color={c.danger} size={20} />} label={t('content.post.likes')} value={post.engagement.likes} />
                <Stat icon={<MessageCircle color={c.info} size={20} />} label={t('content.post.comments')} value={post.engagement.comments} />
                <Stat icon={<Eye color={c.muted} size={20} />} label={t('content.post.reach')} value={post.engagement.reach} />
              </View>
            </Card>
          ) : null}
          {post.scheduledAt ? (
            <Card>
              <Text variant="overline" color="mutedFg">Programmée le</Text>
              <Text variant="serifItalic" style={{ fontSize: 18, marginTop: 6 }}>{formatDate(post.scheduledAt, 'PPpp', lng)}</Text>
            </Card>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button title={t('common.edit')} variant="outline" leftIcon={<Edit3 size={16} color={c.foreground} />} />
            <Button title={t('content.post.duplicate')} variant="outline" leftIcon={<Copy size={16} color={c.foreground} />} onPress={() => toast({ title: 'Dupliquée', variant: 'success' })} />
            <Button title={t('content.post.republish')} variant="outline" leftIcon={<RefreshCw size={16} color={c.foreground} />} onPress={() => toast({ title: 'Republiée', variant: 'success' })} />
            <Button title={t('common.delete')} variant="destructive" leftIcon={<Trash2 size={16} color="#fff" />} onPress={() => setConfirmDelete(true)} />
          </View>
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <BlurHeader back transparent />
      </View>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Text variant="h2">{t('common.delete')}</Text>
        <Text variant="body" color="muted" style={{ marginTop: 8 }}>
          Cette publication sera définitivement supprimée. Cette action est irréversible.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Button title={t('common.cancel')} variant="outline" fullWidth onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} />
          <Button
            title={t('common.delete')}
            variant="destructive"
            fullWidth
            style={{ flex: 1 }}
            onPress={() => {
              setConfirmDelete(false);
              toast({ title: 'Publication supprimée', variant: 'success' });
              router.back();
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      {icon}
      <AnimatedNumber value={value} variant="metric" />
      <Text variant="overline" color="mutedFg">{label}</Text>
    </View>
  );
}
