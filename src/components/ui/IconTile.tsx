import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme, radius, ColorToken } from '@/lib/theme';

export type IconTileTone =
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'deep';

export type IconTileSize = 'sm' | 'md' | 'lg';

const DIMENSIONS: Record<IconTileSize, { box: number; icon: number; r: number }> = {
  sm: { box: 32, icon: 16, r: radius.sm },
  md: { box: 40, icon: 20, r: radius.DEFAULT },
  lg: { box: 48, icon: 24, r: radius.md },
};

export type IconTileProps = {
  icon: LucideIcon;
  tone?: IconTileTone;
  size?: IconTileSize;
  /** Filled accent gradient (for hero/primary actions). */
  gradient?: boolean;
  /** Use the very soft tonal background instead of the default 10% wash. */
  soft?: boolean;
  style?: ViewStyle;
};

/**
 * The premium icon unit: a lucide glyph inside a rounded, tonally-tinted tile.
 * Standardizes stroke weight, sizing, and color treatment across the app so
 * settings rows, activity feeds, empty states, and notifications feel cohesive.
 */
export function IconTile({
  icon: Icon,
  tone = 'primary',
  size = 'md',
  gradient,
  soft,
  style,
}: IconTileProps) {
  const { c } = useTheme();
  const { box, icon, r } = DIMENSIONS[size];
  const toneColor = c[tone as ColorToken];

  const base: ViewStyle = {
    width: box,
    height: box,
    borderRadius: r,
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (gradient) {
    return (
      <LinearGradient
        colors={[c.accentGradientFrom, c.accent, c.accentGradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[base, style]}
      >
        <Icon size={icon} color={c.accentFg} strokeWidth={1.75} />
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        base,
        {
          backgroundColor: toneColor + (soft ? '14' : '1F'),
          borderWidth: 1,
          borderColor: toneColor + '2E',
        },
        style,
      ]}
    >
      <Icon size={icon} color={toneColor} strokeWidth={1.75} />
    </View>
  );
}
