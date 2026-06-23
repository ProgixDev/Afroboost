import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiQuery, apiMutate } from './client';
import {
  mockNotifications,
  mockUsage,
  mockCustomers,
  mockPosts,
  mockConversations,
} from '@/mocks';
import type { Notification, Usage, Customer, Post, Conversation } from '@/types';

// ── Notifications ──────────────────────────────────────────────────────────

type RawNotification = Partial<Notification> & { created_at?: string };

/** Tolerant of backend (snake_case, created_at) and mock (camelCase, at) rows. */
function normalizeNotification(n: RawNotification): Notification {
  return {
    id: n.id as string,
    kind: (n.kind ?? 'post') as Notification['kind'],
    title: n.title ?? '',
    body: n.body ?? '',
    at: n.at ?? n.created_at ?? new Date().toISOString(),
    read: !!n.read,
  };
}

const NOTIFICATIONS_KEY = ['notifications'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: async () => {
      const rows = await apiQuery<RawNotification[]>('/api/notifications', mockNotifications);
      return rows.map(normalizeNotification);
    },
  });
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return data?.filter((n) => !n.read).length ?? 0;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiMutate(`/api/notifications/${id}/read`, { method: 'POST' }),
    // Optimistic so it works in demo mode (no backend) too.
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const prev = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY);
      qc.setQueryData<Notification[]>(NOTIFICATIONS_KEY, (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(NOTIFICATIONS_KEY, ctx.prev);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiMutate('/api/notifications/read-all', { method: 'POST' }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const prev = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY);
      qc.setQueryData<Notification[]>(NOTIFICATIONS_KEY, (old) =>
        old?.map((n) => ({ ...n, read: true })),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(NOTIFICATIONS_KEY, ctx.prev);
    },
  });
}

// ── Usage ────────────────────────────────────────────────────────────────

type RawUsage = Record<string, unknown>;

/** Tolerant of backend usage_records (snake) and mock Usage (nested) shapes. */
function normalizeUsage(u: RawUsage): Usage {
  const metric = (key: 'posts' | 'calls' | 'sms' | 'ai') => {
    const nested = u[key] as { used?: number; limit?: number } | undefined;
    if (nested && typeof nested === 'object') {
      return { used: nested.used ?? 0, limit: nested.limit ?? 0 };
    }
    return {
      used: Number(u[`${key}_used`] ?? 0),
      limit: Number(u[`${key}_limit`] ?? 0),
    };
  };
  return {
    posts: metric('posts'),
    calls: metric('calls'),
    sms: metric('sms'),
    ai: metric('ai'),
    periodStart: (u.periodStart as string) ?? (u.period_start as string) ?? '',
    periodEnd: (u.periodEnd as string) ?? (u.period_end as string) ?? '',
  };
}

export function useUsage() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const row = await apiQuery<RawUsage>('/api/usage', mockUsage as unknown as RawUsage);
      return normalizeUsage(row);
    },
  });
}

/** Metrics at/over a warning threshold (default 80%), for upgrade prompts. */
export function useUsageAlerts(threshold = 0.8) {
  const { data } = useUsage();
  return useMemo(() => {
    if (!data) return [] as { key: string; ratio: number }[];
    return (['posts', 'calls', 'sms', 'ai'] as const)
      .map((key) => {
        const m = data[key];
        const ratio = m.limit ? m.used / m.limit : 0;
        return { key, ratio };
      })
      .filter((m) => m.ratio >= threshold);
  }, [data, threshold]);
}

// ── Conversations ──────────────────────────────────────────────────────────

type RawConversation = Partial<Conversation> & {
  customer_name?: string;
  avatar_seed?: string;
  last_message?: string;
  last_timestamp?: string;
  customer_id?: string;
};

function normalizeConversation(r: RawConversation): Conversation {
  return {
    id: r.id as string,
    channel: r.channel as Conversation['channel'],
    customerName: r.customerName ?? r.customer_name ?? '',
    avatarSeed: r.avatarSeed ?? r.avatar_seed,
    unread: r.unread ?? 0,
    lastMessage: r.lastMessage ?? r.last_message ?? '',
    lastTimestamp: r.lastTimestamp ?? r.last_timestamp ?? '',
    messages: r.messages ?? [],
    customerId: r.customerId ?? r.customer_id,
  };
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const rows = await apiQuery<RawConversation[]>(
        '/api/inbox/conversations',
        mockConversations,
      );
      return rows.map(normalizeConversation);
    },
  });
}

// ── Customers ──────────────────────────────────────────────────────────────

type RawCustomer = Partial<Customer> & {
  last_contact_channel?: Customer['lastContactChannel'];
  last_contact_at?: string;
};

function normalizeCustomer(r: RawCustomer): Customer {
  return {
    id: r.id as string,
    name: r.name ?? '',
    phone: r.phone,
    email: r.email,
    address: r.address,
    source: (r.source ?? 'phone') as Customer['source'],
    tags: r.tags ?? [],
    lastContactChannel: r.lastContactChannel ?? r.last_contact_channel,
    lastContactAt: r.lastContactAt ?? r.last_contact_at,
    notes: r.notes,
    history: r.history,
  };
}

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const rows = await apiQuery<RawCustomer[]>('/api/customers', mockCustomers);
      return rows.map(normalizeCustomer);
    },
  });
}

// ── Global search ──────────────────────────────────────────────────────────

export type SearchResults = {
  customers: Customer[];
  posts: Post[];
  conversations: Conversation[];
};

function matches(haystack: (string | undefined)[], q: string) {
  const needle = q.trim().toLowerCase();
  return haystack.some((h) => h?.toLowerCase().includes(needle));
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ['search', query.trim().toLowerCase()],
    enabled: query.trim().length >= 2,
    queryFn: async (): Promise<SearchResults> => {
      const [customers, posts, conversations] = await Promise.all([
        apiQuery<Customer[]>('/api/customers', mockCustomers),
        apiQuery<Post[]>('/api/posts', mockPosts),
        apiQuery<Conversation[]>('/api/inbox/conversations', mockConversations),
      ]);
      return {
        customers: customers.filter((c) => matches([c.name, c.phone, c.email], query)),
        posts: posts.filter((p) => matches([p.caption], query)),
        conversations: conversations.filter((c) => matches([c.customerName, c.lastMessage], query)),
      };
    },
  });
}
