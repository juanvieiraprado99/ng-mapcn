import { ZardCommandComponent } from '@/shared/components/command/command.component';
import { ZardCommandDividerComponent } from '@/shared/components/command/command-divider.component';
import { ZardCommandInputComponent } from '@/shared/components/command/command-input.component';
import { ZardCommandListComponent } from '@/shared/components/command/command-list.component';
import { ZardCommandOptionComponent } from '@/shared/components/command/command-option.component';
import { ZardCommandOptionGroupComponent } from '@/shared/components/command/command-option-group.component';

export const ZardCommandImports = [
  ZardCommandComponent,
  ZardCommandInputComponent,
  ZardCommandListComponent,
  ZardCommandOptionComponent,
  ZardCommandOptionGroupComponent,
  ZardCommandDividerComponent,
] as const;
