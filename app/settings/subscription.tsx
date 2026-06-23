import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Header } from '@/components/layout';
import { Text, Card, Button, Sheet, Modal, Divider } from '@/components/ui';
import { PlanCard } from '@/components/domain/PlanCard';
import { useProfile, useSubscription, openBillingPortal } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import { haptic } from '@/lib/utils';
import type { Plan } from '@/types';

export default function Subscription() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const { data: sub } = useSubscription();
  const [planSheet, setPlanSheet] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [plan, setPlan] = useState<Plan>('performance');
  const [planSeeded, setPlanSeeded] = useState(false);

  if (profile && !planSeeded) {
    setPlan(profile.plan);
    setPlanSeeded(true);
  }

  const invoices = sub?.invoices ?? [];

  const manage = async () => {
    haptic('medium');
    const { opened } = await openBillingPortal();
    if (!opened) toast({ title: 'Forfait mis à jour', variant: 'success' });
  };

  return (
    <ScreenContainer scroll>
      <Header back title={t('settings.subscriptionTitle')} />
      <Card>
        <Text variant="caption" color="muted">{t('settings.currentPlan')}</Text>
        <Text variant="display" style={{ marginTop: 4 }}>{t(`auth.plan.${plan}` as any)}</Text>
        <Text color="muted" style={{ marginTop: 4 }}>97 $ / mois · Essai actif jusqu’au 24 mai</Text>
        <View style={{ marginTop: 12 }}>
          <Button title={t('settings.changePlan')} onPress={() => setPlanSheet(true)} />
        </View>
      </Card>

      <Card>
        <Text variant="bodyEmphasis">{t('settings.nextBilling')}</Text>
        <Text color="muted" style={{ marginTop: 4 }}>24 mai 2026</Text>
        <Divider />
        <Text variant="bodyEmphasis" style={{ marginTop: 12 }}>{t('settings.paymentMethod')}</Text>
        <Text color="muted" style={{ marginTop: 4 }}>Visa •••• 4242</Text>
      </Card>

      <Card>
        <Text variant="h3" style={{ marginBottom: 8 }}>{t('settings.billingHistory')}</Text>
        {invoices.map((inv, i) => (
          <View key={inv.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View>
                <Text variant="bodyEmphasis">{inv.date}</Text>
                <Text variant="caption" color="muted">{inv.status}</Text>
              </View>
              <Text>{inv.amount}</Text>
            </View>
            {i < invoices.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </Card>

      <Button title={t('settings.cancelSub')} variant="outline" onPress={() => setCancelOpen(true)} />

      <Sheet open={planSheet} onClose={() => setPlanSheet(false)}>
        <Text variant="h2" style={{ marginBottom: 12 }}>{t('settings.changePlan')}</Text>
        <View style={{ gap: 10 }}>
          <PlanCard
            name={t('auth.plan.decouverte')}
            price="49 $"
            pricePeriod={t('auth.plan.perMonth')}
            features={['12 publications IA / mois', 'Inbox', 'CRM 500']}
            selected={plan === 'decouverte'}
            onPress={() => setPlan('decouverte')}
          />
          <PlanCard
            name={t('auth.plan.performance')}
            price="97 $"
            pricePeriod={t('auth.plan.perMonth')}
            features={['Publications illimitées', 'Agent IA', 'Avis Google auto']}
            popular
            selected={plan === 'performance'}
            onPress={() => setPlan('performance')}
          />
          <PlanCard
            name={t('auth.plan.premium')}
            price="197 $"
            pricePeriod={t('auth.plan.perMonth')}
            features={['Multi-établissements', 'Analyses avancées']}
            comingSoon
          />
        </View>
        <View style={{ height: 14 }} />
        <Button
          title={t('common.confirm')}
          fullWidth
          onPress={() => {
            setPlanSheet(false);
            manage();
          }}
        />
      </Sheet>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <Text variant="h2">{t('settings.cancelSub')}</Text>
        <Text color="muted" style={{ marginTop: 8 }}>{t('settings.cancelConfirm')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Button title={t('common.cancel')} variant="outline" onPress={() => setCancelOpen(false)} />
          <View style={{ flex: 1 }}>
            <Button
              title={t('common.confirm')}
              variant="destructive"
              fullWidth
              onPress={() => {
                setCancelOpen(false);
                manage();
              }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
