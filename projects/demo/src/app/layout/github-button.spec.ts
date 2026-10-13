import { TestBed } from '@angular/core/testing';

import { GithubButtonComponent } from './github-button';

describe('GithubButtonComponent', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  async function render(): Promise<HTMLAnchorElement> {
    const fixture = TestBed.createComponent(GithubButtonComponent);
    await fixture.whenStable();
    // Let the fetch promise chain settle, then flush the signal update.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).querySelector('a')!;
  }

  it('shows the compact star count and caches it', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ stargazers_count: 1234 }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);

    const link = await render();

    expect(link.textContent?.trim()).toBe('1.2k');
    expect(link.getAttribute('aria-label')).toBe('GitHub repository, 1234 stars');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/juanvieiraprado99/ng-mapcn',
      expect.anything(),
    );

    fetch.mockClear();
    await render();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stays icon-only when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));

    const link = await render();

    expect(link.textContent?.trim()).toBe('');
    expect(link.getAttribute('aria-label')).toBe('GitHub repository');
  });
});
