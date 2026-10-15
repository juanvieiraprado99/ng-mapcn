import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import type { Control, Values } from './playground-schema';

export interface ControlChange {
  key: string;
  value: unknown;
}

const INPUT =
  'border-input bg-background text-foreground focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]';

/**
 * Renders a `Control[]` schema as form fields (select, range, switch, color, text, JSON).
 * Every field is a native, labelled element, so it is keyboard operable and axe clean.
 */
@Component({
  selector: 'app-playground-controls',
  standalone: true,
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
              <label class="flex items-center gap-2 text-sm font-medium" [attr.for]="id">
                <input
                  type="checkbox"
                  class="size-4"
                  [id]="id"
                  [checked]="value === true"
                  (change)="emit(control.key, $any($event.target).checked)"
                />
                {{ control.label }}
              </label>
            }
            @case ('range') {
              <label class="flex items-center justify-between text-sm font-medium" [attr.for]="id">
                <span>{{ control.label }}</span>
                <output class="text-muted-foreground font-mono text-xs" [attr.for]="id">{{
                  value
                }}</output>
              </label>
              <input
                type="range"
                [id]="id"
                [attr.min]="control.min"
                [attr.max]="control.max"
                [attr.step]="control.step"
                [value]="value"
                (input)="emit(control.key, +$any($event.target).value)"
              />
            }
            @case ('select') {
              <label class="text-sm font-medium" [attr.for]="id">{{ control.label }}</label>
              <select
                [id]="id"
                class="${INPUT}"
                (change)="emit(control.key, control.options[+$any($event.target).value].value)"
              >
                @for (option of control.options; track $index) {
                  <option [value]="$index" [selected]="optionIndex(control, value) === $index">
                    {{ option.label }}
                  </option>
                }
              </select>
            }
            @case ('color') {
              <label class="flex items-center justify-between text-sm font-medium" [attr.for]="id">
                <span>{{ control.label }}</span>
                <output class="text-muted-foreground font-mono text-xs" [attr.for]="id">{{
                  value
                }}</output>
              </label>
              <input
                type="color"
                [id]="id"
                class="border-input h-9 w-full cursor-pointer rounded-md border p-1"
                [value]="value"
                (input)="emit(control.key, $any($event.target).value)"
              />
            }
            @case ('text') {
              <label class="text-sm font-medium" [attr.for]="id">{{ control.label }}</label>
              <input
                type="text"
                [id]="id"
                class="${INPUT}"
                [value]="value"
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
                [attr.aria-describedby]="errors()[control.key] ? id + '-error' : null"
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
            <p class="text-muted-foreground text-xs">{{ hint }}</p>
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

  protected emit(key: string, value: unknown): void {
    this.valueChange.emit({ key, value });
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
