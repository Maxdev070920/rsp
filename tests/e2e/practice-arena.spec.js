import { expect, test } from '@playwright/test';

/**
 * End-to-end coverage of the promise that matters most: Practice Arena is
 * playable with no wallet, no account, and no configuration.
 */

test.describe('Practice Arena', () => {
  test('a visitor can start a free run from the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Eternal Singularity');

    await page.getByTestId('play-free').first().click();
    await page.waitForURL('**/game**');

    await expect(page.getByRole('group', { name: 'Choose your throw' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Rock/ })).toBeEnabled();
  });

  test('throwing resolves a round and updates the run state', async ({ page }) => {
    await page.goto('/game?room=practice');
    await page.getByRole('group', { name: 'Choose your throw' }).waitFor();

    await page.getByRole('button', { name: /^Rock/ }).click();

    // One of the three authoritative outcomes must appear on the stage. Scoped
    // to the stage because a resolved loss also names itself in the summary.
    const outcome = page.getByRole('region', { name: 'Arena stage' }).getByText(/Resolved win|Resolved loss|Tie — replay/);
    await expect(outcome).toBeVisible({ timeout: 20_000 });
  });

  test('a win offers claim and continue, and claiming ends the run', async ({ page }) => {
    await page.goto('/game?room=practice');
    await page.getByRole('group', { name: 'Choose your throw' }).waitFor();

    // Keep throwing until a win appears; a loss starts a fresh run.
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const decisionVisible = await page.getByTestId('claim-button').isVisible().catch(() => false);
      if (decisionVisible) break;

      const summaryVisible = await page.getByText('Run over').isVisible().catch(() => false);
      if (summaryVisible) {
        await page.getByRole('button', { name: 'Play again' }).click();
        await page.getByRole('group', { name: 'Choose your throw' }).waitFor();
        continue;
      }

      const throwButton = page.getByRole('button', { name: /^Paper/ });
      if (await throwButton.isEnabled().catch(() => false)) {
        await throwButton.click();
      }
      await page.waitForTimeout(1200);
    }

    await expect(page.getByTestId('claim-button')).toBeVisible();
    await expect(page.getByTestId('continue-button')).toBeVisible();

    await page.getByTestId('claim-button').click();
    // Scoped to the summary panel: the toast carries the same words.
    const summary = page.getByRole('region', { name: 'Run summary' });
    await expect(summary.getByText('Reward claimed')).toBeVisible({ timeout: 20_000 });
  });

  test('the odds panel states the probability model', async ({ page }) => {
    await page.goto('/game?room=practice');
    const panel = page.getByRole('region', { name: 'Odds and stakes' });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Entry fee');
    await expect(panel).toContainText('Win streak');
    await expect(panel).toContainText('At risk now');
  });

  test('moves can be thrown from the keyboard', async ({ page }) => {
    await page.goto('/game?room=practice');
    await page.getByRole('group', { name: 'Choose your throw' }).waitFor();

    await page.keyboard.press('1');
    const stage = page.getByRole('region', { name: 'Arena stage' });
    await expect(stage.getByText(/Resolved win|Resolved loss|Tie — replay/)).toBeVisible({ timeout: 20_000 });
  });
});
