import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, Image } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { Check, Mail, Calendar, MessageCircle, Phone, CreditCard, Globe, ArrowRight } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { useTheme, radius } from '@/lib/theme';
import { mockDelay } from '@/lib/mock-api';
import type { Provider } from '@/types';

const FACEBOOK_LOGO = require('../../../assets/images/facebook.png');
const INSTAGRAM_LOGO = require('../../../assets/images/instagram.png');

const PROVIDER_META: Record<Provider, { name: string; bg: string; icon: (size: number, color: string) => React.ReactNode }> = {
  facebook: { name: 'Facebook', bg: 'transparent', icon: (s) => <Image source={FACEBOOK_LOGO} style={{ width: s * 2, height: s * 2 }} resizeMode="contain" /> },
  instagram: { name: 'Instagram', bg: 'transparent', icon: (s) => <Image source={INSTAGRAM_LOGO} style={{ width: s * 2, height: s * 2 }} resizeMode="contain" /> },
  google: { name: 'Google Business', bg: '#0F9D58', icon: (s, c) => <Globe size={s} color={c} /> },
  whatsapp: { name: 'WhatsApp', bg: '#25D366', icon: (s, c) => <MessageCircle size={s} color={c} /> },
  twilio: { name: 'Twilio', bg: '#F22F46', icon: (s, c) => <Phone size={s} color={c} /> },
  stripe: { name: 'Stripe', bg: '#635BFF', icon: (s, c) => <CreditCard size={s} color={c} /> },
  gmail: { name: 'Gmail', bg: '#D14836', icon: (s, c) => <Mail size={s} color={c} /> },
  outlook: { name: 'Outlook', bg: '#0078D4', icon: (s, c) => <Mail size={s} color={c} /> },
  calendly: { name: 'Calendly', bg: '#006BFF', icon: (s, c) => <Calendar size={s} color={c} /> },
};

export type MockOAuthButtonProps = {
  provider: Provider;
  connected?: boolean;
  label?: string;
  onPress?: () => void;
  /** Real connect handler; when provided it runs instead of the mock delay. */
  onConnect?: () => Promise<void>;
};

export function MockOAuthButton({ provider, connected: connectedProp, label, onPress, onConnect }: MockOAuthButtonProps) {
  const meta = PROVIDER_META[provider];
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(!!connectedProp);
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const run = async () => {
    if (connected || busy) return;
    setBusy(true);
    try {
      if (onConnect) await onConnect();
      else await mockDelay(1200);
      setConnected(true);
      scale.value = withSequence(withSpring(1.03, { damping: 10 }), withSpring(1));
      onPress?.();
    } catch {
      // Leave disconnected on failure so the user can retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View style={aStyle}>
      <Pressable
        disabled={busy || connected}
        onPress={run}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 14,
          backgroundColor: connected ? c.surfaceHigh : c.surfaceElevated,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: connected ? c.primary : c.border,
        }}
      >
        <View
          style={{
            width: 40, height: 40, borderRadius: 999,
            backgroundColor: meta.bg,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {meta.icon(20, '#fff')}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyEmphasis">{label ?? meta.name}</Text>
          <Text variant="caption" color={connected ? 'success' : 'muted'}>
            {connected ? 'Connecté' : 'Non connecté'}
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator color={c.accent} />
        ) : connected ? (
          <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={16} color={c.primaryFg} strokeWidth={3} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: c.accent, fontFamily: 'Inter_600SemiBold' }}>Connecter</Text>
            <ArrowRight size={14} color={c.accent} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function MockOAuthRow(props: MockOAuthButtonProps & { onToggle?: (v: boolean) => void }) {
  const meta = PROVIDER_META[props.provider];
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(!!props.connected);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Connecting (not currently connected) can run the real OAuth flow.
      if (!connected && props.onConnect) await props.onConnect();
      else await mockDelay(900);
      const next = !connected;
      setConnected(next);
      props.onToggle?.(next);
    } catch {
      // Keep prior state on failure.
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        backgroundColor: c.surfaceElevated,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
        {meta.icon(18, '#fff')}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyEmphasis">{props.label ?? meta.name}</Text>
        <Text variant="caption" color={connected ? 'success' : 'muted'}>{connected ? 'Connecté' : 'Non connecté'}</Text>
      </View>
      <Pressable onPress={toggle} disabled={busy}>
        {busy ? <ActivityIndicator color={c.accent} /> : <Text style={{ color: connected ? c.danger : c.accent, fontFamily: 'Inter_600SemiBold' }}>{connected ? 'Déconnecter' : 'Connecter'}</Text>}
      </Pressable>
    </View>
  );
}
