import { ApplicationRef, type Injector, type TemplateRef, untracked } from '@angular/core';

/**
 * Renders `tpl` into `target`, a DOM node owned by MapLibre (marker element, popup content) — the
 * Angular equivalent of a React portal. Returns the teardown.
 *
 * The view is attached to the ApplicationRef rather than a ViewContainerRef: Angular re-inserts a
 * container's views next to its anchor whenever the host is (re)projected — e.g. by `<ng-map>`'s
 * `@if (mapInstance()) { <ng-content /> }` — which would pull the nodes back out of `target` (the
 * CDK portal approach). Every root node is moved, comments included: they anchor the projected
 * `@if` / `@for` blocks, so views those blocks create later land in `target` too.
 */
export function renderPortal(
  tpl: TemplateRef<unknown>,
  injector: Injector,
  target: Node,
): () => void {
  const appRef = injector.get(ApplicationRef);
  const view = tpl.createEmbeddedView(null, injector);
  appRef.attachView(view);
  for (const node of view.rootNodes as Node[]) target.appendChild(node);
  // Refreshing the view reads the template's signals: keep them out of a calling effect.
  untracked(() => view.detectChanges());
  // Destroying an attached view also detaches it from the ApplicationRef.
  return () => view.destroy();
}
