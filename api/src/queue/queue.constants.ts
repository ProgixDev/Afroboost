/** BullMQ queue names, shared by producers and processors. */
export const QUEUE = {
  GENERATION: 'generation',
  PUBLISH: 'publish',
  REVIEWS: 'reviews',
  EMAIL: 'email',
  REPORTS: 'reports',
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];
