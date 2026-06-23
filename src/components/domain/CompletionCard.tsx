import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Store,
  Share2,
  Star,
  PhoneCall,
  ChevronRight,
  Check,
  type LucideIcon,
} from 'lucide-react-native';
import { Text, Card, ProgressBar, IconTile, type IconTileTone } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { haptic } from '@/lib/utils';

type Step = {
  key: string;
  label: string;
  done: boolean;
  href: string;
  icon: LucideIcon;
  tone: IconTileTone;
};

/**
 * Home profile-completeness nudge. Computes progress from the onboarding draft +
 * connected accounts and links each gap to the screen that resolves it. Hides
 * itself once everything is complete.
 */
export function CompletionCard() {
  const { c } = useTheme();
  const router = useRouter();
  const business = useOnboardingStore((s) => s.businessDraft);
  const accounts = useOnboardingStore((s) => s.connectedAccounts);

  const steps = useMemo<Step[]>(
    () => [
      {
        key: 'business',
        label: 'Profil du commerce',
        done: !!business.name,
        href: '/settings/business',
        icon: Store,
        tone: 'primary',
      },
      {
        key: 'socials',
        label: 'Réseaux sociaux',
        done: !!(accounts.facebook || accounts.instagram),
        href: '/settings/accounts',
        icon: Share2,
        tone: 'info',
      },
      {
        key: 'google',
        label: 'Avis Google',
        done: !!accounts.google,
        href: '/settings/accounts',
        icon: Star,
        tone: 'accent',
      },
      {
        key: 'agent',
        label: 'Agent IA téléphonique',
        done: !!accounts.twilio,
        href: '/settings/agent-config',
        icon: PhoneCall,
        tone: 'deep',
      },
    ],
    [business, accounts],
  );

  const doneCount = steps.filter((s) => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);
  if (percent === 100) return null;

  const next = steps.find((s) => !s.done);

  return (
    <Card highlight padding={16}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="overline" color="mutedFg">Complétez votre profil</Text>
        <Text variant="bodyEmphasis" style={{ color: c.accent }}>{percent}%</Text>
      </View>
      <View style={{ marginTop: 10, marginBottom: 14 }}>
        <ProgressBar value={doneCount / steps.length} />
      </View>
      <View style={{ gap: 8 }}>
        {steps.map((s) => (
          <Pressable
            key={s.key}
            disabled={s.done}
            onPress={() => {
              haptic('select');
              router.push(s.href as never);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: s.done ? 0.55 : 1 }}
          >
            <IconTile icon={s.done ? Check : s.icon} tone={s.done ? 'success' : s.tone} size="sm" soft />
            <Text variant="body" style={{ flex: 1 }}>{s.label}</Text>
            {s.done ? (
              <Text variant="caption" color="success">Fait</Text>
            ) : (
              <ChevronRight size={18} color={c.muted} />
            )}
          </Pressable>
        ))}
      </View>
      {next ? (
        <Text variant="caption" color="muted" style={{ marginTop: 12 }}>
          Prochaine étape : {next.label}
        </Text>
      ) : null}
    </Card>
  );
}
