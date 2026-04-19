import type { SubscriberDto } from '@sdarm/types';

export type SubscriberListItem = Pick<SubscriberDto, 'id' | 'email' | 'confirmedAt' | 'createdAt'>;
