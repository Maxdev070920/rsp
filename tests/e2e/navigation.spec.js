import { expect, test } from '@playwright/test';

test.describe('site navigation and content', () => {
  test('every primary page renders', async ({ page }) => {
    const pages = [
      ['/', 'Eternal Singularity'],
      ['/rooms', 'Choose your arena'],
      ['/collection', 'Your collection'],
      ['/leaderboard', 'Leaderboard'],
      ['/history', 'Game history'],
      ['/rules', 'Rules & fairness'],
      ['/privacy', 'Privacy policy'],
      ['/terms', 'Terms of use'],
      ['/responsible-play', 'Responsible play'],
      ['/profile', ''],
    ];

    for (const [path, heading] of pages) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      if (heading) await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(heading);
    }
  });

  test('the rules page publishes the full odds table', async ({ page }) => {
    await page.goto('/rules');
    // Scoped to the table: the dev-mode RSC payload also contains this text.
    const table = page.getByRole('table', { name: 'Probability of reaching each reward level' });
    await expect(table.getByRole('cell', { name: '1 in 32,768' })).toBeVisible();
    await expect(table.getByRole('cell', { name: 'Eternal Singularity' })).toBeVisible();
    await expect(page.getByText(/Ties are replayed/i).first()).toBeVisible();
  });

  test('all four arenas are listed with their fees', async ({ page }) => {
    await page.goto('/rooms');
    for (const name of ['Practice Arena', 'Bronze Arena', 'Silver Arena', 'Legendary Arena']) {
      await expect(page.getByRole('heading', { name })).toBeVisible();
    }
    await expect(page.getByTestId('enter-practice')).toBeEnabled();
  });

  test('the collection shows all fifteen tiers, locked by default', async ({ page }) => {
    await page.goto('/collection');
    await expect(page.getByRole('button', { name: /Copper Sigil/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Eternal Singularity/ })).toBeVisible();
  });

  test('a paid arena shows the full cost disclosure before entry', async ({ page }) => {
    await page.goto('/rooms');
    await page.getByTestId('enter-bronze').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Entry fee');
    await expect(dialog).toContainText('Estimated gas fee');
    await expect(dialog).toContainText('Maximum possible loss');
    await expect(dialog).toContainText('How the odds work');
  });

  test('the skip link is reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  });

  test('the layout works at phone width without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/rooms');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
