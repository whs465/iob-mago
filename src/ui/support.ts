import { getRequiredElement, type StatusType } from './dom';

export type SupportMethod = 'paypal' | 'breb';

export type SupportPaymentDetails = {
  paypalEmail: string;
  brebValue: string;
  brebHolder: string;
};

export type SupportI18n = (
  englishText: string,
  spanishText: string,
  vars?: Record<string, string>,
) => string;

export type SetupSupportLinksOptions = {
  details: SupportPaymentDetails;
  i18n: SupportI18n;
  showStatus(message: string, type: StatusType): void;
};

function isSupportMethod(method: string | undefined): method is SupportMethod {
  return method === 'paypal' || method === 'breb';
}

function getSupportCopyValue(method: SupportMethod, details: SupportPaymentDetails) {
  return method === 'paypal' ? details.paypalEmail : details.brebValue;
}

function renderSupportDetails(details: SupportPaymentDetails, i18n: SupportI18n) {
  const paypalEmail = details.paypalEmail || i18n(
    'Configure your PayPal email',
    'Configura tu correo de PayPal',
  );
  const brebValue = details.brebValue || i18n(
    'Configure your Bre-B detail',
    'Configura tu dato Bre-B',
  );
  const brebHolder = details.brebHolder || i18n(
    'configure the account holder name',
    'configura el nombre del titular',
  );

  getRequiredElement('support-paypal-value').textContent = paypalEmail;
  getRequiredElement('support-breb-value').textContent = brebValue;
  getRequiredElement('support-breb-extra').textContent = i18n(
    'Account holder: {{holder}}.',
    'Titular: {{holder}}.',
    { holder: brebHolder },
  );
}

function toggleSupportPanel(method: SupportMethod) {
  const activePanelId = `support-${method}-panel`;

  document.querySelectorAll('.support-panel').forEach(panel => {
    panel.classList.toggle('visible', panel.id === activePanelId);
  });

  document.querySelectorAll<HTMLElement>('[data-support-method]').forEach(button => {
    const isActive = button.dataset.supportMethod === method;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-expanded', String(isActive));
  });
}

function copyTextToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return Promise.resolve();
}

async function copySupportValue(
  method: SupportMethod,
  { details, i18n, showStatus }: SetupSupportLinksOptions,
) {
  const value = getSupportCopyValue(method, details);
  if (!value) {
    showStatus(
      i18n(
        'Configure this support detail in supportPaymentDetails inside index.html.',
        'Configura este dato de apoyo en supportPaymentDetails dentro de index.html.',
      ),
      'processing',
    );
    return;
  }

  try {
    await copyTextToClipboard(value);
    showStatus(i18n('Support detail copied', 'Dato copiado'), 'success');
  } catch (error) {
    showStatus(
      i18n('Could not copy the support detail', 'No se pudo copiar el dato'),
      'error',
    );
  }
}

export function setupSupportLinks(options: SetupSupportLinksOptions) {
  renderSupportDetails(options.details, options.i18n);

  document.querySelectorAll<HTMLElement>('[data-support-method]').forEach(button => {
    button.addEventListener('click', () => {
      const method = button.dataset.supportMethod;
      if (isSupportMethod(method)) toggleSupportPanel(method);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-copy-support]').forEach(button => {
    button.addEventListener('click', () => {
      const method = button.dataset.copySupport;
      if (isSupportMethod(method)) void copySupportValue(method, options);
    });
  });
}
