import { cva, type VariantProps } from 'class-variance-authority';

import { mergeClasses } from '@/shared/utils/merge-classes';

// Sizes and colors follow shadcn/ui "new-york" — the style mapcn.dev is built
// with — so buttons match the reference site one to one. `ng-icon` counts as
// the `svg` child shadcn tightens the padding for.
export const buttonVariants = cva(
  mergeClasses(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none',
    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
    'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    'group/button select-none [&_ng-icon]:flex [&_ng-icon]:items-center',
  ),
  {
    variants: {
      zType: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      zSize: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3 has-[>ng-icon]:px-3',
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 has-[>ng-icon]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5 has-[>ng-icon]:px-2.5',
        lg: 'h-10 px-6 has-[>svg]:px-4 has-[>ng-icon]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
      zShape: {
        default: 'rounded-md',
        circle: 'rounded-full',
        square: 'rounded-none',
      },
      zFull: {
        true: 'w-full',
      },
      zLoading: {
        true: 'pointer-events-none opacity-50',
      },
      zDisabled: {
        true: 'pointer-events-none opacity-50',
      },
    },
    defaultVariants: {
      zType: 'default',
      zSize: 'default',
      zShape: 'default',
    },
  },
);
export type ZardButtonShapeVariants = NonNullable<VariantProps<typeof buttonVariants>['zShape']>;
export type ZardButtonSizeVariants = NonNullable<VariantProps<typeof buttonVariants>['zSize']>;
export type ZardButtonTypeVariants = NonNullable<VariantProps<typeof buttonVariants>['zType']>;
