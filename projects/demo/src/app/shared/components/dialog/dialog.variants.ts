import { cva, type VariantProps } from 'class-variance-authority';

// shadcn/ui new-york DialogContent / DialogOverlay.
export const dialogVariants = cva([
  'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4',
  'rounded-lg border bg-background p-6 shadow-lg outline-none',
  'sm:max-w-lg',
]);

/** Classes of the mask behind a dialog, shared by the declarative form and the service. */
export const DIALOG_BACKDROP_CLASSES = ['bg-black/50'];

export const dialogHeaderVariants = cva('flex flex-col gap-2');

export const dialogTitleVariants = cva('text-base leading-none font-medium wrap-anywhere');

export const dialogDescriptionVariants = cva(
  'text-sm text-muted-foreground wrap-anywhere *:[a]:underline *:[a]:underline-offset-[3px] *:[a]:hover:text-foreground',
);

export const dialogFooterVariants = cva(
  '-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end',
);

export type ZardDialogVariants = VariantProps<typeof dialogVariants>;
