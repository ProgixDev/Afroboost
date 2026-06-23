import React from 'react';
import { View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { IconTile } from './IconTile';

export function ErrorState({
  title = 'Une erreur est survenue',
  description,
  retryLabel = 'Réessayer',
  onRetry,
}: {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
      <IconTile icon={TriangleAlert} tone="danger" size="lg" soft />
      <Text variant="h3" center>{title}</Text>
      {description ? <Text variant="body" color="muted" center>{description}</Text> : null}
      {onRetry ? <Button title={retryLabel} variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}
