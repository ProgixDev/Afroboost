import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiQuery, apiMutate } from './client';
import {
  mockNotifications,
  mockUsage,
  mockCustomers,
  mockPosts,
  mockConversations,
  mockCalls,
  mockReviews,
  mockReports,
  mockBusiness,
} from '@/mocks';
import type {
  Notification,
  Usage,
  Customer,
  Post,
  Conversation,
  Message,
  Call,
  Review,
  DecisionReport,
  Business,
  Provider,
  Plan,
  Tone,
} from '@/types';

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

type RawMessage = Partial<Message> & { author?: Message['from']; created_at?: string };

function normalizeMessage(m: RawMessage): Message {
  return {
    id: m.id as string,
    from: m.from ?? m.author ?? 'customer',
    text: m.text ?? '',
    timestamp: m.timestamp ?? m.created_at ?? new Date().toISOString(),
  };
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    enabled: !!id,
    queryFn: async () => {
      const mock = mockConversations.find((x) => x.id === id) ?? null;
      const raw = await apiQuery<(RawConversation & { messages?: RawMessage[] }) | null>(
        `/api/inbox/conversations/${id}`,
        mock,
      );
      if (!raw) return null;
      return {
        ...normalizeConversation(raw),
        messages: (raw.messages ?? []).map(normalizeMessage),
      } as Conversation;
    },
  });
}

/** Send a reply; optimistically appends a business message to the thread. */
export function useReplyMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      apiMutate(`/api/inbox/conversations/${id}/reply`, { method: 'POST', body: { text } }),
    onMutate: async (text: string) => {
      await qc.cancelQueries({ queryKey: ['conversation', id] });
      const prev = qc.getQueryData<Conversation | null>(['conversation', id]);
      const optimistic: Message = {
        id: `tmp_${(prev?.messages.length ?? 0)}_${text.length}`,
        from: 'business',
        text,
        timestamp: new Date().toISOString(),
      };
      qc.setQueryData<Conversation | null>(['conversation', id], (old) =>
        old ? { ...old, messages: [...old.messages, optimistic], lastMessage: text } : old,
      );
      return { prev };
    },
    onError: (_e, _t, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(['conversation', id], ctx.prev);
    },
    // No thread invalidation: keeps the optimistic message in demo mode; with a
    // live API the reply is persisted server-side and reconciles on next mount.
  });
}

// ── Calls ──────────────────────────────────────────────────────────────────

type RawCall = Partial<Call> & {
  duration_sec?: number;
  handled_by?: Call['handledBy'];
  created_at?: string;
};

function normalizeCall(r: RawCall): Call {
  return {
    id: r.id as string,
    caller: r.caller ?? '',
    number: r.number ?? '',
    durationSec: r.durationSec ?? r.duration_sec ?? 0,
    intent: r.intent ?? '',
    handledBy: r.handledBy ?? r.handled_by ?? 'ai',
    timestamp: r.timestamp ?? r.created_at ?? new Date().toISOString(),
    transcript: r.transcript ?? [],
  };
}

export function useCalls() {
  return useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const rows = await apiQuery<RawCall[]>('/api/inbox/calls', mockCalls);
      return rows.map(normalizeCall);
    },
  });
}

// ── Reviews ────────────────────────────────────────────────────────────────

type RawReview = Partial<Review> & { draft_reply?: string; created_at?: string };

function normalizeReview(r: RawReview): Review {
  return {
    id: r.id as string,
    author: r.author ?? '',
    rating: (r.rating ?? 5) as Review['rating'],
    snippet: r.snippet ?? '',
    draftReply: r.draftReply ?? r.draft_reply ?? '',
    status: (r.status ?? 'pending') as Review['status'],
    timestamp: r.timestamp ?? r.created_at ?? new Date().toISOString(),
  };
}

export function useReviews() {
  return useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const rows = await apiQuery<RawReview[]>('/api/reviews', mockReviews);
      return rows.map(normalizeReview);
    },
  });
}

export function useApproveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply?: string }) =>
      apiMutate(`/api/reviews/${id}/approve`, { method: 'POST', body: reply ? { reply } : {} }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

export function useRejectReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiMutate(`/api/reviews/${id}/reject`, { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
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

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    enabled: !!id,
    queryFn: async () => {
      const mock = mockCustomers.find((x) => x.id === id) ?? null;
      const raw = await apiQuery<RawCustomer | null>(`/api/customers/${id}`, mock);
      return raw ? normalizeCustomer(raw) : null;
    },
  });
}

export type CustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  source?: Customer['source'];
  tags?: string[];
  notes?: string;
};

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) =>
      apiMutate('/api/customers', { method: 'POST', body: input }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CustomerInput> }) =>
      apiMutate(`/api/customers/${id}`, { method: 'PATCH', body: patch }),
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', vars.id] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiMutate(`/api/customers/${id}`, { method: 'DELETE' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

