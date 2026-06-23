import React, { useState } from 'react';
import { View, FlatList, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone } from 'lucide-react-native';
import { Text, Sheet, Button, EmptyState, BlurHeader } from '@/components/ui';
import { CallListItem } from '@/components/domain/CallListItem';
import { mockCalls } from '@/mocks';
import { useTheme } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import type { Call } from '@/types';

export default function Calls() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<Call | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurHeader back title={t('inbox.calls')} />
      <FlatList
        data={mockCalls}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        renderItem={({ item }) => <CallListItem call={item} onPress={() => setOpen(item)} />}
        ListEmptyComponent={<EmptyState icon={Phone} title={t('inbox.empty')} />}
      />
      <Sheet open={!!open} onClose={() => setOpen(null)}>
        {open ? (
          <View style={{ gap: 14 }}>
            <View>
              <Text variant="overline" color="mutedFg">Transcription</Text>
              <Text variant="h2" style={{ marginTop: 4 }}>{open.caller}</Text>
              <Text variant="caption" color="muted">{open.intent} · {open.durationSec}s</Text>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              <View style={{ gap: 10 }}>
                {(open.transcript ?? []).map((line, i) => (
                  <Text key={i} variant={line.startsWith('Agent') ? 'serifItalic' : 'body'} color={line.startsWith('Agent') ? 'foreground' : 'muted'}>
                    {line}
                  </Text>
                ))}
              </View>
            </ScrollView>
            <Button title="Fermer" variant="outline" onPress={() => setOpen(null)} fullWidth />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
