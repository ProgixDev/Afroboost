import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Header } from '@/components/layout';
import { Input, Button, Text, Card, Sheet } from '@/components/ui';
import { Waveform } from '@/components/animations/Waveform';
import { mockBusiness } from '@/mocks';
import { toast } from '@/stores/toastStore';

export default function AgentConfig() {
  const { t } = useTranslation();
  const [greeting, setGreeting] = useState(t('onboarding.trainAgent.greetingDefault', { name: mockBusiness.name }));
  const [esc, setEsc] = useState(t('onboarding.trainAgent.escalationDefault'));
  const [hours, setHours] = useState('Lun–Dim 09:00–22:00');
  const [open, setOpen] = useState(false);

  return (
    <ScreenContainer scroll>
      <Header back title={t('settings.agent')} />
      <View style={{ gap: 14 }}>
        <Input label={t('onboarding.trainAgent.greetingLabel')} value={greeting} onChangeText={setGreeting} multiline />
        <Input label={t('onboarding.trainAgent.escalationLabel')} value={esc} onChangeText={setEsc} />
        <Input label={t('settings.agentHours')} value={hours} onChangeText={setHours} />
        <Card>
          <Text variant="bodyEmphasis">Numéro de l’agent</Text>
          <Text color="muted">+1 (514) 555-AFRO (mock)</Text>
        </Card>
        <Button title={t('settings.testAgent')} variant="secondary" onPress={() => setOpen(true)} fullWidth />
        <Button title={t('common.save')} fullWidth onPress={() => toast({ title: 'Agent enregistré', variant: 'success' })} />
      </View>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <Text variant="h2" style={{ marginBottom: 12 }}>Test de l’agent</Text>
        <View style={{ alignItems: 'center', marginVertical: 12 }}>
          <Waveform />
        </View>
        <Text color="muted" center>Agent activé — l’agent simule un appel entrant.</Text>
        <View style={{ height: 14 }} />
        <Button title="Fermer" variant="outline" onPress={() => setOpen(false)} fullWidth />
      </Sheet>
    </ScreenContainer>
  );
}