// ── Posts ──────────────────────────────────────────────────────────────────

type RawPost = Partial<Post> & {
  media_url?: string;
  scheduled_at?: string;
  published_at?: string;
};

function normalizePost(r: RawPost): Post {
  return {
    id: r.id as string,
    caption: r.caption ?? '',
    imageUrl: r.imageUrl ?? r.media_url ?? '',
    channels: r.channels ?? [],
    status: (r.status ?? 'draft') as Post['status'],
    scheduledAt: r.scheduledAt ?? r.scheduled_at,
    publishedAt: r.publishedAt ?? r.published_at,
    engagement: r.engagement,
    template: r.template,
  };
}

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const rows = await apiQuery<RawPost[]>('/api/posts', mockPosts);
      return rows.map(normalizePost);
    },
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: ['post', id],
    enabled: !!id,
    queryFn: async () => {
      const mock = mockPosts.find((p) => p.id === id) ?? null;
      const raw = await apiQuery<RawPost | null>(`/api/posts/${id}`, mock);
      return raw ? normalizePost(raw) : null;
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiMutate(`/api/posts/${id}`, { method: 'DELETE' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function usePublishPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiMutate(`/api/posts/${id}/publish`, { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useSchedulePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      apiMutate(`/api/posts/${id}/schedule`, { method: 'POST', body: { scheduledAt } }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

// ── Reports ────────────────────────────────────────────────────────────────

type RawReport = Partial<DecisionReport> & { week_start?: string; week_end?: string };

function normalizeReport(r: RawReport): DecisionReport {
  return {
    id: r.id as string,
    weekStart: r.weekStart ?? r.week_start ?? '',
    weekEnd: r.weekEnd ?? r.week_end ?? '',
    trend: r.trend ?? { summary: '', series: [] },
    wins: r.wins ?? [],
    issues: r.issues ?? [],
    actions: r.actions ?? [],
  };
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const rows = await apiQuery<RawReport[]>('/api/reports', mockReports);
      return rows.map(normalizeReport);
    },
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiMutate('/api/reports/generate', { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
}

// ── Profile (business settings + connected accounts) ────────────────────────

export type ProfileData = {
  name: string;
  address: string;
  tone: Tone;
  services: string[];
  languages: Business['languages'];
  plan: Plan;
  connectedAccounts: Partial<Record<Provider, boolean>>;
};

function normalizeProfile(r: Record<string, unknown>): ProfileData {
  return {
    name: (r.name as string) ?? '',
    address: (r.address as string) ?? '',
    tone: (r.tone as Tone) ?? 'warm',
    services: (r.services as string[]) ?? [],
    languages: (r.languages as Business['languages']) ?? ['fr'],
    plan: (r.plan as Plan) ?? 'decouverte',
    connectedAccounts:
      (r.connectedAccounts as Partial<Record<Provider, boolean>>) ??
      (r.connected_accounts as Partial<Record<Provider, boolean>>) ??
      {},
  };
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const raw = await apiQuery<Record<string, unknown>>(
        '/api/profile',
        mockBusiness as unknown as Record<string, unknown>,
      );
      return normalizeProfile(raw);
    },
  });
}

export type ProfilePatch = Partial<Pick<ProfileData, 'name' | 'address' | 'tone' | 'services'>>;

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) =>
      apiMutate('/api/profile', { method: 'PATCH', body: patch }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

// ── Subscription ───────────────────────────────────────────────────────────

export type InvoiceVM = { id: string; date: string; amount: string; status: string };

const MOCK_SUBSCRIPTION = {
  subscription: { plan: mockBusiness.plan, status: 'active', current_period_end: mockBusiness.trialEndsAt },
  invoices: [
    { id: 'in1', issued_at: '2026-04-15', amount: 97, status: 'paid' },
    { id: 'in2', issued_at: '2026-03-15', amount: 97, status: 'paid' },
    { id: 'in3', issued_at: '2026-02-15', amount: 97, status: 'paid' },
  ],
};

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const raw = await apiQuery<{
        subscription: Record<string, unknown> | null;
        invoices: Record<string, unknown>[];
      }>('/api/billing/subscription', MOCK_SUBSCRIPTION);
      const invoices: InvoiceVM[] = (raw.invoices ?? []).map((inv) => ({
        id: (inv.id as string) ?? '',
        date: ((inv.issued_at as string) ?? (inv.date as string) ?? '').slice(0, 10),
        amount: typeof inv.amount === 'number' ? `${inv.amount} $` : ((inv.amount as string) ?? ''),
        status: (inv.status as string) ?? '',
      }));
      return { subscription: raw.subscription, invoices };
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
