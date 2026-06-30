import { getRequiredElement, updateFileInputLabel } from './dom';
import {
  updateSignImageLabel,
  updateSignPdfLabel,
  updateSignatureSourceLabel,
} from './signature-preview';

export type EnglishContentOptions = {
  hasSignatureImage: boolean;
  signatureSourceFileName: string | null;
};

function requiredQuery<T extends Element = HTMLElement>(selector: string, root: ParentNode = document) {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required selector: ${selector}`);
  return element;
}

function requiredQueryAll<T extends Element = HTMLElement>(selector: string, root: ParentNode = document) {
  const elements = Array.from(root.querySelectorAll<T>(selector));
  if (elements.length === 0) throw new Error(`Missing required selector: ${selector}`);
  return elements;
}

function setText(selector: string, text: string, root: ParentNode = document) {
  requiredQuery<HTMLElement>(selector, root).textContent = text;
}

function setHtml(selector: string, html: string, root: ParentNode = document) {
  requiredQuery<HTMLElement>(selector, root).innerHTML = html;
}

function setElementText(id: string, text: string) {
  getRequiredElement(id).textContent = text;
}

function setInputPlaceholder(id: string, placeholder: string) {
  getRequiredElement<HTMLInputElement>(id).placeholder = placeholder;
}

function setImageAlt(id: string, alt: string) {
  getRequiredElement<HTMLImageElement>(id).alt = alt;
}

export function applyEnglishContent({
  hasSignatureImage,
  signatureSourceFileName,
}: EnglishContentOptions) {
  document.documentElement.lang = 'en';
  document.title = 'IOB Mago';

  setText('.brand-note', 'Local, fast, private PDF tools');
  setText('.hero-copy .eyebrow .eyebrow-label', 'PDF tools for everyday work');
  setText('.hero-copy h1', 'Do more with your PDFs. Without leaving the browser.');
  setText(
    '.hero-copy .subtitle',
    'Merge, split, extract, remove, reorder, rotate, sign, and track contract progress from desktop or phone with a cleaner, calmer, fully local interface.',
  );
  setText('.hero-actions .btn-primary', 'View tools');
  setText('.hero-actions .btn-secondary', 'Go to signing');

  const heroHighlights = requiredQueryAll<HTMLElement>('.hero-highlight');
  setText('strong', 'Everything happens in your browser', heroHighlights[0]);
  setText('span', 'No server uploads, no extra steps.', heroHighlights[0]);
  setText('strong', 'Breathe easy', heroHighlights[1]);
  setText('span', 'Your file is processed right here, calmly, without leaving the browser.', heroHighlights[1]);
  setText('strong', 'Desktop and mobile', heroHighlights[2]);
  setText(
    'span',
    'Run tasks and sign from your phone too, even while commuting, without waiting to get home.',
    heroHighlights[2],
  );

  const sections = requiredQueryAll<HTMLElement>('.section');
  setText('.section-kicker', 'Featured tool', sections[0]);
  setText('.section-title', 'Progress tracking', sections[0]);
  setText(
    '.section-text',
    'Calculate your contract progress percentage with a clearer readout and a more editorial presentation.',
    sections[0],
  );
  setElementText('tools-kicker', 'Quick tools');
  setElementText('tools-title', 'Six flows to edit a PDF without the mess');
  setElementText(
    'tools-text',
    'Merge, split, extract, remove, reorder, or fix page orientation in just a few steps, without leaving the browser.',
  );
  setText('.section-kicker', 'Visual signing', sections[2]);
  setText('.section-title', 'Place the signature directly on the PDF', sections[2]);
  setText(
    '.section-text',
    'Upload the PDF, mark where the signature should go, and download it signed right away from desktop or phone, even while commuting.',
    sections[2],
  );

  const progressCard = getRequiredElement('progress-card');
  setText('.card-icon', 'Progress', progressCard);
  setText('h3', 'Contract period', progressCard);
  setText('p', 'Set the start, end, and calculation date to get a quick read on the current contract status.', progressCard);

  const sourceCard = getRequiredElement('source-card');
  setText('.card-icon', 'Source PDF', sourceCard);
  setText('h3', 'Source document', sourceCard);
  setText('p', 'Drop one or more PDFs, then pick the operation you want. You can reorder or remove files from this list.', sourceCard);

  const mergeCard = getRequiredElement('merge-card');
  setText('.card-icon', 'Merge', mergeCard);
  setText('h3', 'Merge PDFs', mergeCard);
  setText('p', 'Merge all loaded PDFs into a single document', mergeCard);
  setText('label[for="merge-bookmarks"]', 'Add bookmarks per file', mergeCard);
  setText('.btn-primary', 'Merge PDFs', mergeCard);

  const splitCard = getRequiredElement('split-card');
  setText('.card-icon', 'Split', splitCard);
  setText('h3', 'Split PDF', splitCard);
  setText('p', 'Break a PDF into one file per page', splitCard);
  setText('label[for="split-zip"]', 'Download as ZIP', splitCard);
  setText('.btn-primary', 'Split by pages', splitCard);

  const extractCard = getRequiredElement('extract-card');
  setText('.card-icon', 'Extract', extractCard);
  setText('h3', 'Extract pages', extractCard);
  setText('p', 'Choose specific pages to create a new PDF', extractCard);
  setText('label[for="extract-pages"]', 'Pages to extract (e.g. 1, 3, 5-8)', extractCard);
  setText('.btn-primary', 'Extract pages', extractCard);

  const deleteCard = getRequiredElement('delete-card');
  setText('.card-icon', 'Remove', deleteCard);
  setText('h3', 'Remove pages', deleteCard);
  setText('p', 'Take specific pages out of a PDF and keep the rest in a new file', deleteCard);
  setElementText('delete-pages-label', 'Pages to remove (e.g. 2, 4, 7-9)');
  setText('.btn-primary', 'Remove pages', deleteCard);

  const orderCard = getRequiredElement('order-card');
  setText('.card-icon', 'Reorder', orderCard);
  setText('h3', 'Reorder pages', orderCard);
  setText('p', 'Rearrange PDF pages by dragging them or using the arrows before downloading', orderCard);
  setElementText('order-help', 'Drag the pages to reorder them or use the arrows to move them up and down.');
  setText('.btn-primary', 'Reorder and download', orderCard);

  const rotateCard = getRequiredElement('rotate-card');
  setText('.card-icon', 'Rotate', rotateCard);
  setText('h3', 'Rotate to portrait', rotateCard);
  setText('p', 'Review the PDF and rotate only the landscape pages so they end up vertical', rotateCard);
  setElementText('rotate-pages-label', 'Pages to review (leave blank = whole PDF)');
  setText('.btn-primary', 'Rotate to portrait', rotateCard);

  const signCard = getRequiredElement('sign-card');
  setText('.card-icon', 'Sign', signCard);
  setText('.signature-stage h3', 'Sign PDF with an image', signCard);
  setText(
    '.signature-stage > p',
    'Upload the PDF and your signature image, mark the position, move it if needed, and download it signed at the size you prefer.',
    signCard,
  );

  setText('label[for="fecha-inicial"]', 'Contract start');
  setText('label[for="fecha-final"]', 'Contract end');
  setText('label[for="fecha-calculo"]', 'Calculated on');
  setText('.avance-result-label', 'Contract progress');
  setElementText('avance-completion-badge', 'Contract completed');
  getRequiredElement('fecha-inicial').setAttribute('aria-label', 'Contract start date');
  getRequiredElement('fecha-final').setAttribute('aria-label', 'Contract end date');
  getRequiredElement('fecha-calculo').setAttribute('aria-label', 'Calculation date, today by default');
  setInputPlaceholder('extract-pages', '1, 2, 3 or 1-5, 8, 10-12');
  setInputPlaceholder('delete-pages', '2, 4, 7 or 2-6, 9, 12-14');
  setInputPlaceholder('rotate-pages', 'Leave blank or type 1-3, 8, 10-12');

  updateFileInputLabel('source-label', 'source-input', 'Click to select PDF files');
  updateSignPdfLabel('Click to select PDF to sign');
  updateSignImageLabel(
    hasSignatureImage ? 'Signature loaded' : 'Click to select signature image (PNG)',
    hasSignatureImage,
  );
  updateSignatureSourceLabel(
    signatureSourceFileName || 'Click to select signature photo',
    !!signatureSourceFileName,
  );

  setElementText('prev-page', '◀ Previous');
  setElementText('next-page', 'Next ▶');
  setText('.pdf-preview-controls .btn-danger', 'Clear markers');
  setHtml('help-text', '<strong>Click on the PDF</strong> to mark the signature position');
  setText('.signature-controls h4', 'Signature settings');
  setHtml(
    '.signature-storage-note',
    '<strong>Your signature image is stored in this browser</strong> so you do not need to upload it every time. If you replace it, it updates right here.',
  );
  setText('.slider-group label', 'Signature size');
  setText('label[for="apply-all-pages"]', 'Apply to all pages');
  setText('.signature-controls .btn-primary', 'Apply signature and download');
  setImageAlt('signature-preview', 'Signature preview');
  setText('.signature-generator-kicker', 'Prepare PNG');
  setElementText('signature-generator-title', 'Create a transparent PNG from a photo');
  setElementText(
    'signature-generator-copy',
    'Upload a photo of the signature on paper and a clean transparent version will be prepared automatically. You can adjust the tone or cleanup after previewing it.',
  );
  setElementText('signature-sensitivity-label', 'Cleanup sensitivity');
  setText('label[for="signature-auto-trim"]', 'Trim to the signature outline');
  setElementText('signature-tone-label', 'Signature tone');
  setText('#signature-clean-sensitivity + .slider-label span:first-child', 'Soft');
  setText('#signature-clean-sensitivity + .slider-label span:last-child', 'Strong');
  setElementText('signature-generate-action', 'Regenerate PNG');
  setElementText('signature-download-action', 'Download PNG');
  setElementText('signature-use-action', 'Use as signature');
  setImageAlt('prepared-signature-preview', 'Generated PNG preview');
  setElementText('signature-preview-empty', 'The generated PNG will appear here');
  setElementText('support-title', 'Did IOB Mago save you time and stress?');
  setElementText(
    'support-copy',
    'If this page helped you handle PDFs without uploading documents to a server, sign with more privacy, or finally create a decent transparent signature without drawing it with a mouse, you can support the people who built it. That contribution helps keep IOB Mago alive, more polished, and useful for people who work with documents every day.',
  );
  requiredQuery('.support-actions').setAttribute('aria-label', 'Support options');
  requiredQuery('[data-support-method="paypal"]').setAttribute('aria-label', 'Show PayPal details');
  requiredQuery('[data-support-method="breb"]').setAttribute('aria-label', 'Show Bre-B details');
  setElementText('support-paypal-title', 'PayPal details');
  setElementText('support-paypal-note', 'Use this email in PayPal to send your contribution.');
  setElementText('support-paypal-label', 'Email');
  setElementText('support-breb-title', 'Bre-B details');
  setElementText('support-breb-note', 'Use this Bre-B detail from your bank. Verify the account holder before sending.');
  setElementText('support-breb-label', 'Bre-B detail');
  requiredQuery('[data-copy-support="paypal"]').setAttribute('aria-label', 'Copy PayPal email');
  requiredQuery('[data-copy-support="breb"]').setAttribute('aria-label', 'Copy Bre-B detail');

  setText('.info-box h4', 'Privacy and security');
  const infoParagraphs = requiredQueryAll<HTMLElement>('.info-box-content p');
  infoParagraphs[0].innerHTML = '<span class="info-note-number">1.</span>IOB Mago processes files <strong>directly in your browser</strong>. That means the PDF contents and signature image do not need to travel to an external server to be merged, split, extracted, or signed. Keeping that flow on the contractor&apos;s device reduces unnecessary exposure, avoids upload dependencies, and helps maintain control over documents that often contain sensitive, contractual, or personal data.';
  infoParagraphs[1].innerHTML = '<span class="info-note-number">2.</span>Because information is not uploaded to a backend, a major part of the operational risk disappears as well: there are no temporary copies of the document on a third-party platform, no remote processing queues, and no intermediary account that has to safeguard files or credentials. In practical terms, contractors keep a more private, faster, and more direct experience, especially when working with supporting documents, contracts, annexes, and files that should not circulate outside their immediate environment.';
  infoParagraphs[2].innerHTML = '<span class="info-note-number">3.</span>This site does not require prior registration to work. That choice is not just about convenience: it reduces friction, avoids asking for data that is unnecessary for the task, and keeps access focused on the usefulness of IOB Mago. Someone can open the site, upload a file, sign it, and download the result without creating an account, giving away an email address, or depending on an active session.';
  infoParagraphs[3].innerHTML = '<span class="info-note-number">4.</span>The signature image can remain stored in this browser for reuse later, but that storage is local and depends on the device and browser where it was used. If the contractor clears browsing data, changes devices, or uses another browser, that image may no longer be available. For that reason, it is always wise to keep your own copy of the signature file and verify the final document before sharing or sending it.';
  infoParagraphs[4].innerHTML = '<span class="info-note-number">5.</span>No contractor had to stay up all night during the design, development, and testing of IOB Mago. Any resemblance to last-minute deliveries, reheated coffee, or reviews at 11:58 p.m. should be treated as an isolated event and not as an official part of the process.';
  infoParagraphs[5].innerHTML = '<span class="info-note-number">6.</span>Best of all, we do not have to deal with Adobe Reader all day trying to sell us things and butting in when we only wanted to open or sign a PDF.';
  infoParagraphs[6].innerHTML = '<span class="info-note-number">7.</span>Compatible with modern versions of Chrome, Firefox, Edge, and Safari.';
  setHtml('.module-signoff', 'IOB Mago by Módulo IOB G3 · Made with love <span class="heartbeat" aria-hidden="true">♥</span>');
}
