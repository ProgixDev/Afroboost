import React, { useState } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Inbox, MessagesSquare, Users, Sparkles, UserPlus, FileText } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/components/ui/Sheet';
import { AIOrb } from './AIOrb';
import { useTheme, radius } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { haptic } from '@/lib/utils';

const TABS = [
  { key: 'home', href: '/(tabs)', icon: Home, labelKey: 'tabs.home' },
  { key: 'inbox', href: '/(tabs)/inbox', icon: Inbox, labelKey: 'tabs.inbox' },
  { key: 'fab', href: '__fab__', icon: null, labelKey: '' },
  { key: 'assistant', href: '/(tabs)/assistant', icon: MessagesSquare, labelKey: 'tabs.assistant' },
  { key: 'crm', href: '/(tabs)/crm', icon: Users, labelKey: 'tabs.crm' },
] as const;

export function NavBarFab() {
  const { c, name } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  // Hide on non-tab routes
  const inTabs =
    path === '/' ||
    path.startsWith('/(tabs)') ||
    ['/inbox', '/assistant', '/crm'].some((p) => path === p || path.startsWith(p + '/'));
  if (!inTabs) return null;

  const isActive = (href: string) => {
    if (href === '/(tabs)') return path === '/' || path === '/(tabs)' || path === '/index';
    const seg = href.split('/').pop()!;
    return path.includes(`/${seg}`);
  };

  const Wrap: any = Platform.OS === 'ios' ? BlurView : View;
  const wrapProps = Platform.OS === 'ios' ? { intensity: 60, tint: name === 'dark' ? 'dark' : 'light' } : {};

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom + 12,
          alignItems: 'center',
        }}
      >
        <Wrap
          {...wrapProps}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            backgroundColor: Platform.OS === 'ios' ? c.surfaceHigh + 'BB' : c.surfaceHigh,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: c.borderStrong,
            paddingHorizontal: 8,
            paddingVertical: 8,
            width: '100%',
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
            overflow: 'hidden',
          }}
        >
          {TABS.map((tab) => {
            if (tab.key === 'fab') {
              return (
                <Pressable
                  key="fab"
                  onPress={() => setOpen(true)}
                  style={{
                    width: 56,
                    height: 56,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginHorizontal: 4,
                  }}
                >
                  <AIOrb size={42} active />
                </Pressable>
              );
            }
            const Icon = tab.icon!;
            const active = isActive(tab.href);
            return (
              <Pressable
                key={tab.key}
                onPress={() => { if (!active) haptic('select'); router.push(tab.href as any); }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 6, gap: 2 }}
              >
                <Icon size={20} color={active ? c.accent : c.muted} strokeWidth={active ? 2.2 : 1.8} />
                <Text
                  variant="caption"
                  style={{ color: active ? c.accent : c.muted, fontFamily: active ? 'InstrumentSerif_400Regular_Italic' : 'Inter_500Medium', fontSize: 11 }}
                >
                  {t(tab.labelKey)}
                </Text>
                {active ? (
                  <View style={{ position: 'absolute', top: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent }} />
                ) : null}
              </Pressable>
            );
          })}
        </Wrap>
      </View>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <View style={{ alignItems: 'center', marginBottom: 16, gap: 8 }}>
          <AIOrb size={48} />
          <Text variant="h2">Que voulez-vous créer ?</Text>
        </View>
        <View style={{ gap: 10 }}>
          <FabAction
            icon={<Sparkles size={20} color={c.accent} />}
            title="Générer une publication"
            sub="Rédigez et programmez avec l’IA"
            onPress={() => {
              setOpen(false);
              router.push('/(tabs)/content/generate');
            }}
          />
          <FabAction
            icon={<UserPlus size={20} color={c.primary} />}
            title="Ajouter un client"
            sub="Nouveau contact dans votre CRM"
            onPress={() => {
              setOpen(false);
              router.push('/(tabs)/crm/add');
            }}
          />
          <FabAction
            icon={<MessagesSquare size={20} color={c.deep} />}
            title="Demander à l’assistant"
            sub="Insights et recommandations"
            onPress={() => {
              setOpen(false);
              router.push('/(tabs)/assistant');
            }}
          />
        </View>
        <Pressable
          onPress={() => {
            setOpen(false);
            router.push('/(tabs)/content');
          }}
          style={{ marginTop: 18, alignItems: 'center', paddingVertical: 8 }}
        >
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <FileText size={14} color={c.muted} />
            <Text color="muted">Voir toutes les publications</Text>
          </View>
        </Pressable>
      </Sheet>
    </>
  );
}

function FabAction({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        backgroundColor: c.surfaceElevated,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyEmphasis">{title}</Text>
        <Text variant="caption" color="muted">{sub}</Text>
      </View>
    </Pressable>
  );
}
