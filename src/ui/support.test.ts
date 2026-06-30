// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupSupportLinks } from './support';

function renderSupportDom() {
  document.body.innerHTML = `
    <button data-support-method="paypal" aria-expanded="false"></button>
    <button data-support-method="breb" aria-expanded="false"></button>
    <section id="support-paypal-panel" class="support-panel"></section>
    <section id="support-breb-panel" class="support-panel"></section>
    <span id="support-paypal-value"></span>
    <span id="support-breb-value"></span>
    <span id="support-breb-extra"></span>
    <button data-copy-support="paypal"></button>
    <button data-copy-support="breb"></button>
  `;
}

describe('setupSupportLinks', () => {
  beforeEach(() => {
    renderSupportDom();
  });

  it('renders support details and toggles the selected panel', () => {
    setupSupportLinks({
      details: {
        paypalEmail: 'pay@example.com',
        brebValue: '@breb',
        brebHolder: 'Holder',
      },
      i18n: (_en, es, vars = {}) => es.replace('{{holder}}', vars.holder || ''),
      showStatus: vi.fn(),
    });

    expect(document.getElementById('support-paypal-value')?.textContent).toBe('pay@example.com');
    expect(document.getElementById('support-breb-value')?.textContent).toBe('@breb');
    expect(document.getElementById('support-breb-extra')?.textContent).toBe('Titular: Holder.');

    document.querySelector<HTMLElement>('[data-support-method="breb"]')?.click();

    expect(document.getElementById('support-breb-panel')?.classList.contains('visible')).toBe(true);
    expect(document.querySelector<HTMLElement>('[data-support-method="breb"]')?.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector<HTMLElement>('[data-support-method="paypal"]')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('copies configured support values', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    const showStatus = vi.fn();

    setupSupportLinks({
      details: {
        paypalEmail: 'pay@example.com',
        brebValue: '@breb',
        brebHolder: 'Holder',
      },
      i18n: en => en,
      showStatus,
    });

    document.querySelector<HTMLElement>('[data-copy-support="paypal"]')?.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('pay@example.com');
    expect(showStatus).toHaveBeenCalledWith('Support detail copied', 'success');
  });
});
