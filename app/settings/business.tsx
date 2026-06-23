import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Header } from '@/components/layout';
import { Input, Button, Text, RadioGroup } from '@/components/ui';
import { useProfile, useUpdateProfile } from '@/lib/api';
import type { Tone } from '@/types';
import { toast } from '@/stores/toastStore';
import { haptic } from '@/lib/utils';

export default function BusinessSettings() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [tone, setTone] = useState<Tone>('warm');
  const [services, setServices] = useState('');
  const [seeded, setSeeded] = useState(false);

  // Seed fields once the profile loads.
  if (profile && !seeded) {
    setName(profile.name);
    setAddress(profile.address);
    setTone(profile.tone);
    setServices(profile.services.join(', '));
    setSeeded(true);
  }

  const save = async () => {
    haptic('success');
    await updateProfile.mutateAsync({
      name,
      address,
      tone,
      services: services.split(',').map((s) => s.trim()).filter(Boolean),
    });
    toast({ title: 'Commerce enregistré', variant: 'success' });
  };

  return (
    <ScreenContainer scroll>
      <Header back title={t('settings.business')} />
      <View style={{ gap: 14 }}>
        <Input label={t('onboarding.businessProfile.nameLabel')} value={name} onChangeText={setName} />
        <Input label={t('onboarding.businessProfile.addressLabel')} value={address} onChangeText={setAddress} />
        <Input label={t('onboarding.businessProfile.servicesLabel')} value={services} onChangeText={setServices} multiline />
        <Text variant="bodyEmphasis">{t('onboarding.businessProfile.toneLabel')}</Text>
        <RadioGroup
          value={tone}
          onChange={setTone}
          options={[
            { value: 'warm', label: t('onboarding.businessProfile.toneWarm') },
            { value: 'pro', label: t('onboarding.businessProfile.tonePro') },
            { value: 'casual', label: t('onboarding.businessProfile.toneCasual') },
            { value: 'direct', label: t('onboarding.businessProfile.toneDirect') },
          ]}
        />
        <Button title={t('common.save')} fullWidth loading={updateProfile.isPending} onPress={save} />
      </View>
    </ScreenContainer>
  );
}
