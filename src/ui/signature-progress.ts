export type SignatureProgressState = {
  hasPdf: boolean;
  hasSignature: boolean;
  hasMarker: boolean;
};

const steps = ['pdf', 'signature', 'marker', 'download'] as const;

type SignatureStep = (typeof steps)[number];

function isStepComplete(step: SignatureStep, state: SignatureProgressState) {
  if (step === 'pdf') return state.hasPdf;
  if (step === 'signature') return state.hasSignature;
  if (step === 'marker') return state.hasMarker;
  return state.hasPdf && state.hasSignature && state.hasMarker;
}

export function updateSignatureProgress(state: SignatureProgressState, root: ParentNode = document) {
  const firstIncomplete = steps.find(step => !isStepComplete(step, state));

  for (const step of steps) {
    const element = root.querySelector<HTMLElement>(`[data-signature-step="${step}"]`);
    if (!element) continue;

    const complete = isStepComplete(step, state);
    const active = step === firstIncomplete || (step === 'download' && complete);

    element.classList.toggle('signature-step-complete', complete);
    element.classList.toggle('signature-step-active', active);
    element.setAttribute('aria-current', active ? 'step' : 'false');
  }
}
