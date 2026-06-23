import React, { useRef, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Send, MoreVertical } from 'lucide-react-native';
import { Text, Input, Pill, Sheet, Button, BlurHeader } from '@/components/ui';
import { AIOrb } from '@/components/brand/AIOrb';
import { useTheme, radius } from '@/lib/theme';
import { useConversation, useReplyMutation } from '@/lib/api';
import { mockDelay } from '@/lib/mock-api';
import { formatRelative, haptic } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/stores/toastStore';

const AI_SUGGESTIONS = [
  'Bonjour ! Oui, nous avons une table disponible. Pour combien de personnes ?',
  'Merci pour votre message ! Je transmets votre demande à Patrick qui vous recontacte rapidement.',
  'Avec plaisir ! Notre menu est disponible sur place et en ligne. Souhaitez-vous que je vous l’envoie ?',
];

export default function ConversationDetail() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const lng = useSettingsStore((s) => s.language);
  const { data: conv, isLoading } = useConversation(conversationId);
  const reply = useReplyMutation(conversationId);
  const messages = conv?.messages ?? [];
  const [draft, setDraft] = useState('');
  const [aiPulse, setAiPulse] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  if (!conv) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <BlurHeader back />
        <Text style={{ padding: 20 }} color="muted">
          {isLoading ? '' : 'Conversation introuvable.'}
        </Text>
      </View>
    );
  }

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    haptic('light');
    reply.mutate(text);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const aiSuggest = async () => {
    setAiPulse(true);
    await mockDelay(900);
    const pick = AI_SUGGESTIONS[Math.floor(Math.random() * AI_SUGGESTIONS.length)]!;
    setDraft(pick);
    setAiPulse(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurHeader
        back
        title={conv.customerName}
        right={
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={{ padding: 6 }}>
            <MoreVertical size={20} color={c.foreground} />
          </Pressable>
        }
      />
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 120 }}>
        {messages.map((m) => {
          const mine = m.from !== 'customer';
          const fromAi = m.from === 'ai';
          return (
            <View
              key={m.id}
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                {fromAi ? <AIOrb size={16} active={false} /> : null}
                <View
                  style={{
                    backgroundColor: fromAi ? c.primary + '22' : mine ? c.accent : c.surfaceElevated,
                    borderColor: fromAi ? c.primary + '88' : c.border,
                    borderWidth: mine && !fromAi ? 0 : 1,
                    padding: 12,
                    borderRadius: radius.lg,
                    borderBottomRightRadius: mine ? 4 : radius.lg,
                    borderBottomLeftRadius: !mine ? 4 : radius.lg,
                  }}
                >
                  <Text variant={fromAi ? 'serifItalic' : 'body'} style={{ color: mine && !fromAi ? c.accentFg : c.foreground }}>{m.text}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 6 }}>
                {fromAi ? <Pill tone="default">IA</Pill> : null}
                {m.from === 'business' ? <Pill tone="muted">Vous</Pill> : null}
                <Text variant="mono" color="muted" style={{ fontSize: 10 }}>{formatRelative(m.timestamp, lng)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          padding: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          alignItems: 'flex-end',
        }}
      >
        <Pressable onPress={aiSuggest} style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
          {aiPulse ? <AIOrb size={28} active /> : <Sparkles size={20} color={c.accent} />}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Input variant="filled" value={draft} onChangeText={setDraft} placeholder={t('inbox.composer')} multiline />
        </View>
        <Pressable
          onPress={send}
          style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <Send size={18} color={c.accentFg} />
        </Pressable>
      </View>
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Text variant="h2" style={{ marginBottom: 12 }}>Actions</Text>
        <View style={{ gap: 8 }}>
          <Button title={t('inbox.markUnread')} variant="outline" fullWidth onPress={() => { setMenuOpen(false); toast({ title: 'Marqué non lu' }); }} />
          <Button title={t('inbox.archive')} variant="outline" fullWidth onPress={() => { setMenuOpen(false); toast({ title: 'Archivée' }); router.back(); }} />
          {conv.customerId ? (
            <Button
              title={t('inbox.viewCustomer')}
              variant="outline"
              fullWidth
              onPress={() => {
                setMenuOpen(false);
                router.push({ pathname: '/(tabs)/crm/[customerId]', params: { customerId: conv.customerId! } });
              }}
            />
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}
