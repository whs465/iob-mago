import { PDFDocument, degrees, PDFName, PDFHexString } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

import { recolorPreparedSignaturePng } from './pdf/signature-recolor-action';
import { generateStoredPreparedSignaturePng } from './pdf/prepared-signature-generation-action';
import { downloadPreparedSignatureBlob } from './pdf/prepared-signature-actions';
import { prepareSignaturePng } from './pdf/signature-preparation';
import { loadSignaturePdfDocument } from './pdf/signature-pdf-load';
import {
    createPdfRenderRuntime,
    isEncryptedPdfError
} from './pdf/render';
import { canvasToPngBlob } from './utils/signature-png';
import { loadSignatureAspectRatio } from './utils/signature-image';
import { createLocaleRuntime } from './utils/locale';
import {
    getMarkerCanvasPosition as getMarkerCanvasPositionForMetrics,
    getMarkerPdfPositionFromCanvas,
    getSignatureCanvasDimensions as getSignatureCanvasDimensionsForMetrics
} from './utils/signature-geometry';
import { createSourceFileState } from './state/source-files';
import { createPageOrderState } from './state/page-order';
import { createSignatureDragState } from './state/signature-drag';
import { createSignatureMarkerState } from './state/signature-markers';
import { createSignatureGeneratorState } from './state/signature-generator';
import {
    schedulePreparedSignatureRecolorAction,
    schedulePreparedSignatureRegenerateAction
} from './state/signature-generation-schedule-action';
import { createPreparedSignatureState } from './state/prepared-signature';
import { createSignaturePreviewState } from './state/signature-preview';
import { createActiveSignatureState } from './state/active-signature';
import {
    hasStoredSignatureSlot,
    loadStoredSignatureImage,
    loadStoredSignatureImageFromSlot,
    loadStoredSignatureSize,
    loadStoredSignatureSlot,
    migrateLegacySignatureToSlot1,
    saveSignatureImageFile,
    saveSignatureImageFileToSlot,
    saveSignatureSize,
    saveSignatureSlot
} from './state/signature-storage';
import { createSignatureViewerState } from './state/signature-viewer';
import {
    getInputElement,
    getInputValue,
    setActionBusy,
    setInputValue,
    showStatus
} from './ui/dom';
import { initFileInputDragDrop } from './ui/file-drag-drop';
import { renderOrderPageListWithI18n } from './ui/order-list';
import { getCheckboxValue, getTrimmedInputValue } from './ui/pdf-tools';
import { applyEnglishContent } from './ui/english-content';
import { setupSupportLinks } from './ui/support';
import { setupSignatureEventHandlers } from './ui/signature-events';
import { renderSignaturePdfPage } from './ui/signature-render';
import { createSignatureMarkerFromCanvasClick } from './ui/signature-canvas-click';
import {
    changeSignatureViewerPage,
    renderSignatureViewerPage
} from './ui/signature-navigation-flow';
import {
    handleSignatureCanvasClickFlow,
    removeSignatureMarkerFlow
} from './ui/signature-marker-flow';
import {
    clearSignatureMarkersFlow,
    renderSignatureMarkerListFlow,
    renderSignatureMarkerOverlayFlow,
    resizeSignatureMarkersFlow
} from './ui/signature-marker-render-flow';
import {
    handleSignatureDragFlow,
    stopSignatureDragFlow
} from './ui/signature-drag-flow';
import { autoPlaceSignatureMarker } from './ui/signature-marker-flow';
import { applySignatureFlow } from './ui/signature-apply-flow';
import { mergePdfFlow } from './ui/merge-pdf-flow';
import { splitPdfFlow } from './ui/split-pdf-flow';
import { extractPdfFlow } from './ui/extract-pdf-flow';
import { deletePdfFlow } from './ui/delete-pdf-flow';
import { reorderPdfFlow } from './ui/reorder-pdf-flow';
import { rotatePdfFlow } from './ui/rotate-pdf-flow';
import { compressPdfFlow } from './ui/compress-pdf-flow';
import { unlockPdfFlow } from './ui/unlock-pdf-flow';
import { loadPdfMetadataFlow, savePdfMetadataFlow } from './ui/pdf-metadata-flow';
import { watermarkPdfFlow } from './ui/watermark-pdf-flow';
import type { CompressionMode } from './pdf/compress';
import { registerWindowPdfActions } from './ui/window-actions';
import { loadSignaturePdfFlow } from './ui/signature-pdf-load-flow';
import { resetSignaturePdfViewer } from './ui/signature-viewer-flow';
import {
    getSelectedSignatureTone,
    updateSignatureCleanSensitivityControl,
    updateSignatureToneControl,
    type SignatureGeneratorControlsRuntime
} from './ui/signature-generator-controls';
import {
    resetPreparedSignatureFlow,
    usePreparedSignatureFlow
} from './ui/prepared-signature-flow';
import {
    restoreStoredActiveSignature,
    setActiveSignatureImageFileFlow,
    switchActiveSignatureSlot
} from './ui/active-signature-flow';
import {
    renderPreparedSignatureReady,
    renderPreparedSignatureRecolor,
    setSignatureGeneratorControlsEnabled,
    updateSignatureGeneratorMeta,
    updateSignatureSizeValue,
    updateSignatureSourceLabel
} from './ui/signature-preview';
import {
    getPdfCanvas,
    getPdfCanvasWrapper,
    updateSignaturePageControls
} from './ui/signature-viewer';
import { updateSignatureProgress } from './ui/signature-progress';
import { setupSourceFileFlow } from './ui/source-file-flow';
import { setupContractProgressFlow } from './ui/contract-progress-flow';
import { setupPdfToolWorkspace } from './ui/pdf-tool-workspace';
import { setupScreenshotPolish } from './ui/screenshot-polish';

        const {
            loadPdfDocument,
            getPdfPageCountFromArrayBuffer,
            getPdfPageMetricsFromArrayBuffer,
            appendRenderedPdfPages,
            buildRotatedPortraitPdfFromRenderedPages,
            buildCompressedPdfFromRenderedPages,
            buildUnlockedPdfFromRenderedPages
        } = createPdfRenderRuntime({ PDFDocument, pdfjsLib });
        const pdfBookmarkDeps = { PDFHexString, PDFName };
        const pdfPageCopyDeps = {
            loadPdfDocument,
            isEncryptedPdfError,
            appendRenderedPdfPages,
            bookmarkDeps: pdfBookmarkDeps
        };
        const pdfOperationDeps = {
            PDFDocument,
            pageCopyDeps: pdfPageCopyDeps,
            bookmarkDeps: pdfBookmarkDeps,
            degrees,
            buildRotatedPortraitPdfFromRenderedPages
        };

        // Configurar PDF.js worker via Vite URL import
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).href;

        // Estado de archivos compartido
        const sourceFileState = createSourceFileState();
        const pageOrderState = createPageOrderState();

        // Estado para firma
        const activeSignatureState = createActiveSignatureState();
        const signatureViewerState = createSignatureViewerState();
        const signatureMarkerState = createSignatureMarkerState();
        const signaturePreviewState = createSignaturePreviewState();
        const signatureDragState = createSignatureDragState();
        const signatureGeneratorState = createSignatureGeneratorState();
        const preparedSignatureState = createPreparedSignatureState();

        const supportPaymentDetails = {
            // Pega aquí tus datos reales antes de publicar.
            paypalEmail: 'whs465@gmail.com',
            brebValue: '@whs932',
            brebHolder: 'W**************EZ'
        };

        const localeRuntime = createLocaleRuntime(navigator.languages, navigator.language || 'es');
        const currentLanguage = localeRuntime.language;
        const i18n = localeRuntime.i18n;
        const formatDateValue = localeRuntime.formatDateValue;
        const formatDateTimeValue = localeRuntime.formatDateTimeValue;

        const contractProgress = setupContractProgressFlow({
            i18n,
            formatDateValue,
            formatDateTimeValue,
        });

        function updatePageInfoDisplay(page = 1, total = 1) {
            return i18n(
                'Page {{page}} of {{total}}',
                'Página {{page}} de {{total}}',
                { page: String(page), total: String(total) }
            );
        }

        function updateZoomInfoDisplay(zoomLevel = 1) {
            return `${Math.round(zoomLevel * 100)}%`;
        }

        function translatePageToEnglish() {
            if (currentLanguage !== 'en') return;

            applyEnglishContent({
                hasSignatureImage: activeSignatureState.hasImage,
                signatureSourceFileName: signatureGeneratorState.sourceFile ? signatureGeneratorState.sourceFile.name : null
            });

            updateSignaturePageControls(
                signatureViewerState.currentPage,
                signatureViewerState.totalPages || 1,
                updatePageInfoDisplay
            );
        }

        function updateSignatureGeneratorControlsState() {
            setSignatureGeneratorControlsEnabled(signatureGeneratorState.canAdjustSourceImage);
        }

        function schedulePreparedSignatureRecolor() {
            schedulePreparedSignatureRecolorAction({
                generatorState: signatureGeneratorState,
                preparedState: preparedSignatureState,
                onRecolor: recolorPreparedSignature
            });
        }

        function schedulePreparedSignatureRegenerate(force = false) {
            schedulePreparedSignatureRegenerateAction({
                generatorState: signatureGeneratorState,
                preparedState: preparedSignatureState,
                force,
                onRegenerate: () => generateSignaturePng({ silent: true })
            });
        }

        const signatureGeneratorControls: SignatureGeneratorControlsRuntime = {
            getInputValue,
            getLanguage: () => currentLanguage,
            scheduleRecolor: schedulePreparedSignatureRecolor,
            scheduleRegenerate: () => schedulePreparedSignatureRegenerate()
        };

        function updateSignatureCleanSensitivity(refreshPrepared = true) {
            updateSignatureCleanSensitivityControl(signatureGeneratorControls, refreshPrepared);
        }

        function getSignatureTone(toneValue = getInputValue('signature-tone-range')) {
            return getSelectedSignatureTone(signatureGeneratorControls, toneValue);
        }

        async function recolorPreparedSignature() {
            if (!preparedSignatureState.canvas) return;

            const tone = getSignatureTone();
            const action = await recolorPreparedSignaturePng({
                state: preparedSignatureState,
                color: tone.rgb,
                pngCreationErrorMessage: i18n('The PNG could not be created', 'No se pudo crear el PNG'),
                urls: URL,
                deps: { canvasToPngBlob }
            });

            if (action.status === 'missing-canvas') return;

            renderPreparedSignatureRecolor(action, tone.label, i18n);
        }

        function updateSignatureTone(refreshPrepared = false) {
            updateSignatureToneControl(signatureGeneratorControls, refreshPrepared);
        }

        function getCanvasMetrics() {
            const canvas = getPdfCanvas();
            return {
                canvas,
                width: canvas.width,
                height: canvas.height
            };
        }

        function getPdfPageMetrics() {
            return {
                width: signatureViewerState.pageWidth,
                height: signatureViewerState.pageHeight
            };
        }

        function getSignatureCanvasDimensions(marker) {
            return getSignatureCanvasDimensionsForMetrics(
                marker,
                getCanvasMetrics(),
                getPdfPageMetrics(),
                activeSignatureState.aspectRatio
            );
        }

        function getMarkerCanvasPosition(marker) {
            const { x: canvasX, y: canvasY } = getMarkerCanvasPositionForMetrics(
                marker,
                getCanvasMetrics(),
                getPdfPageMetrics()
            );
            marker.canvasX = canvasX;
            marker.canvasY = canvasY;

            return { x: canvasX, y: canvasY };
        }

        function handleSignatureDrag(event) {
            handleSignatureDragFlow({
                event,
                canvas: getPdfCanvas(),
                pdfPage: getPdfPageMetrics(),
                aspectRatio: activeSignatureState.aspectRatio,
                dragState: signatureDragState,
                markerState: signatureMarkerState,
                getMarkerPdfPositionFromCanvas,
                updateMarkersDisplay
            });
        }

        function stopSignatureDrag() {
            stopSignatureDragFlow({
                dragState: signatureDragState,
                updateMarkersDisplay,
                updateSignatureList,
                bodyStyle: document.body.style
            });
        }

        function resetPdfViewerState() {
            resetSignaturePdfViewer({
                viewerState: signatureViewerState,
                markerState: signatureMarkerState,
                dragState: signatureDragState,
                formatPageInfo: updatePageInfoDisplay,
                formatZoomInfo: updateZoomInfoDisplay,
                updateMarkersDisplay,
                updateSignatureList
            });
            updateSignatureProgressState();
        }

        function restoreStoredSignature() {
            void restoreStoredActiveSignature({
                activeState: activeSignatureState,
                previewState: signaturePreviewState,
                urls: URL,
                i18n,
                loadSignatureAspectRatio,
                updateMarkersDisplay,
                loadStoredSignatureImage: loadStoredSignatureImageFromSlot
            }).then(updateSignatureProgressState);
        }

        async function setSignatureImageFile(file) {
            await setActiveSignatureImageFileFlow(file, {
                activeState: activeSignatureState,
                previewState: signaturePreviewState,
                urls: URL,
                i18n,
                loadSignatureAspectRatio,
                updateMarkersDisplay,
                saveSignatureImageFile: saveSignatureImageFileToSlot,
            });
            updateSignatureProgressState();
            updateSignatureSlotUI();
        }

        function updateSignatureSlotUI() {
            const slot = activeSignatureState.currentSlot;

            // Update tab active state
            const tab1 = document.getElementById('signature-slot-tab-1');
            const tab2 = document.getElementById('signature-slot-tab-2');
            const content1 = document.getElementById('signature-slot-content-1');
            const content2 = document.getElementById('signature-slot-content-2');

            if (tab1 && tab2) {
                tab1.classList.toggle('signature-slot-tab-active', slot === 1);
                tab2.classList.toggle('signature-slot-tab-active', slot === 2);
            }
            if (content1 && content2) {
                content1.style.display = slot === 1 ? '' : 'none';
                content2.style.display = slot === 2 ? '' : 'none';
            }

            // Update slot name labels
            const nameEl1 = document.getElementById('sign-image-name-1');
            const nameEl2 = document.getElementById('sign-image-name-2');

            if (nameEl1) {
                const img1 = loadStoredSignatureImageFromSlot(1);
                nameEl1.textContent = img1?.name ? '(' + img1.name + ')' : '';
            }
            if (nameEl2) {
                const img2 = loadStoredSignatureImageFromSlot(2);
                nameEl2.textContent = img2?.name ? '(' + img2.name + ')' : '';
            }
        }

        function switchSignatureSlot(slot: 1 | 2) {
            void switchActiveSignatureSlot(slot, {
                activeState: activeSignatureState,
                previewState: signaturePreviewState,
                preparedState: preparedSignatureState,
                generatorState: signatureGeneratorState,
                urls: URL,
                i18n,
                loadSignatureAspectRatio,
                updateMarkersDisplay,
                loadStoredSignatureImage: loadStoredSignatureImageFromSlot,
                saveSignatureSlot,
            }).then(() => {
                updateSignatureSlotUI();
                updateSignatureProgressState();
            });
        }

        function updateSignatureProgressState() {
            updateSignatureProgress({
                hasPdf: !!signatureViewerState.file,
                hasSignature: activeSignatureState.hasImage,
                hasMarker: signatureMarkerState.markers.length > 0,
            });
        }

        function resetPreparedSignature() {
            resetPreparedSignatureFlow({
                preparedState: preparedSignatureState,
                generatorState: signatureGeneratorState,
                urls: URL
            });
        }

        async function generateSignaturePng(options: { silent?: boolean } = {}) {
            const silent = !!options.silent;

            if (!signatureGeneratorState.sourceFile) {
                showStatus(
                    i18n('Select a signature photo first', 'Primero selecciona una foto de la firma'),
                    'error'
                );
                return;
            }

            if (signatureGeneratorState.isGenerating) {
                signatureGeneratorState.queueRegeneration();
                return;
            }

            const finishProcessing = setActionBusy(
                'signature-generate-action',
                i18n('Generating...', 'Generando...')
            );
            if (!finishProcessing) return;

            if (!silent) {
                showStatus(i18n('Preparing transparent PNG...', 'Preparando PNG transparente...'), 'processing');
            }

            try {
                const tone = getSignatureTone();
                const action = await generateStoredPreparedSignaturePng({
                    generatorState: signatureGeneratorState,
                    preparedState: preparedSignatureState,
                    urls: URL,
                    sensitivity: getTrimmedInputValue('signature-clean-sensitivity'),
                    trim: getCheckboxValue('signature-auto-trim'),
                    color: tone.rgb,
                    imageLoadErrorMessage: i18n('The image could not be loaded', 'No se pudo cargar la imagen'),
                    noSignatureMessage: i18n(
                        'No signature strokes were detected. Try increasing the cleanup sensitivity.',
                        'No se detectaron trazos de firma. Prueba subir la sensibilidad de limpieza.'
                    ),
                    pngCreationErrorMessage: i18n('The PNG could not be created', 'No se pudo crear el PNG'),
                    prepareSignaturePng,
                    onGenerationStarted: updateSignatureGeneratorControlsState,
                    onGenerationFinished: updateSignatureGeneratorControlsState
                });

                if (action.status === 'missing-source') {
                    showStatus(
                        i18n('Select a signature photo first', 'Primero selecciona una foto de la firma'),
                        'error'
                    );
                    return;
                }

                if (action.status === 'queued' || action.status === 'stale-source') {
                    return;
                }

                renderPreparedSignatureReady(action, tone.label, i18n);

                if (!silent) {
                    showStatus(
                        i18n('Transparent signature PNG generated', 'PNG transparente de firma generado'),
                        'success'
                    );
                }
            } catch (error) {
                console.error(error);
                showStatus(
                    i18n('Error generating PNG: {{message}}', 'Error generando PNG: {{message}}', {
                        message: error.message
                    }),
                    'error'
                );
            } finally {
                finishProcessing();
                if (signatureGeneratorState.consumeQueuedRegeneration()) {
                    schedulePreparedSignatureRegenerate(true);
                }
            }
        }

        function downloadPreparedSignature() {
            downloadPreparedSignatureBlob(preparedSignatureState, saveAs);
        }

        async function usePreparedSignature() {
            await usePreparedSignatureFlow({
                preparedState: preparedSignatureState,
                i18n,
                showStatus,
                setSignatureImageFile
            });
        }

        // ==================== FECHAS Y AVANCE ====================

        // Inicializar fechas al cargar
        function initializeApp() {
            setupPdfToolWorkspace();
            translatePageToEnglish();
            setupScreenshotPolish({ i18n, saveAs });
            updateSignatureCleanSensitivity();
            updateSignatureTone();
            updateSignatureGeneratorControlsState();
            setupSupportLinks({
                details: supportPaymentDetails,
                i18n,
                showStatus
            });

            contractProgress.initFromLocalStorage();

            initFileInputDragDrop();

            // Migrate legacy signature to new slot-based storage
            migrateLegacySignatureToSlot1();

            // Restore the selected slot from storage
            const storedSlot = loadStoredSignatureSlot();
            activeSignatureState.setSlot(storedSlot);

            // Restaurar tamaño de firma guardado
            const tamanoGuardado = loadStoredSignatureSize();
            if (tamanoGuardado) {
                const slider = getInputElement('signature-size');
                slider.value = tamanoGuardado;
                document.getElementById('size-value').textContent = tamanoGuardado + 'px';
            }

            restoreStoredSignature();
            updateSignatureProgressState();
            updateSignatureSlotUI();

            const opacityInput = document.getElementById('watermark-opacity') as HTMLInputElement | null;
            const opacityValue = document.getElementById('watermark-opacity-value');
            opacityInput?.addEventListener('input', () => {
                if (opacityValue) opacityValue.textContent = `${opacityInput.value}%`;
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
        } else {
            initializeApp();
        }

        // calcularAvance, autoCalcularAvance, formatDate moved into contract-progress-flow

        // ==================== FUENTE COMPARTIDA ====================

        setupSourceFileFlow({
            runtime: { sourceFileState, pageOrderState },
            deps: { getPdfPageCountFromArrayBuffer, getPdfPageMetricsFromArrayBuffer },
            i18n,
            onOrderListUpdate: actualizarOrderList,
        });

        // ==================== UNIR PDFs ====================

        async function unirPDFs() {
            await mergePdfFlow({
                files: sourceFileState.files,
                addFileBookmarks: getCheckboxValue('merge-bookmarks'),
                operationDeps: pdfOperationDeps,
                i18n,
                showStatus,
                setActionBusy,
                saveAs
            });
        }

        // ==================== SEPARAR PDF ====================

        async function separarPDF() {
            await splitPdfFlow({
                file: sourceFileState.files[0],
                asZip: getCheckboxValue('split-zip'),
                operationDeps: pdfOperationDeps,
                i18n,
                showStatus,
                setActionBusy,
                saveAs,
                JSZipCtor: JSZip
            });
        }

        // ==================== EXTRAER PÁGINAS ====================

        async function extraerPaginas() {
            await extractPdfFlow({
                file: sourceFileState.files[0],
                pagesText: getTrimmedInputValue('extract-pages'),
                deps: {
                    getPageCountFromArrayBuffer: getPdfPageCountFromArrayBuffer,
                    operationDeps: pdfOperationDeps
                },
                i18n,
                showStatus,
                setActionBusy,
                saveAs
            });
        }

        // ==================== ELIMINAR PÁGINAS ====================

        async function eliminarPaginas() {
            await deletePdfFlow({
                file: sourceFileState.files[0],
                pagesText: getTrimmedInputValue('delete-pages'),
                deps: { getPageCountFromArrayBuffer: getPdfPageCountFromArrayBuffer, operationDeps: pdfOperationDeps },
                i18n,
                showStatus,
                setActionBusy,
                saveAs
            });
        }

        // ==================== ORDENAR PÁGINAS ====================

        function actualizarOrderList() {
            renderOrderPageListWithI18n(
                pageOrderState.pages,
                i18n,
                moverOrderPageAIndice,
            );
        }

        function moverOrderPageAIndice(fromIndex, toIndex) {
            if (pageOrderState.movePage(fromIndex, toIndex)) actualizarOrderList();
        }

        async function ordenarPaginasPdf() {
            await reorderPdfFlow({
                file: sourceFileState.files[0],
                pageIndices: pageOrderState.getOriginalIndexes(),
                deps: { operationDeps: pdfOperationDeps, getPageCountFromArrayBuffer: getPdfPageCountFromArrayBuffer },
                i18n,
                showStatus,
                setActionBusy,
                saveAs
            });
        }

        // ==================== GIRAR PÁGINAS ====================

        async function rotarPaginasPortrait() {
            const modeElement = document.getElementById('rotate-mode') as HTMLSelectElement | null;
            const selectedMode = modeElement?.value;
            const mode = selectedMode === 'left' || selectedMode === 'right' || selectedMode === 'half-turn'
                ? selectedMode
                : 'auto';
            await rotatePdfFlow({
                file: sourceFileState.files[0],
                pagesText: getTrimmedInputValue('rotate-pages'),
                mode,
                deps: { getPageCountFromArrayBuffer: getPdfPageCountFromArrayBuffer, operationDeps: pdfOperationDeps },
                i18n,
                showStatus,
                setActionBusy,
                saveAs
            });
        }

        // ==================== COMPRIMIR, METADATOS Y MARCA DE AGUA ====================

        async function comprimirPDF() {
            const modeElement = document.getElementById('compress-mode') as HTMLSelectElement | null;
            const selectedMode = modeElement?.value;
            const mode: CompressionMode = selectedMode === 'balanced' || selectedMode === 'compact'
                ? selectedMode
                : 'safe';
            await compressPdfFlow({
                file: sourceFileState.files[0],
                mode,
                deps: { loadPdfDocument, buildCompressedPdfFromRenderedPages },
                i18n,
                showStatus,
                setActionBusy,
                saveAs
            });
        }

        async function quitarClavePDF() {
            const passwordInput = document.getElementById('unlock-password') as HTMLInputElement | null;
            const result = await unlockPdfFlow({
                file: sourceFileState.files[0],
                password: passwordInput?.value || '',
                buildUnlockedPdf: buildUnlockedPdfFromRenderedPages,
                i18n,
                showStatus,
                setActionBusy,
                saveAs
            });
            if (result.status === 'success' && passwordInput) passwordInput.value = '';
        }

        const metadataFlowOptions = () => ({
            file: sourceFileState.files[0],
            isCurrentFile: (file: File) => sourceFileState.files[0] === file,
            deps: {
                loadPdfDocument: (buffer: ArrayBuffer, options?: { updateMetadata?: boolean }) => PDFDocument.load(buffer, options)
            },
            i18n,
            showStatus,
            setActionBusy,
            saveAs
        });

        async function verMetadatosPDF() {
            const { saveAs: _saveAs, ...options } = metadataFlowOptions();
            await loadPdfMetadataFlow(options);
        }

        async function guardarMetadatosPDF() {
            await savePdfMetadataFlow(metadataFlowOptions());
        }

        async function borrarMetadatosPDF() {
            await savePdfMetadataFlow(metadataFlowOptions(), true);
        }

        async function agregarMarcaAgua() {
            await watermarkPdfFlow({
                file: sourceFileState.files[0],
                text: getInputValue('watermark-text'),
                pagesText: getTrimmedInputValue('watermark-pages'),
                opacity: Number(getInputValue('watermark-opacity')) / 100,
                fontSize: Number(getInputValue('watermark-size')),
                angle: Number(getInputValue('watermark-angle')),
                deps: {
                    loadPdfDocument: (buffer: ArrayBuffer) => PDFDocument.load(buffer),
                    getPageCountFromArrayBuffer: getPdfPageCountFromArrayBuffer
                },
                i18n,
                showStatus,
                setActionBusy,
                saveAs
            });
        }

        // ==================== FIRMAR PDF ====================

        setupSignatureEventHandlers({
            loadPdf: loadPDF,
            setSignatureImage: async selectedFile => {
                await setSignatureImageFile(selectedFile);
                showStatus(
                    i18n('Signature updated and stored locally', 'Firma actualizada y guardada localmente'),
                    'success'
                );
                autoPlaceSignatureMarker({
                    canvas: getPdfCanvas(),
                    viewerState: signatureViewerState,
                    markerState: signatureMarkerState,
                    activeSignatureState,
                    size: parseInt(getInputValue('signature-size')),
                    updateMarkersDisplay,
                    updateSignatureList,
                });
                updateSignatureProgressState();
            },
            setSignatureSource: async selectedFile => {
            signatureGeneratorState.setSourceFile(selectedFile);
            resetPreparedSignature();
            updateSignatureSourceLabel(selectedFile.name, true);
                await generateSignaturePng();
            },
            handlePointerMove: handleSignatureDrag,
            handlePointerEnd: stopSignatureDrag
        });

        async function loadPDF(file) {
            await loadSignaturePdfFlow({
                file,
                viewerState: signatureViewerState,
                markerState: signatureMarkerState,
                i18n,
                showStatus,
                loadPdfDocument: selectedFile => loadSignaturePdfDocument(selectedFile, pdfjsLib),
                renderPage,
                updateMarkersDisplay,
                updateSignatureList
            });

            autoPlaceSignatureMarker({
                canvas: getPdfCanvas(),
                viewerState: signatureViewerState,
                markerState: signatureMarkerState,
                activeSignatureState,
                size: parseInt(getInputValue('signature-size')),
                updateMarkersDisplay,
                updateSignatureList,
            });
            updateSignatureProgressState();
        }

        async function renderPage(pageNum) {
            await renderSignatureViewerPage({
                viewerState: signatureViewerState,
                pageNumber: pageNum,
                canvas: getPdfCanvas(),
                canvasWrapper: getPdfCanvasWrapper(),
                formatPageInfo: updatePageInfoDisplay,
                updateMarkersDisplay,
                renderPage: renderSignaturePdfPage
            });
        }

        function changePage(delta) {
            changeSignatureViewerPage({
                viewerState: signatureViewerState,
                delta,
                onPageChange: renderPage
            });
        }

        async function goToFirstPage() {
            if (!signatureViewerState.file || signatureViewerState.currentPage <= 1) return;
            const delta = 1 - signatureViewerState.currentPage;
            if (signatureViewerState.movePage(delta) === null) return;
            await renderPage(1);
        }

        async function goToLastPage() {
            if (!signatureViewerState.file || signatureViewerState.currentPage >= signatureViewerState.totalPages) return;
            const delta = signatureViewerState.totalPages - signatureViewerState.currentPage;
            if (signatureViewerState.movePage(delta) === null) return;
            await renderPage(signatureViewerState.totalPages);
        }

        async function zoomOutPdf() {
            if (signatureViewerState.zoomOut() === null) return;
            await renderPage(signatureViewerState.currentPage);
        }

        async function resetPdfZoom() {
            if (!signatureViewerState.file) return;
            const previousZoomLevel = signatureViewerState.zoomLevel;
            signatureViewerState.resetZoom();
            if (previousZoomLevel === signatureViewerState.zoomLevel) return;
            await renderPage(signatureViewerState.currentPage);
        }

        async function zoomInPdf() {
            if (signatureViewerState.zoomIn() === null) return;
            await renderPage(signatureViewerState.currentPage);
        }

        async function handleCanvasClick(event) {
            await handleSignatureCanvasClickFlow({
                event,
                canvas: getPdfCanvas(),
                viewerState: signatureViewerState,
                markerState: signatureMarkerState,
                activeSignatureState,
                size: parseInt(getInputValue('signature-size')),
                i18n,
                showStatus,
                createMarkerFromClick: createSignatureMarkerFromCanvasClick,
                updateMarkersDisplay,
                updateSignatureList
            });
            updateSignatureProgressState();
        }

        function updateMarkersDisplay() {
            renderSignatureMarkerOverlayFlow({
                markerState: signatureMarkerState,
                dragState: signatureDragState,
                viewerState: signatureViewerState,
                container: document.getElementById('signature-markers'),
                getPosition: getMarkerCanvasPosition,
                getDimensions: getSignatureCanvasDimensions,
                imageUrl: signaturePreviewState.objectUrl ?? undefined,
                onStartDrag: index => {
                    signatureDragState.start(index);
                    document.body.style.userSelect = 'none';
                },
                onRemove: index => {
                    removeSignature(index);
                }
            });
        }

        function updateSignatureList() {
            renderSignatureMarkerListFlow({
                markerState: signatureMarkerState,
                list: document.getElementById('signature-list'),
                i18n,
                onRemove: index => {
                    removeSignature(index);
                }
            });
        }

        function removeSignature(index) {
            removeSignatureMarkerFlow({
                markerState: signatureMarkerState,
                index,
                updateMarkersDisplay,
                updateSignatureList
            });
            updateSignatureProgressState();
        }

        function clearMarkers() {
            clearSignatureMarkersFlow(
                signatureMarkerState,
                updateMarkersDisplay,
                updateSignatureList
            );
            updateSignatureProgressState();
        }

        function updateSignatureSize() {
            const size = getInputValue('signature-size');
            updateSignatureSizeValue(size);

            resizeSignatureMarkersFlow(
                signatureMarkerState,
                size,
                saveSignatureSize,
                updateMarkersDisplay
            );
        }

        async function applySignatures() {
            await applySignatureFlow({
                file: signatureViewerState.file,
                imageBytes: activeSignatureState.imageBytes,
                imageType: activeSignatureState.imageType,
                markers: signatureMarkerState.markers,
                applyAllPages: getCheckboxValue('apply-all-pages'),
                deps: { loadPdfDocument },
                i18n,
                showStatus,
                setActionBusy,
                saveAs
            });
        }
    
registerWindowPdfActions({
    unirPDFs,
    separarPDF,
    extraerPaginas,
    eliminarPaginas,
    ordenarPaginasPdf,
    rotarPaginasPortrait,
    comprimirPDF,
    quitarClavePDF,
    verMetadatosPDF,
    guardarMetadatosPDF,
    borrarMetadatosPDF,
    agregarMarcaAgua,
    changePage,
    goToFirstPage,
    goToLastPage,
    zoomOutPdf,
    resetPdfZoom,
    zoomInPdf,
    clearMarkers,
    handleCanvasClick,
    applySignatures,
    generateSignaturePng,
    downloadPreparedSignature,
    usePreparedSignature,
    removeSignature
});

// Exponer al window para los oninput del HTML (sliders de firma)
(window as unknown as Record<string, unknown>).updateSignatureSize = updateSignatureSize;
(window as unknown as Record<string, unknown>).updateSignatureTone = updateSignatureTone;
(window as unknown as Record<string, unknown>).updateSignatureCleanSensitivity = updateSignatureCleanSensitivity;
(window as unknown as Record<string, unknown>).switchSignatureSlot = switchSignatureSlot;
