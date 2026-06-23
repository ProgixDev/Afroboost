import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Input, Button, Select, BlurHeader } from '@/components/ui';
import type { CustomerSource } from '@/types';
import { useCreateCustomer } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import { haptic } from '@/lib/utils';
import { useTheme } from '@/lib/theme';

export default function AddCustomer() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<CustomerSource>('phone');
  const [tags, setTags] = useState('');
  const createCustomer = useCreateCustomer();

  const submit = async () => {
    if (!name) return;
    haptic('success');
    await createCustomer.mutateAsync({
      name,
      phone: phone || undefined,
      email: email || undefined,
      source,
      tags: tags ? tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    });
    toast({ title: t('crm.add.saved'), variant: 'success' });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurHeader back title={t('crm.add.title')} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110, gap: 24 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text variant="overline" color="mutedFg">Nouveau</Text>
          <Text variant="display" style={{ fontSize: 36, marginTop: 4 }}>Un client{'\n'}<Text variant="display" style={{ color: c.accent, fontSize: 36 }}>de plus.</Text></Text>
        </View>
        <View style={{ gap: 22 }}>
          <Input label={t('crm.fields.name')} value={name} onChangeText={setName} />
          <Input label={t('crm.fields.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label={t('crm.fields.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Select
            label={t('crm.fields.source')}
            value={source}
            onChange={setSource}
            options={[
              { value: 'phone', label: t('crm.sources.phone') },
              { value: 'social', label: t('crm.sources.social') },
              { value: 'walkIn', label: t('crm.sources.walkIn') },
              { value: 'referral', label: t('crm.sources.referral') },
              { value: 'import', label: t('crm.sources.import') },
            ]}
          />
          <Input label={t('crm.fields.tags')} value={tags} onChangeText={setTags} placeholder="VIP, Anniversaire…" />
        </View>
        <Button title={t('common.save')} onPress={submit} loading={createCustomer.isPending} disabled={!name} fullWidth />
      </ScrollView>
    </View>
  );
}
