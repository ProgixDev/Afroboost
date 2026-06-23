import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Header } from '@/components/layout';
import { MockOAuthRow } from '@/components/domain/MockOAuthButton';
import { connectMeta } from '@/lib/api/connect';
import { mockBusiness } from '@/mocks';

export default function AccountsSettings() {
  const { t } = useTranslation();
  return (
    <ScreenContainer scroll>
      <Header back title={t('settings.accounts')} />
      <View style={{ gap: 10 }}>
        <MockOAuthRow provider="facebook" label="Facebook" connected={mockBusiness.connectedAccounts.facebook} onConnect={connectMeta} />
        <MockOAuthRow provider="instagram" label="Instagram" connected={mockBusiness.connectedAccounts.instagram} onConnect={connectMeta} />
        <MockOAuthRow provider="google" label="Google Business" connected={mockBusiness.connectedAccounts.google} />
        <MockOAuthRow provider="calendly" label="Calendly" connected={mockBusiness.connectedAccounts.calendly} />
        <MockOAuthRow provider="stripe" label="Stripe" connected={mockBusiness.connectedAccounts.stripe} />
        <MockOAuthRow provider="twilio" label="Twilio (SMS)" connected={mockBusiness.connectedAccounts.twilio} />
        <MockOAuthRow provider="whatsapp" label="WhatsApp" connected={mockBusiness.connectedAccounts.whatsapp} />
        <MockOAuthRow provider="gmail" label="Gmail" connected={mockBusiness.connectedAccounts.gmail} />
        <MockOAuthRow provider="outlook" label="Outlook" connected={mockBusiness.connectedAccounts.outlook} />
      </View>
    </ScreenContainer>
  );
}
