import React, { useEffect, useMemo } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/theme';
import { Text } from '@/components/ui/Text';
import { AIOrb } from './AIOrb';
import { useCelebrationStore } from '@/stores/celebrationStore';
import { haptic } from '@/lib/utils';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PIECES = 28;
const DURATION = 2600;

type PieceSpec = {
  startX: number;
  drift: number;
  size: number;
  delay: number;
  rotateTo: number;
  color: string;
  duration: number;
};

function ConfettiPiece({ spec }: { spec: PieceSpec }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      withTiming(1, { duration: spec.duration, easing: Easing.out(Easing.quad) }),
    );
  }, [progress, spec]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: spec.startX + spec.drift * progress.value },
      { translateY: -40 + (SCREEN_H * 0.85) * progress.value },
      { rotate: `${spec.rotateTo * progress.value}deg` },
    ],
    opacity: progress.value < 0.85 ? 1 : 1 - (progress.value - 0.85) / 0.15,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          width: spec.size,
          height: spec.size * 0.5,
          borderRadius: 2,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

/**
 * Root-mounted celebration overlay. Driven imperatively via `celebrate()` from
 * the celebration store. Auto-dismisses; tap to dismiss early.
 */
export function CelebrationOverlay() {
  const { c } = useTheme();
  const current = useCelebrationStore((s) => s.current);
  const dismiss = useCelebrationStore((s) => s.dismiss);

  const palette = useMemo(
    () => [c.accent, c.primary, c.deep, c.accentGradientFrom, c.info, c.success],
    [c],
  );

  const pieces = useMemo<PieceSpec[]>(() => {
    if (!current) return [];
    return Array.from({ length: PIECES }, (_, i) => ({
      startX: Math.random() * SCREEN_W,
      drift: (Math.random() - 0.5) * 160,
      size: 6 + Math.random() * 8,
      delay: Math.random() * 280,
      rotateTo: (Math.random() - 0.5) * 720,
      color: palette[i % palette.length],
      duration: DURATION * (0.7 + Math.random() * 0.4),
    }));
    // Regenerate per celebration instance.
  }, [current, palette]);

  useEffect(() => {
    if (!current) return;
    haptic('success');
    const t = setTimeout(dismiss, DURATION);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  if (!current) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(220)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: c.overlay,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <Pressable
        onPress={dismiss}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {pieces.map((spec, i) => (
        <ConfettiPiece key={i} spec={spec} />
      ))}
      <Animated.View entering={FadeInUp.springify().damping(16)} style={{ alignItems: 'center', gap: 16, paddingHorizontal: 40 }}>
        <AIOrb size={96} active />
        <View style={{ gap: 8, alignItems: 'center' }}>
          <Text variant="h1" center>{current.title}</Text>
          {current.message ? (
            <Text variant="body" color="muted" center>{current.message}</Text>
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
