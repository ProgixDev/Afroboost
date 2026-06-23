import React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { IconTileTone } from './IconTile';

/** The subset of a React Query result QueryBoundary needs. */
export type QueryLike<T> = {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  refetch?: () => unknown;
};

export type EmptyConfig = {
  icon?: LucideIcon;
  tone?: IconTileTone;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
};

export type QueryBoundaryProps<T> = {
  query: QueryLike<T>;
  /** Decide emptiness (defaults to length===0 for arrays). */
  isEmpty?: (data: T) => boolean;
  empty?: EmptyConfig;
  errorTitle?: string;
  loading?: React.ReactNode;
  children: (data: T) => React.ReactNode;
};

function defaultIsEmpty(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;
  return data == null;
}

function DefaultLoading() {
  return (
    <View style={{ gap: 12, padding: 4 }}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={72} style={{ borderRadius: 18 }} />
      ))}
    </View>
  );
}

/**
 * Renders loading / error / empty / content states for a React Query result in
 * one place, so every list in the app gets consistent premium states.
 */
export function QueryBoundary<T>({
  query,
  isEmpty = defaultIsEmpty,
  empty,
  errorTitle,
  loading,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isLoading && query.data === undefined) {
    return <>{loading ?? <DefaultLoading />}</>;
  }
  if (query.isError && query.data === undefined) {
    return (
      <ErrorState
        title={errorTitle}
        onRetry={query.refetch ? () => query.refetch?.() : undefined}
      />
    );
  }
  const data = query.data as T;
  if (empty && isEmpty(data)) {
    return <EmptyState {...empty} />;
  }
  return <>{children(data)}</>;
}
