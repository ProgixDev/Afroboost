import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, Header } from '@/components/layout';
import { MockOAuthRow } from '@/components/domain/MockOAuthButton';
import { connectMeta, connectGoogle, ConnectCancelledError, useProfile } from '@/lib/api';
import { toast } from '@/stores/toastStore';

export default function AccountsSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const acc = profile?.connectedAccounts ?? {};

  // One Meta OAuth connects BOTH Facebook and Instagram on the backend. After it
  // succeeds, refetch the profile so both rows reflect the real connected state
  // (the rows are keyed by connection state, so they remount as "Connecté").
  // Wrap a connect call with a profile refetch (so rows reflect real state) and
  // error surfacing — shared by the Meta and Google rows.
  const withRefresh = (connectFn: () => Promise<void>) => async () => {
    try {
      await connectFn();
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) {
      // A plain cancel isn't an error; anything else gets surfaced so the user
      // isn't left staring at a row that silently did nothing.
      if (!(e instanceof ConnectCancelledError)) {
        toast({ title: (e as Error).message || 'Connexion échouée', variant: 'danger' });
      }
      throw e; // keep the row "Non connecté"
    }
  };
  const connectMetaAndRefresh = withRefresh(connectMeta);
  const connectGoogleAndRefresh = withRefresh(connectGoogle);

  return (
    <ScreenContainer scroll>
      <Header back title={t('settings.accounts')} />
      <View style={{ gap: 10 }}>
        {/* key includes the connection state so the row remounts with the
            correct initial state once the profile loads asynchronously. */}
        <MockOAuthRow key={`facebook-${!!acc.facebook}`} provider="facebook" label="Facebook" connected={!!acc.facebook} onConnect={connectMetaAndRefresh} />
        <MockOAuthRow key={`instagram-${!!acc.instagram}`} provider="instagram" label="Instagram" connected={!!acc.instagram} onConnect={connectMetaAndRefresh} />
        <MockOAuthRow key={`google-${!!acc.google}`} provider="google" label="Google Business" connected={!!acc.google} onConnect={connectGoogleAndRefresh} />
        <MockOAuthRow key={`calendly-${!!acc.calendly}`} provider="calendly" label="Calendly" connected={!!acc.calendly} />
        <MockOAuthRow key={`stripe-${!!acc.stripe}`} provider="stripe" label="Stripe" connected={!!acc.stripe} />
        <MockOAuthRow key={`twilio-${!!acc.twilio}`} provider="twilio" label="Twilio (SMS)" connected={!!acc.twilio} />
        <MockOAuthRow key={`whatsapp-${!!acc.whatsapp}`} provider="whatsapp" label="WhatsApp" connected={!!acc.whatsapp} />
        <MockOAuthRow key={`gmail-${!!acc.gmail}`} provider="gmail" label="Gmail" connected={!!acc.gmail} />
        <MockOAuthRow key={`outlook-${!!acc.outlook}`} provider="outlook" label="Outlook" connected={!!acc.outlook} />
      </View>
    </ScreenContainer>
  );
}
