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
});
