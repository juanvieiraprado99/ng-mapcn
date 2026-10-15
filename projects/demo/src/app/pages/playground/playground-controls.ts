import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ZardCheckboxComponent } from '@/shared/components/checkbox';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardSelectImports } from '@/shared/components/select/select.imports';
import { ZardSliderComponent } from '@/shared/components/slider/slider.component';

import type { Control, Values } from './playground-schema';

export interface ControlChange {
  key: string;
  value: unknown;
}

/** The zard slider works on 0-100: a range control maps its own min/max/step onto that scale. */
export function toSlider(value: number, min: number, max: number): number {
  return max === min ? 0 : ((value - min) / (max - min)) * 100;
}

export function fromSlider(percent: number, min: number, max: number, step: number): number {
  const raw = min + (percent / 100) * (max - min);
  const snapped = min + Math.round((raw - min) / step) * step;
  const decimals = (String(step).split('.')[1] ?? '').length;
  return +Math.min(max, Math.max(min, snapped)).toFixed(decimals);
}

/**
 * Renders a `Control[]` schema as form fields: zard ui checkbox, slider, select and input, a
 * native color input and a JSON textarea. Every field is labelled and keyboard operable.
 */
@Component({
  selector: 'app-playground-controls',
  standalone: true,
  imports: [
    FormsModule,
    ZardCheckboxComponent,
    ZardInputComponent,
    ZardSelectImports,
    ZardSliderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="grid gap-4">
      @for (control of controls(); track control.key) {
        @let id = idPrefix() + '-' + control.key;
        @let value = values()[control.key];
        <div class="grid gap-1.5">
          @switch (control.kind) {
            @case ('boolean') {
              <z-checkbox
                [zId]="id"
                [zDescribedBy]="describedBy(control, id) ?? ''"
                [ngModel]="value === true"
                (checkChange)="emit(control.key, $event)"
              >
                {{ control.label }}
              </z-checkbox>
            }
            @case ('range') {
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium" [id]="id + '-label'">{{ control.label }}</span>
                <output class="text-muted-foreground font-mono text-xs" [attr.for]="id">{{
                  value
                }}</output>
              </div>
              <z-slider
                [id]="id"
                [zAriaLabel]="control.label"
                [zValueText]="[String(value)]"
                [attr.aria-describedby]="describedBy(control, id)"
                [zStep]="(control.step / (control.max - control.min)) * 100"
                [ngModel]="[toPercent(control, value)]"
                (ngModelChange)="emitRange(control, $event[0])"
              />
            }
            @case ('select') {
              <span class="text-sm font-medium" [id]="id + '-label'">{{ control.label }}</span>
              <z-select
                [id]="id"
                [attr.aria-describedby]="describedBy(control, id)"
                [zValue]="'' + optionIndex(control, value)"
                (zSelectionChange)="emit(control.key, control.options[+$any($event)].value)"
              >
                @for (option of control.options; track $index) {
                  <z-select-item [zValue]="'' + $index">{{ option.label }}</z-select-item>
                }
              </z-select>
            }
            @case ('color') {
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium" [attr.for]="id">{{ control.label }}</label>
                <output class="text-muted-foreground font-mono text-xs" [attr.for]="id">{{
                  value
                }}</output>
              </div>
              <input
                type="color"
                [id]="id"
                [attr.aria-describedby]="describedBy(control, id)"
                class="border-input h-9 w-full cursor-pointer rounded-md border p-1"
                [value]="value"
                (input)="emit(control.key, $any($event.target).value)"
              />
            }
            @case ('text') {
              <label class="text-sm font-medium" [attr.for]="id">{{ control.label }}</label>
              <input
                z-input
                type="text"
                [id]="id"
                [attr.aria-describedby]="describedBy(control, id)"
                [value]="$any(value)"
                (input)="emit(control.key, $any($event.target).value)"
              />
            }
            @case ('json') {
              <label class="text-sm font-medium" [attr.for]="id">{{ control.label }} (JSON)</label>
              <textarea
                [id]="id"
                rows="2"
                spellcheck="false"
                class="border-input bg-background text-foreground focus-visible:ring-ring/50 w-full rounded-md border px-2 py-1.5 font-mono text-xs shadow-xs outline-none focus-visible:ring-[3px]"
                [attr.aria-invalid]="errors()[control.key] ? 'true' : null"
                [attr.aria-describedby]="describedBy(control, id)"
                [value]="draftOf(control.key, value)"
                (input)="editJson(control, $any($event.target))"
              ></textarea>
              @if (errors()[control.key]; as message) {
                <p [id]="id + '-error'" class="text-destructive text-xs" role="alert">
                  {{ message }}
                </p>
              }
            }
          }
          @if (control.description; as hint) {
            <p class="text-muted-foreground text-xs" [id]="id + '-hint'">{{ hint }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class PlaygroundControlsComponent {
  readonly controls = input.required<readonly Control[]>();
  readonly values = input.required<Values>();
  /** Makes the field ids unique when several groups share the page. */
  readonly idPrefix = input('pg');

  readonly valueChange = output<ControlChange>();

  private readonly drafts = signal<Record<string, string>>({});
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly String = String;

  protected toPercent(control: Control, value: unknown): number {
    return control.kind === 'range' ? toSlider(Number(value), control.min, control.max) : 0;
  }

  protected emitRange(control: Control, percent: number): void {
    if (control.kind !== 'range') return;
    this.emit(control.key, fromSlider(percent, control.min, control.max, control.step));
  }

  protected emit(key: string, value: unknown): void {
    this.valueChange.emit({ key, value });
  }

  /** Hint and (for JSON) error ids that describe the field. */
  protected describedBy(control: Control, id: string): string | null {
    const ids = [
      ...(control.description ? [`${id}-hint`] : []),
      ...(this.errors()[control.key] ? [`${id}-error`] : []),
    ];
    return ids.length ? ids.join(' ') : null;
  }

  protected optionIndex(control: Control, value: unknown): number {
    if (control.kind !== 'select') return -1;
    const json = JSON.stringify(value);
    return control.options.findIndex((option) => JSON.stringify(option.value) === json);
  }

  protected draftOf(key: string, value: unknown): string {
    return this.drafts()[key] ?? (value === undefined ? '' : JSON.stringify(value));
  }

  /**
   * Parses and validates the JSON text. Empty text resets to the control's default (never
   * `undefined`, which would crash components that require the value) and rewrites the field.
   */
  protected editJson(control: Control, field: HTMLTextAreaElement): void {
    if (control.kind !== 'json') return;
    const { key } = control;
    const text = field.value;
    const clearError = () => this.errors.update(({ [key]: _, ...rest }) => rest);
    const fail = (message: string) =>
      this.errors.update((errors) => ({ ...errors, [key]: message }));

    if (!text.trim()) {
      this.drafts.update(({ [key]: _, ...rest }) => rest);
      clearError();
      field.value = control.default === undefined ? '' : JSON.stringify(control.default);
      this.emit(key, control.default);
      return;
    }
    this.drafts.update((drafts) => ({ ...drafts, [key]: text }));
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      fail('Not valid JSON, keeping the last value.');
      return;
    }
    const invalid = control.validate?.(parsed);
    if (invalid) {
      fail(`${invalid} Keeping the last value.`);
      return;
    }
    clearError();
    this.emit(key, parsed);
  }
}
