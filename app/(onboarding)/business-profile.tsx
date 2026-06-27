import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Utensils, Wine, ShoppingCart, User, MapPin } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { Text, Button, Input, Stepper, RadioGroup, Pill, FloatingBack, Card } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { useTheme, radius } from '@/lib/theme';
import type { BusinessType, Tone, Language } from '@/types';

const TOTAL = 5;
const STEP_TITLES = ['Type', 'Nom & adresse', 'Heures', 'Services', 'Style'];

export default function BusinessProfile() {
  const { t } = useTranslation();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const updateBiz = useOnboardingStore((s) => s.updateBusiness);
  const draft = useOnboardingStore((s) => s.businessDraft);
  const registerOwner = useAuthStore((s) => s.registerOwner);
  const ownerName = useAuthStore((s) => s.user?.name ?? '');
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const next = async () => {
    if (step < TOTAL - 1) {
      setStep(step + 1);
      return;
    }
    // Final step: provision the owner + tenant on the backend before moving on.
    // Everything downstream (connect, content, CRM…) requires this row to exist.
    const businessName = (draft.name ?? '').trim();
    if (!businessName) {
      toast({ title: t('onboarding.businessProfile.nameRequired'), variant: 'danger' });
      setStep(1); // jump back to the name/address step
      return;
    }
    setSubmitting(true);
    try {
      await registerOwner({
        name: ownerName || businessName,
        businessName,
        type: draft.type,
      });
      router.push('/(onboarding)/connect-socials');
    } catch (e) {
      toast({
        title: (e as Error).message || t('onboarding.businessProfile.saveFailed'),
        variant: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };
  const prev = () => (step > 0 ? setStep(step - 1) : router.back());

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FloatingBack />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32, gap: 20 }}>
        <View style={{ alignItems: 'flex-start' }}>
          <Logo width={300} />
        </View>
        <View style={{ gap: 6 }}>
          <Text variant="overline" color="mutedFg">Étape {step + 1} sur {TOTAL} · {STEP_TITLES[step]}</Text>
          <Text variant="display" style={{ fontSize: 36 }}>{t('onboarding.businessProfile.title')}</Text>
        </View>
        <Stepper current={step} total={TOTAL} />

        <View style={{ minHeight: 360, marginTop: 4 }}>
          {step === 0 && <StepType value={draft.type} onChange={(v) => updateBiz({ type: v })} />}
          {step === 1 && (
            <View style={{ gap: 18 }}>
              <Input
                label={t('onboarding.businessProfile.nameLabel')}
                placeholder="Chez Patrick"
                value={draft.name ?? ''}
                onChangeText={(v) => updateBiz({ name: v })}
              />
              <Input
                label={t('onboarding.businessProfile.addressLabel')}
                placeholder="1234 rue Sainte-Catherine, Montréal"
                value={draft.address ?? ''}
                onChangeText={(v) => updateBiz({ address: v })}
              />
              <Button
                title={t('onboarding.businessProfile.browseMap')}
                variant="outline"
                leftIcon={<MapPin size={18} color={c.accent} />}
                pill={false}
                onPress={() => {
                  const q = (draft.address ?? '').trim();
                  const url = q
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
                    : 'https://www.google.com/maps';
                  Linking.openURL(url);
                }}
              />
              <Card padding={12}>
                <Text variant="overline" color="mutedFg" style={{ marginBottom: 6 }}>Suggestions</Text>
                {['1234 rue Sainte-Catherine, Montréal', '4500 boul. Saint-Laurent, Montréal', '777 ave du Parc, Montréal'].map((s) => (
                  <Pressable key={s} onPress={() => updateBiz({ address: s })} style={{ paddingVertical: 8 }}>
                    <Text>{s}</Text>
                  </Pressable>
                ))}
              </Card>
            </View>
          )}
          {step === 2 && <StepHours value={draft.hours} onChange={(h) => updateBiz({ hours: h })} />}
          {step === 3 && <StepServices value={draft.services ?? []} onChange={(svc) => updateBiz({ services: svc })} />}
          {step === 4 && (
            <StepTone
              tone={draft.tone}
              languages={draft.languages ?? ['fr']}
              onTone={(v) => updateBiz({ tone: v })}
              onLanguages={(v) => updateBiz({ languages: v })}
            />
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 'auto' }}>
          <Button title={t('common.previous')} variant="outline" onPress={prev} pill={false} />
          <View style={{ flex: 1 }}>
            <Button title={step === TOTAL - 1 ? t('common.continue') : t('common.next')} onPress={next} loading={submitting} fullWidth pill={false} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StepType({ value, onChange }: { value?: BusinessType; onChange: (v: BusinessType) => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const opts: { value: BusinessType; label: string; icon: React.ReactNode }[] = [
    { value: 'restaurant', label: t('onboarding.businessProfile.typeRestaurant'), icon: <Utensils size={26} color={c.accent} /> },
    { value: 'bar', label: t('onboarding.businessProfile.typeBar'), icon: <Wine size={26} color={c.accent} /> },
    { value: 'grocery', label: t('onboarding.businessProfile.typeGrocery'), icon: <ShoppingCart size={26} color={c.accent} /> },
    { value: 'solo', label: t('onboarding.businessProfile.typeSolo'), icon: <User size={26} color={c.accent} /> },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flexBasis: '47%',
              flexGrow: 1,
              padding: 18,
              borderRadius: radius.lg,
              borderWidth: 1.5,
              borderColor: active ? c.accent : c.border,
              backgroundColor: active ? c.surfaceHigh : c.surfaceElevated,
              alignItems: 'flex-start',
              gap: 12,
              minHeight: 120,
            }}
          >
            {o.icon}
            <Text variant="h2" style={{ fontSize: 20 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const DAYS: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven', sat: 'Sam', sun: 'Dim' };

function StepHours({
  value,
  onChange,
}: {
  value: Record<string, string> | undefined;
  onChange: (v: Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', string>) => void;
}) {
  const v = (value ?? {}) as Record<string, string>;
  const { c } = useTheme();
  return (
    <Card padding={4}>
      {DAYS.map((d, i) => (
        <View key={d} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: i < DAYS.length - 1 ? 1 : 0, borderColor: c.border }}>
          <View style={{ width: 56 }}>
            <Text variant="overline" color="mutedFg">{DAY_LABELS[d]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Input
              variant="filled"
              placeholder="11:00–22:00"
              value={v[d] ?? ''}
              onChangeText={(text) => onChange({ ...(value as any), [d]: text })}
            />
          </View>
        </View>
      ))}
    </Card>
  );
}

function StepServices({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft('');
  };
  return (
    <View style={{ gap: 14 }}>
      <Text color="muted">{t('onboarding.businessProfile.servicesLabel')}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input variant="filled" value={draft} onChangeText={setDraft} placeholder="Livraison" onSubmitEditing={add} />
        </View>
        <Button title="" leftIcon={<Plus size={18} color={c.primaryFg} />} onPress={add} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {value.map((s, i) => (
          <Pressable
            key={`${s}-${i}`}
            onPress={() => onChange(value.filter((_, j) => j !== i))}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: c.accent + '22',
              borderRadius: 999,
            }}
          >
            <Text style={{ color: c.accent, fontFamily: 'Inter_500Medium' }}>{s}</Text>
            <X size={14} color={c.accent} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function StepTone({
  tone,
  languages,
  onTone,
  onLanguages,
}: {
  tone?: Tone;
  languages: Language[];
  onTone: (v: Tone) => void;
  onLanguages: (v: Language[]) => void;
}) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const langs: { code: Language; label: string; soon?: boolean }[] = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'creole', label: 'Créole', soon: true },
    { code: 'lingala', label: 'Lingala', soon: true },
    { code: 'soussou', label: 'Soussou', soon: true },
  ];
  const toggleLang = (code: Language) =>
    onLanguages(languages.includes(code) ? languages.filter((l) => l !== code) : [...languages, code]);

  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 10 }}>
        <Text variant="overline" color="mutedFg">{t('onboarding.businessProfile.toneLabel')}</Text>
        <RadioGroup
          value={tone}
          onChange={onTone}
          options={[
            { value: 'warm', label: t('onboarding.businessProfile.toneWarm') },
            { value: 'pro', label: t('onboarding.businessProfile.tonePro') },
            { value: 'casual', label: t('onboarding.businessProfile.toneCasual') },
            { value: 'direct', label: t('onboarding.businessProfile.toneDirect') },
          ]}
        />
      </View>
      <View style={{ gap: 10 }}>
        <Text variant="overline" color="mutedFg">{t('onboarding.businessProfile.languagesLabel')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {langs.map((l) => {
            const active = languages.includes(l.code);
            return (
              <Pressable
                key={l.code}
                onPress={() => toggleLang(l.code)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? c.accent : c.border,
                  backgroundColor: active ? c.accent + '22' : c.surfaceElevated,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}
              >
                <Text style={{ color: active ? c.accent : c.foreground, fontFamily: 'Inter_500Medium' }}>{l.label}</Text>
                {l.soon ? <Pill tone="muted">à venir</Pill> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
