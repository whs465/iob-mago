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

  setText('.hero-copy .eyebrow .eyebrow-label', 'Local, fast, private PDF tools');
  setElementText('hero-title-line-1', 'Your PDFs, in order.');
  setElementText('hero-title-line-2', 'Your contracts, up to date.');
  setElementText('hero-title-line-3', 'All from your browser.');
  setText(
    '.hero-copy .subtitle',
    'Organize documents, sign your PDFs every month, create a transparent signature if you do not have one yet, and check contract progress from phone or desktop.',
  );
  setText('.hero-actions .btn-primary', 'Work with PDFs');
  setText('.hero-actions .btn-secondary', 'Sign a PDF');
  setElementText('hero-trust', 'We never upload your files to a server. They are processed locally and never leave this device.');
  const heroNavLinks = requiredQueryAll<HTMLAnchorElement>('.hero-section-nav a');
  heroNavLinks[0].textContent = 'Progress';
  heroNavLinks[1].textContent = 'PDF';
  heroNavLinks[2].textContent = 'Signing';
  heroNavLinks[3].textContent = 'Screenshots';

  const sections = requiredQueryAll<HTMLElement>('.section');
  setText('.section-kicker', 'Featured tool', sections[0]);
  setText('.section-title', 'Progress tracking', sections[0]);
  setText(
    '.section-text',
    'Keep today’s progress and the latest monthly report percentage in view.',
    sections[0],
  );
  setElementText('tools-kicker', 'Quick tools');
  setElementText('tools-title', 'One workspace for all your PDF tasks');
  setElementText(
    'tools-text',
    'Merge, split, compress, organize, review metadata, or add a watermark without taking the document out of the browser.',
  );
  setText('.section-kicker', 'Document signing', sections[2]);
  setText('.section-title', 'Sign your PDFs in seconds', sections[2]);
  setText(
    '.section-text',
    'Your signature stays saved in this browser so you can reuse it every month. Upload the PDF, place it, and download; if you do not have a clean signature image yet, create one from a photo without drawing with a mouse.',
    sections[2],
  );

  setElementText('screenshot-title', 'Give your screenshots a clean finish');
  setElementText('screenshot-copy', 'Paste a screenshot from the clipboard and download it with a fine border, smooth corners, and a carefully balanced shadow.');
  setElementText('screenshot-paste-title', 'Paste your screenshot here');
  setElementText('screenshot-paste-help', 'Use Ctrl + V, drag an image, or select one from your device.');
  setElementText('screenshot-choose-action', 'Choose image');
  setElementText('screenshot-finish-title', 'Finish');
  setElementText('screenshot-finish-copy', 'The initial preset is already balanced. Adjust it only if needed.');
  setText('label[for="screenshot-radius"]', 'Corners');
  setText('label[for="screenshot-shadow"]', 'Shadow');
  setText('label[for="screenshot-padding"]', 'Margin');
  setText('label[for="screenshot-background"]', 'Background');
  setText('label[for="screenshot-format"]', 'Download format');
  const screenshotRadiusOptions = requiredQueryAll<HTMLOptionElement>('#screenshot-radius option');
  screenshotRadiusOptions[0].textContent = 'Subtle';
  screenshotRadiusOptions[1].textContent = 'Smooth';
  screenshotRadiusOptions[2].textContent = 'Rounded';
  const screenshotShadowOptions = requiredQueryAll<HTMLOptionElement>('#screenshot-shadow option');
  screenshotShadowOptions[0].textContent = 'No shadow';
  screenshotShadowOptions[1].textContent = 'Soft';
  screenshotShadowOptions[2].textContent = 'Medium';
  const screenshotPaddingOptions = requiredQueryAll<HTMLOptionElement>('#screenshot-padding option');
  screenshotPaddingOptions[0].textContent = 'Small';
  screenshotPaddingOptions[1].textContent = 'Normal';
  screenshotPaddingOptions[2].textContent = 'Wide';
  const screenshotBackgroundOptions = requiredQueryAll<HTMLOptionElement>('#screenshot-background option');
  screenshotBackgroundOptions[0].textContent = 'Transparent';
  screenshotBackgroundOptions[1].textContent = 'Soft gray';
  screenshotBackgroundOptions[2].textContent = 'White';
  const screenshotFormatOptions = requiredQueryAll<HTMLOptionElement>('#screenshot-format option');
  screenshotFormatOptions[0].textContent = 'PNG · image';
  screenshotFormatOptions[1].textContent = 'PDF · one page';
  setElementText('screenshot-replace-action', 'Change image');
  setElementText('screenshot-copy-action', 'Copy image');
  setElementText('screenshot-download-action', 'Download PNG');
  setElementText('screenshot-status', 'Waiting for a screenshot · processed locally');

  const progressCard = getRequiredElement('progress-card');
  setText('.card-icon', 'Progress', progressCard);
  setText('h3', 'Contract status', progressCard);
  setText('p', 'Check today’s progress and the percentage from the latest monthly report.', progressCard);
  setText('.contract-current-summary .contract-summary-label', 'Current progress', progressCard);
  setText('.contract-last-report .contract-summary-label', 'Latest report', progressCard);
  setText('.contract-period-bar .contract-summary-label', 'Contract', progressCard);
  setText('.contract-timeline-heading .contract-summary-label', 'Monthly reports', progressCard);
  setText('.contract-timeline-heading > span:last-child', 'Tap a point to view its cutoff', progressCard);
  const timelineDetail = getRequiredElement('contract-timeline-detail');
  timelineDetail.dataset.defaultText = 'Tap a point to view its details';
  timelineDetail.textContent = timelineDetail.dataset.defaultText;
  getRequiredElement('contract-date-edit-action').textContent = 'Close';

  const sourceCard = getRequiredElement('source-card');
  setText('.card-icon', 'Source PDF', sourceCard);
  setText('h3', 'Source document', sourceCard);
  setText('p', 'Drop one or more PDFs, then pick the operation you want. You can reorder or remove files from this list.', sourceCard);
  setElementText('source-workbench-status', 'No PDF loaded');
  setElementText('source-workbench-summary', 'Load one or more PDFs to activate the tools.');
  setElementText('source-clear-action', 'Clear');

  setElementText('pdf-category-files', 'Files');
  setElementText('pdf-category-pages', 'Pages');
  setElementText('pdf-category-document', 'Document');
  setElementText('pdf-tool-merge', 'Merge');
  setElementText('pdf-tool-split', 'Split');
  setElementText('pdf-tool-extract', 'Extract');
  setElementText('pdf-tool-delete', 'Remove');
  setElementText('pdf-tool-order', 'Reorder');
  setElementText('pdf-tool-rotate', 'Rotate');
  setElementText('pdf-tool-compress', 'Compress');
  setElementText('pdf-tool-unlock', 'Remove password');
  setElementText('pdf-tool-watermark', 'Watermark');
  setElementText('pdf-tool-metadata', 'Metadata');

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
  setText('h3', 'Rotate pages', rotateCard);
  setText('p', 'Fix the orientation of the whole PDF or only the pages you choose.', rotateCard);
  setText('label[for="rotate-mode"]', 'Rotation', rotateCard);
  const rotationOptions = requiredQueryAll<HTMLOptionElement>('#rotate-mode option');
  rotationOptions[0].textContent = 'Automatic · landscape to portrait';
  rotationOptions[1].textContent = '90° clockwise';
  rotationOptions[2].textContent = '90° counterclockwise';
  rotationOptions[3].textContent = '180° · turn upright';
  setElementText('rotate-pages-label', 'Pages (leave blank = whole PDF)');
  setText('.btn-primary', 'Rotate pages', rotateCard);

  const compressCard = getRequiredElement('compress-card');
  setText('.card-icon', 'Compress', compressCard);
  setText('h3', 'Reduce file size', compressCard);
  setText('p', 'Reduce PDF size with a safe mode or stronger visual compression.', compressCard);
  setText('label[for="compress-mode"]', 'Compression level', compressCard);
  const compressionOptions = requiredQueryAll<HTMLOptionElement>('#compress-mode option');
  compressionOptions[0].textContent = 'Safe · keeps text and links';
  compressionOptions[1].textContent = 'Balanced · good visual quality';
  compressionOptions[2].textContent = 'Compact · lighter file';
  setElementText('compress-note', 'Safe mode never replaces the original with a larger copy. Visual compression flattens pages and may remove selectable text, links, or forms.');
  setText('.btn-primary', 'Compress and download', compressCard);

  const unlockCard = getRequiredElement('unlock-card');
  setText('.card-icon', 'Unlock', unlockCard);
  setText('h3', 'Remove PDF password', unlockCard);
  setText('p', 'Open the document with its current password and download a copy that no longer asks for it.', unlockCard);
  setText('label[for="unlock-password"]', 'Current PDF password', unlockCard);
  setElementText('unlock-note', 'The password is only used while processing the file and is never stored. The copy keeps the visual appearance, but flattens text, links, and forms, just like printing to PDF.');
  setText('.btn-primary', 'Remove password and download', unlockCard);

  const watermarkCard = getRequiredElement('watermark-card');
  setText('.card-icon', 'Watermark', watermarkCard);
  setText('h3', 'Text watermark', watermarkCard);
  setText('p', 'Add subtle text to the center of every page or a selected range.', watermarkCard);
  setText('label[for="watermark-text"]', 'Text', watermarkCard);
  setText('label[for="watermark-pages"]', 'Pages (blank = whole PDF)', watermarkCard);
  setText('label[for="watermark-opacity"]', 'Opacity', watermarkCard);
  setText('label[for="watermark-size"]', 'Size', watermarkCard);
  setText('label[for="watermark-angle"]', 'Angle', watermarkCard);
  setText('.btn-primary', 'Add and download', watermarkCard);

  const metadataCard = getRequiredElement('metadata-card');
  setText('.card-icon', 'Metadata', metadataCard);
  setText('h3', 'Document information', metadataCard);
  setText('p', 'Review and edit the internal information of the first loaded PDF, or clear its descriptive fields.', metadataCard);
  setElementText('metadata-load-action', 'View metadata');
  setText('label[for="metadata-title"]', 'Title', metadataCard);
  setText('label[for="metadata-author"]', 'Author', metadataCard);
  setText('label[for="metadata-subject"]', 'Subject', metadataCard);
  setText('label[for="metadata-keywords"]', 'Keywords', metadataCard);
  setText('label[for="metadata-creator"]', 'Creator application', metadataCard);
  setText('label[for="metadata-producer"]', 'PDF producer', metadataCard);
  setElementText('metadata-save-action', 'Save edited copy');
  setElementText('metadata-clear-action', 'Clear metadata and download');

  const signCard = getRequiredElement('sign-card');
  setText('.card-icon', 'Sign', signCard);
  setText('.signature-stage h3', 'Sign PDF with an image', signCard);
  setText(
    '.signature-stage > p',
    'Upload the PDF and your signature image, mark the position, move it if needed, and download it signed at the size you prefer.',
    signCard,
  );
  setElementText('signature-creator-entry-title', 'Is your signature still just a photo?');
  setElementText('signature-creator-entry-text', 'Turn it into a clean, transparent PNG ready to reuse.');
  setElementText('signature-creator-entry-action', 'Create transparent signature');

  setText('label[for="fecha-inicial"]', 'Contract start');
  setText('label[for="fecha-final"]', 'Contract end');
  getRequiredElement('fecha-inicial').setAttribute('aria-label', 'Contract start date');
  getRequiredElement('fecha-final').setAttribute('aria-label', 'Contract end date');
  setInputPlaceholder('extract-pages', '1, 2, 3 or 1-5, 8, 10-12');
  setInputPlaceholder('delete-pages', '2, 4, 7 or 2-6, 9, 12-14');
  setInputPlaceholder('rotate-pages', 'Leave blank or type 1-3, 8, 10-12');
  setInputPlaceholder('watermark-pages', '1-3, 8, 10-12');

  updateFileInputLabel('source-label', 'source-input', 'Select or drop your PDFs');
  setElementText('source-drop-help', 'One or more PDF files · processed locally');
  updateSignPdfLabel('Select or drop the PDF to sign');
  setElementText('sign-pdf-drop-help', 'One PDF file · stays on this device');
  getRequiredElement('sign-image-label-1').querySelector<HTMLElement>('[data-file-label-text]')!.textContent = 'Select or drop signature 1';
  getRequiredElement('sign-image-label-2').querySelector<HTMLElement>('[data-file-label-text]')!.textContent = 'Select or drop signature 2';
  setElementText('sign-image-help-1', 'PNG or JPG · transparent background recommended');
  setElementText('sign-image-help-2', 'PNG or JPG · transparent background recommended');
  updateSignImageLabel(
    hasSignatureImage ? 'Signature loaded' : 'Select or drop signature 1',
    hasSignatureImage,
  );
  updateSignatureSourceLabel(
    signatureSourceFileName || 'Choose or drop the photo',
    !!signatureSourceFileName,
  );
  setElementText('signature-source-help', 'PNG, JPG, or WebP · light paper and good lighting');
  setElementText('camera-action-text', 'Take photo');

  requiredQuery('#first-page').setAttribute('aria-label', 'Go to first page');
  requiredQuery('#first-page').setAttribute('title', 'Go to first page');
  requiredQuery('#prev-page').setAttribute('aria-label', 'Previous page');
  requiredQuery('#prev-page').setAttribute('title', 'Previous page');
  requiredQuery('#next-page').setAttribute('aria-label', 'Next page');
  requiredQuery('#next-page').setAttribute('title', 'Next page');
  requiredQuery('#last-page').setAttribute('aria-label', 'Go to last page');
  requiredQuery('#last-page').setAttribute('title', 'Go to last page');
  requiredQuery('#zoom-out').setAttribute('aria-label', 'Zoom out');
  requiredQuery('#zoom-out').setAttribute('title', 'Zoom out');
  requiredQuery('#zoom-in').setAttribute('aria-label', 'Zoom in');
  requiredQuery('#zoom-in').setAttribute('title', 'Zoom in');
  requiredQuery('#zoom-reset').setAttribute('aria-label', 'Fit to width');
  requiredQuery('#zoom-reset').setAttribute('title', 'Fit to width');
  requiredQuery('#clear-markers').setAttribute('aria-label', 'Clear markers');
  requiredQuery('#clear-markers').setAttribute('title', 'Clear markers');
  setElementText('zoom-reset-label', 'Fit');
  setElementText('clear-markers-label', 'Clear markers');
  requiredQuery('#signature-steps').setAttribute('aria-label', 'Signature progress');
  setText('[data-signature-step="signature"] strong', 'Signature');
  setText('[data-signature-step="marker"] strong', 'Position');
  setText('[data-signature-step="download"] strong', 'Download');
  setHtml('#help-text', '<strong>Click on the PDF</strong> to mark the signature position');
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
