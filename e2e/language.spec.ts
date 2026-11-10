import { expect, test } from './fixtures';

test.describe('language', () => {
  test('the header toggle switches the shell and home to pt-BR, and the pick survives a reload', async ({
    page,
  }) => {
    await page.goto('/');
    const html = page.locator('html');
    const toggle = page.locator('app-language-toggle button');
    const heading = page.locator('app-page-header-heading');

    // Playwright runs as en-US, so a first visit stays English.
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(heading).toHaveText('Beautiful maps, made simple');

    await toggle.click();
    await expect(html).toHaveAttribute('lang', 'pt-BR');
    await expect(heading).toHaveText('Mapas bonitos, sem complicação');
    // z-button gives the header links role="button".
    await expect(
      page.locator('app-header nav').getByRole('button', { name: 'Componentes', exact: true }),
    ).toBeVisible();
    await expect(page.locator('app-footer')).toContainText('Licença MIT');

    await page.reload();
    await expect(html).toHaveAttribute('lang', 'pt-BR');
    await expect(heading).toHaveText('Mapas bonitos, sem complicação');

    await toggle.click();
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(heading).toHaveText('Beautiful maps, made simple');
  });

  test('the docs sidebar and command search follow the language', async ({ page }) => {
    await page.goto('/docs');
    await page.locator('app-language-toggle button').click();

    await expect(page.locator('app-docs-sidebar')).toContainText('Primeiros passos');
    await expect(page.locator('app-docs-sidebar')).toContainText('Marcadores');

    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByPlaceholder('Buscar...')).toBeVisible();
    await dialog.getByPlaceholder('Buscar...').fill('marcad');
    await expect(dialog.getByRole('option', { name: 'Marcadores' })).toBeVisible();
  });

  test('docs pages translate titles and prose but keep the English anchors', async ({ page }) => {
    await page.goto('/docs/components/markers');
    await page.locator('app-language-toggle button').click();

    await expect(page.locator('app-docs-page h1')).toHaveText('Marcadores');
    const section = page.locator('#basic-example');
    await expect(section.locator('h2')).toHaveText('Exemplo básico');
    await expect(section).toContainText('Posicione marcadores com');
    await expect(page.locator('app-docs-toc')).toContainText('Nesta página');
    await expect(page.locator('app-docs-toc a[href$="#basic-example"]')).toHaveText(
      'Exemplo básico',
    );
    await expect(page).toHaveTitle('Marcadores de mapa para Angular - ng-mapcn');

    await page.locator('app-language-toggle button').click();
    await expect(page.locator('app-docs-page h1')).toHaveText('Markers');
    await expect(page).toHaveTitle('Angular Map Markers - ng-mapcn');
  });

  test('blocks, playground and credits follow the language', async ({ page }) => {
    await page.goto('/credits');
    await page.locator('app-language-toggle button').click();
    await expect(page.locator('app-page-header-heading')).toHaveText('Créditos');

    // The pick is saved, so the next pages open in pt-BR.
    await page.goto('/blocks');
    await expect(page.locator('app-block-display h2').first()).toHaveText('Mapa de analytics');
    await expect(page.getByRole('tab', { name: 'Código' }).first()).toBeVisible();
    await expect(page.locator('app-block-display iframe').first()).toHaveAttribute(
      'title',
      'Mapa de analytics',
    );

    await page.goto('/playground');
    await expect(page.getByRole('heading', { name: 'Galeria de estilos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adicionar Marcador' })).toBeVisible();
  });

  test('the API reference translates its prose and descriptions, not the code names', async ({
    page,
  }) => {
    await page.goto('/docs/api-reference');
    await page.locator('app-language-toggle button').click();

    await expect(page.locator('app-docs-page h1')).toHaveText('Referência da API');
    const map = page.locator('#map');
    await expect(map.locator('h2')).toHaveText('Map');
    await expect(map).toContainText('O componente contêiner raiz');
    await expect(map).toContainText('Nível de zoom inicial do mapa.');
    await expect(map.getByRole('cell', { name: 'zoom', exact: true })).toBeVisible();
    await expect(page.locator('#mapcontextservice')).toContainText('Membro');
  });

  test('map controls, the theme toggle and the sections follow the language', async ({ page }) => {
    await page.goto('/docs/components/controls');
    await page.locator('app-language-toggle button').click();

    const controls = page.locator('#basic-usage .ng-controls').first();
    await expect(controls.getByRole('button', { name: 'Aproximar' })).toBeVisible();
    await expect(controls.getByRole('button', { name: 'Tela cheia', exact: false })).toBeVisible();
    await expect(page.locator('app-theme-toggle button')).toHaveAttribute(
      'aria-label',
      'Alternar tema',
    );
    // Section titles are inputs, not native tooltips.
    await expect(page.locator('app-docs-page[title], app-example-section[title]')).toHaveCount(0);

    await page.locator('app-language-toggle button').click();
    await expect(controls.getByRole('button', { name: 'Zoom in' })).toBeVisible();
  });

  test('playground hints and block view titles are translated', async ({ page }) => {
    await page.goto('/playground');
    await page.locator('app-language-toggle button').click();
    await page.getByRole('button', { name: 'Adicionar Rota' }).click();
    await expect(page.getByText('Opacidade da linha.').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Código de Carto (padrão)' })).toBeVisible();

    await page.goto('/view/analytics-map');
    await expect(page).toHaveTitle('Mapa de analytics - ng-mapcn');
  });
});
