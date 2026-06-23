import React, { useState } from 'react';
import { View } from 'react-native';
import { Star } from 'lucide-react-native';
import { Text, Card, Button, Pill, Input } from '@/components/ui';
import { AIOrb } from '@/components/brand/AIOrb';
import { useTheme, radius } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { toast } from '@/stores/toastStore';
import { useApproveReview, useRejectReview } from '@/lib/api';
import { haptic } from '@/lib/utils';
import type { Review } from '@/types';

export function ReviewCard({ review }: { review: Review }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [draft, setDraft] = useState(review.draftReply);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<Review['status']>(review.status);
  const approveMutation = useApproveReview();
  const rejectMutation = useRejectReview();

  const approve = async () => {
    setStatus('approved');
    haptic('success');
    await approveMutation.mutateAsync({ id: review.id, reply: draft });
    toast({ title: t('inbox.review.approved'), variant: 'success' });
  };
  const reject = () => {
    setStatus('rejected');
    rejectMutation.mutate(review.id);
    toast({ title: 'Avis rejeté' });
  };

  return (
    <Card padding={18}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="bodyEmphasis">{review.author}</Text>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              color={c.accent}
              fill={i < review.rating ? c.accent : 'transparent'}
            />
          ))}
        </View>
      </View>
      <Text variant="serifItalic" style={{ marginTop: 10 }}>"{review.snippet}"</Text>
      <View
        style={{
          marginTop: 14,
          padding: 14,
          backgroundColor: c.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.primary + '55',
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AIOrb size={20} active={status === 'pending'} />
          <Text variant="overline" color="muted">{t('inbox.review.draftedBy')}</Text>
        </View>
        {editing ? (
          <Input variant="filled" multiline value={draft} onChangeText={setDraft} />
        ) : (
          <Text>{draft}</Text>
        )}
        {status === 'pending' ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <Button title={t('inbox.review.approve')} size="sm" onPress={approve} loading={approveMutation.isPending} />
            <Button title={t('inbox.review.edit')} size="sm" variant="outline" onPress={() => setEditing((e) => !e)} />
            <Button title={t('inbox.review.reject')} size="sm" variant="ghost" onPress={reject} />
          </View>
        ) : status === 'approved' ? (
          <Pill tone="success" dot filled>Réponse publiée</Pill>
        ) : (
          <Pill tone="muted" filled>Rejeté</Pill>
        )}
      </View>
    </Card>
  );
}
