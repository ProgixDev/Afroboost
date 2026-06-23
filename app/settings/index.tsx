import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User, Building2, Plug, Bot, CreditCard, BarChart3, Languages, Bell, HelpCircle, LogOut, ChevronRight,
} from 'lucide-react-native';
import { Text, Card, Switch, BlurHeader } from '@/components/ui';
import { AIOrb } from '@/components/brand/AIOrb';
import { useTheme, radius } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';

export default function SettingsIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);
  const banner = useSettingsStore((s) => s.demoBanner);
  const setBanner = useSettingsStore((s) => s.setDemoBanner);

  const items: { icon: React.ReactNode; label: string; sub: string; href: string }[] = [
    { icon: <User size={18} color={c.accent} />, label: t('settings.profile'), sub: 'Nom, photo, mot de passe', href: '/settings/profile' },
    { icon: <Building2 size={18} color={c.accent} />, label: t('settings.business'), sub: 'Nom, adresse, services', href: '/settings/business' },
    { icon: <Plug size={18} color={c.accent} />, label: t('settings.accounts'), sub: 'Réseaux, calendrier, paiements', href: '/settings/accounts' },
    { icon: <Bot size={18} color={c.accent} />, label: t('settings.agent'), sub: "Voix, mots-clés, heures d'activité", href: '/settings/agent-config' },
    { icon: <CreditCard size={18} color={c.accent} />, label: t('settings.subscription'), sub: 'Forfait et factures', href: '/settings/subscription' },
    { icon: <BarChart3 size={18} color={c.accent} />, label: t('settings.usage'), sub: 'Publications, appels, IA', href: '/settings/usage' },
    { icon: <Languages size={18} color={c.accent} />, label: t('settings.language'), sub: 'Français, English', href: '/settings/language' },
    { icon: <Bell size={18} color={c.accent} />, label: t('settings.notifications'), sub: 'Alertes par catégorie', href: '/settings/notifications' },
    { icon: <HelpCircle size={18} color={c.accent} />, label: t('settings.help'), sub: 'FAQ, contact', href: '/settings/help' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BlurHeader back title={t('settings.title')} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 32 }}>
        <Card padding={0}>
          {items.map((it, i) => (
            <Pressable
              key={it.href}
              onPress={() => router.push(it.href as any)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16,
                borderBottomWidth: i < items.length - 1 ? 1 : 0,
                borderColor: c.border,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
                {it.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyEmphasis">{it.label}</Text>
                <Text variant="caption" color="muted">{it.sub}</Text>
              </View>
              <ChevronRight size={16} color={c.muted} />
            </Pressable>
          ))}
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyEmphasis">Bannière mode démo</Text>
              <Text variant="caption" color="muted">Affiche « Mode démo » en haut de l’écran</Text>
            </View>
            <Switch value={banner} onValueChange={setBanner} />
          </View>
        </Card>

        <Pressable
          onPress={() => {
            signOut();
            router.replace('/(auth)/welcome');
          }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            padding: 16,
            backgroundColor: c.surfaceElevated,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.danger + '55',
          }}
        >
          <LogOut size={18} color={c.danger} />
          <Text variant="bodyEmphasis" style={{ color: c.danger, flex: 1 }}>{t('settings.signOut')}</Text>
        </Pressable>

        <View style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
          <AIOrb size={28} />
          <Text variant="caption" color="mutedFg">AfroBoost · v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}
