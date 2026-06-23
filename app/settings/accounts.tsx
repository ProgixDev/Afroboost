import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Header } from '@/components/layout';
import { MockOAuthRow } from '@/components/domain/MockOAuthButton';
import { connectMeta, useProfile } from '@/lib/api';

export default function AccountsSettings() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const acc = profile?.connectedAccounts ?? {};
  return (
    <ScreenContainer scroll>
      <Header back title={t('settings.accounts')} />
      <View style={{ gap: 10 }}>
        {/* key includes the connection state so the row remounts with the
            correct initial state once the profile loads asynchronously. */}
        <MockOAuthRow key={`facebook-${!!acc.facebook}`} provider="facebook" label="Facebook" connected={!!acc.facebook} onConnect={connectMeta} />
        <MockOAuthRow key={`instagram-${!!acc.instagram}`} provider="instagram" label="Instagram" connected={!!acc.instagram} onConnect={connectMeta} />
        <MockOAuthRow key={`google-${!!acc.google}`} provider="google" label="Google Business" connected={!!acc.google} />
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
