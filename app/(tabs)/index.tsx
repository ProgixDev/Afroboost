import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowUpRight, Phone, Star, FileText, UserPlus, MessageSquare, Bell, Search } from 'lucide-react-native';
import { Text, Card, Avatar, Divider, SectionHeader } from '@/components/ui';
import { GlowCard } from '@/components/brand/GlowCard';
import { KpiTile } from '@/components/brand/KpiTile';
import { AIOrb } from '@/components/brand/AIOrb';
import { UsageBar } from '@/components/domain/UsageBar';
import { CompletionCard } from '@/components/domain/CompletionCard';
import { useTheme, radius } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUsage, useUnreadCount, useReports } from '@/lib/api';
import { mockBusiness, mockUsage } from '@/mocks';
import { formatRelative, haptic } from '@/lib/utils';

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const lng = useSettingsStore((s) => s.language);
  const firstName = (user?.name || 'Patrick').split(/[.\s]/)[0]!;
  const { data: reports } = useReports();
  const report = reports?.[0];
  const { data: usageData } = useUsage();
  const usage = usageData ?? mockUsage;
  const unread = useUnreadCount();

  const iconBtn = {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: c.surfaceHigh,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const activity = [
    { icon: <FileText size={16} color={c.primary} />, title: 'Publication envoyée', sub: 'Promo griot · vendredi', at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), ai: false, href: '/(tabs)/content' },
    { icon: <Phone size={16} color={c.primary} />, title: 'Appel géré', sub: 'Réservation 4p · 19 h 15', at: new Date(Date.now() - 1000 * 60 * 90).toISOString(), ai: true, href: '/(tabs)/inbox/calls' },
    { icon: <Star size={16} color={c.accent} />, title: 'Nouvel avis 5 étoiles', sub: 'Marie-Lourdes Joseph', at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), ai: true, href: '/(tabs)/inbox/reviews' },
    { icon: <UserPlus size={16} color={c.info} />, title: 'Nouveau client', sub: 'Aminata Diallo', at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), ai: false, href: '/(tabs)/crm' },
    { icon: <MessageSquare size={16} color={c.deep} />, title: 'Réponse WhatsApp', sub: 'Suivi commande #2032', at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), ai: true, href: '/(tabs)/inbox' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120, paddingHorizontal: 20, gap: 24 }}
    >
      {/* Hero */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text variant="overline" style={{ color: c.accent }}>{mockBusiness.name}</Text>
          <Text variant="displayLg" style={{ marginTop: 4 }}>Bonjour,</Text>
          <Text variant="displayLg" style={{ marginTop: -8, color: c.accent }}>{firstName}.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <View style={{ width: 18, height: 2, borderRadius: 2, backgroundColor: c.accent }} />
            <View style={{ width: 6, height: 2, borderRadius: 2, backgroundColor: c.accentMuted }} />
            <Text color="muted">Voici votre semaine.</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => { haptic('select'); router.push('/(modals)/search'); }}
              style={iconBtn}
              hitSlop={6}
            >
              <Search size={20} color={c.foreground} strokeWidth={1.75} />
            </Pressable>
            <Pressable
              onPress={() => { haptic('select'); router.push('/(tabs)/notifications'); }}
              style={iconBtn}
              hitSlop={6}
            >
              <Bell size={20} color={c.foreground} strokeWidth={1.75} />
              {unread > 0 ? (
                <View
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
                    backgroundColor: c.danger,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: c.background,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' }}>
                    {unread > 9 ? '9+' : unread}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          <Pressable onPress={() => router.push('/settings')}>
            <Avatar name={user?.name || 'Patrick'} size="lg" ring />
          </Pressable>
        </View>
      </View>

      {/* Profile completeness */}
      <CompletionCard />

      {/* Today insight */}
      <Animated.View entering={FadeInDown.delay(120).springify()}>
        <GlowCard tone="emerald">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AIOrb size={22} />
            <Text variant="overline" color="muted">Insight du jour</Text>
          </View>
          <Text variant="serifItalic" style={{ fontSize: 22, lineHeight: 30 }}>
            "{report?.trend.summary ?? 'Votre activité de la semaine apparaîtra ici.'}"
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/assistant')}
            style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text style={{ color: c.accent, fontFamily: 'Inter_600SemiBold' }}>Voir le rapport complet</Text>
            <ArrowUpRight size={16} color={c.accent} />
          </Pressable>
        </GlowCard>
      </Animated.View>

      {/* KPI grid 2x2 */}
      <View>
        <SectionHeader overline="Cette semaine" title="Vos chiffres" />
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <KpiTile label="Revenus" value={24580} prefix="$" delta={18.4} series={[12, 18, 14, 22, 31, 28, 19]} delay={0} />
            <KpiTile label="Appels gérés" value={47} delta={12} series={[3, 5, 4, 8, 9, 11, 7]} delay={80} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <KpiTile label="Publications" value={usage.posts.used} delta={-1.2} series={[1, 2, 1, 2, 0, 1, 1]} delay={160} tone="accent" />
            <KpiTile label="Nouveaux clients" value={5} delta={40} series={[0, 1, 0, 2, 1, 0, 1]} delay={240} tone="accent" />
          </View>
        </View>
      </View>

      {/* Activity */}
      <View>
        <SectionHeader overline="Activité" title="Récente" action="Tout voir" onAction={() => router.push('/(tabs)/inbox')} />
        <Card padding={0}>
          {activity.map((a, i) => (
            <View key={i}>
              <Pressable onPress={() => router.push(a.href as any)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                  <View
                    style={{
                      width: 36, height: 36, borderRadius: 999,
                      backgroundColor: c.surfaceHigh,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {a.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {a.ai ? <AIOrb size={8} active={false} /> : null}
                      <Text variant="bodyEmphasis">{a.title}</Text>
                    </View>
                    <Text variant="caption" color="muted">{a.sub}</Text>
                  </View>
                  <Text variant="mono" color="muted" style={{ fontSize: 11 }}>{formatRelative(a.at, lng)}</Text>
                </View>
              </Pressable>
              {i < activity.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Card>
      </View>

      {/* Usage compact */}
      <View>
        <SectionHeader overline="Forfait" title="Utilisation" action="Détails" onAction={() => router.push('/settings/usage')} />
        <Card>
          <View style={{ gap: 14 }}>
            <UsageBar label="Publications" used={usage.posts.used} limit={usage.posts.limit} onUpgrade={() => router.push('/settings/upgrade')} />
            <UsageBar label="Appels gérés" used={usage.calls.used} limit={usage.calls.limit} onUpgrade={() => router.push('/settings/upgrade')} />
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
