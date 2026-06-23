import React from 'react';
import { Pressable, ActivityIndicator, View, StyleSheet, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { useTheme, radius } from '@/lib/theme';
import { haptic } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'gold';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  title?: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  pill?: boolean;
  children?: React.ReactNode;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth,
  pill = true,
  onPressIn,
  onPressOut,
  children,
  style,
  ...rest
}: ButtonProps) {
  const { c } = useTheme();
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const heights = { sm: 36, md: 48, lg: 56 };
  const paddingsX = { sm: 14, md: 22, lg: 28 };
  const fontSizes = { sm: 13, md: 15, lg: 16 };

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, fg: c.primaryFg },
    secondary: { bg: c.accent, fg: c.accentFg },
    outline: { bg: 'transparent', fg: c.foreground, border: c.borderStrong },
    ghost: { bg: 'transparent', fg: c.foreground },
    destructive: { bg: c.danger, fg: '#fff' },
    gold: { bg: c.accent, fg: c.accentFg },
  };
  const p = palette[variant];
  const isGold = variant === 'gold';

  const inner = loading ? (
    <ActivityIndicator color={p.fg} />
  ) : (
    <View style={styles.row}>
      {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
      {title ? (
        <Text style={{ color: p.fg, fontSize: fontSizes[size], fontFamily: 'Inter_600SemiBold', letterSpacing: 0.1 }}>
          {title}
        </Text>
      ) : (
        children
      )}
      {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
    </View>
  );

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, aStyle]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || loading}
        onPressIn={(e) => {
          if (!disabled && !loading) haptic('light');
          scale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
          onPressOut?.(e);
        }}
        style={[
          {
            height: heights[size],
            paddingHorizontal: paddingsX[size],
            backgroundColor: isGold ? 'transparent' : p.bg,
            borderColor: p.border ?? 'transparent',
            borderWidth: p.border ? 1 : 0,
            borderRadius: pill ? radius.full : radius.md,
            opacity: disabled || loading ? 0.55 : 1,
            overflow: 'hidden',
          },
          styles.btn,
          style as any,
        ]}
        {...rest}
      >
        {isGold ? (
          <>
            <LinearGradient
              colors={[c.accentGradientFrom, c.accent, c.accentGradientTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {inner}
          </>
        ) : (
          inner
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { alignItems: 'center', justifyContent: 'center' },
  fullWidth: { alignSelf: 'stretch' },
});
