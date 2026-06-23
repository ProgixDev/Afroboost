import React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { IconTile, IconTileTone } from './IconTile';

export function EmptyState({
  icon,
  tone = 'muted',
  title,
  description,
  ctaLabel,
  onCta,
}: {
  icon?: LucideIcon;
  tone?: IconTileTone;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
      {icon ? <IconTile icon={icon} tone={tone} size="lg" soft /> : null}
      <Text variant="h3" center>{title}</Text>
      {description ? <Text variant="body" color="muted" center>{description}</Text> : null}
      {ctaLabel && onCta ? <Button title={ctaLabel} onPress={onCta} /> : null}
    </View>
  );
}
