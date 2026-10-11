import { cva } from 'class-variance-authority';

import { mergeClasses } from '@/shared/utils/merge-classes';

export const cardVariants = cva('bg-card text-card-foreground flex flex-col gap-4 rounded-xl border py-4 shadow-sm');

export const cardHeaderVariants = cva(
  mergeClasses(
    '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-4',
    'has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-4',
  ),
);

export const cardActionVariants = cva('col-start-2 row-span-2 row-start-1 self-start justify-self-end');

export const cardBodyVariants = cva('px-4');

export const cardFooterVariants = cva('flex items-center px-4 [.border-t]:pt-4');
