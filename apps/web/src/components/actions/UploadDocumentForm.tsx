'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { uploadWalletDocument } from '../../lib/client-api';
import { extractDocumentData, type ScanResult } from '../../lib/document-reader';
import { useTranslation } from '../../lib/i18n/context';

type Step = 'type' | 'scan' | 'verify';

type VerifyForm = {
  fullName: string;
  documentNumber: string;
  dateOfBirth: string;
  expiryDate: string;
  nationality: string;
  confidence: number;
};

export function UploadDocumentForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<any>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanBusyRef = useRef(false);
  const lastCandidateRef = useRef<string | null>(null);
  const stableHitsRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('type');
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState('passport');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState(() => t('upload.scan_align'));
  const [verifyForm, setVerifyForm] = useState<VerifyForm>({
    fullName: '',
    documentNumber: '',
    dateOfBirth: '',
    expiryDate: '',
    nationality: '',
    confidence: 0
  });
  const [mounted, setMounted] = useState(false);

  const categoryOptions: Array<{ value: string; label: string }> = [
    { value: 'passport', label: t('doc.passport') },
    { value: 'residence_permit', label: t('doc.residence_permit') },
    { value: 'tax_id', label: t('doc.tax_id') },
    { value: 'company_document', label: t('doc.company_document') }
  ];

  function resetCandidateTracking() {
    lastCandidateRef.current = null;
    stableHitsRef.current = 0;
  }

  function stopScanLoop() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    scanBusyRef.current = false;
  }

  function stopCamera() {
    if (!streamRef.current) return;
    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }
    streamRef.current = null;
  }

  async function ensureWorker() {
    if (workerRef.current) return workerRef.current;

    const { createWorker, PSM } = await import('tesseract.js');
    let worker: any;
    try {
      worker = await createWorker('eng+rus');
    } catch {
      worker = await createWorker('eng');
    }
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1'
    });

    workerRef.current = worker;
    return worker;
  }

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
      }
      return true;
    }

    try {
      setCameraError(null);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch {
      setCameraError(t('upload.camera_unavailable'));
      return false;
    }
  }, [t]);

  function toCandidateKey(result: ScanResult) {
    return [
      result.documentNumber ?? '',
      result.fullName ?? '',
      result.dateOfBirth ?? '',
      result.expiryDate ?? '',
      result.nationality ?? ''
    ].join('|');
  }

  function fillVerifyForm(result: ScanResult) {
    setVerifyForm({
      fullName: result.fullName ?? '',
      documentNumber: result.documentNumber ?? '',
      dateOfBirth: result.dateOfBirth ?? '',
      expiryDate: result.expiryDate ?? '',
      nationality: result.nationality ?? '',
      confidence: result.confidence
    });
  }

  const runScanCycle = useCallback(async () => {
    if (scanBusyRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
    scanBusyRef.current = true;

    try {
      const worker = await ensureWorker();
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        scanBusyRef.current = false;
        return;
      }

      const frameWidth = video.videoWidth || 1280;
      const frameHeight = video.videoHeight || 720;
      const guideWidth = Math.floor(frameWidth * 0.82);
      const guideHeight = Math.floor(frameHeight * 0.54);
      const guideX = Math.floor((frameWidth - guideWidth) / 2);
      const guideY = Math.floor((frameHeight - guideHeight) / 2);

      canvas.width = guideWidth;
      canvas.height = guideHeight;
      context.drawImage(video, guideX, guideY, guideWidth, guideHeight, 0, 0, guideWidth, guideHeight);
      const resultPrimary = await worker.recognize(canvas);

      // Enhance contrast for weak frames and run a second pass.
      const enhancedCanvas = document.createElement('canvas');
      enhancedCanvas.width = guideWidth;
      enhancedCanvas.height = guideHeight;
      const enhancedCtx = enhancedCanvas.getContext('2d');
      if (enhancedCtx) {
        enhancedCtx.drawImage(canvas, 0, 0);
        const imageData = enhancedCtx.getImageData(0, 0, guideWidth, guideHeight);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
          const contrasted = gray > 152 ? 255 : gray * 0.75;
          data[i] = contrasted;
          data[i + 1] = contrasted;
          data[i + 2] = contrasted;
        }
        enhancedCtx.putImageData(imageData, 0, 0);
      }

      const resultEnhanced = enhancedCtx ? await worker.recognize(enhancedCanvas) : null;

      const primaryConfidence = (resultPrimary?.data?.confidence ?? 0) / 100;
      const enhancedConfidence = ((resultEnhanced?.data?.confidence ?? 0) as number) / 100;

      const primaryText = resultPrimary?.data?.text ?? '';
      const enhancedText = resultEnhanced?.data?.text ?? '';

      const primaryParsed = extractDocumentData(primaryText, category, Number(primaryConfidence.toFixed(2)));
      const enhancedParsed = extractDocumentData(enhancedText, category, Number(enhancedConfidence.toFixed(2)));

      const parsed =
        primaryParsed && enhancedParsed
          ? primaryParsed.confidence >= enhancedParsed.confidence
            ? primaryParsed
            : enhancedParsed
          : primaryParsed ?? enhancedParsed;

      const isUsable =
        category === 'passport' || category === 'residence_permit'
          ? Boolean(parsed?.documentNumber && (parsed.dateOfBirth || parsed.expiryDate))
          : Boolean(parsed?.documentNumber);

      if (!parsed || !isUsable) {
        setScanStatus(t('upload.scan_in_progress'));
        scanBusyRef.current = false;
        return;
      }

      const candidateKey = toCandidateKey(parsed);
      if (candidateKey === lastCandidateRef.current) {
        stableHitsRef.current += 1;
      } else {
        lastCandidateRef.current = candidateKey;
        stableHitsRef.current = 1;
      }

      const requiredStableHits = parsed.confidence >= 0.75 ? 1 : 2;

      if (stableHitsRef.current >= requiredStableHits) {
        fillVerifyForm(parsed);
        stopScanLoop();
        stopCamera();
        setStep('verify');
        setScanStatus(t('upload.scan_captured'));
      } else {
        const candidate = parsed.documentNumber ?? parsed.fullName ?? t('upload.document_data_fallback');
        setScanStatus(t('upload.scan_detected', { value: candidate }));
      }
    } catch {
      setScanStatus(t('upload.scan_read_error'));
    } finally {
      scanBusyRef.current = false;
    }
  }, [category, t]);

  async function beginScanStep() {
    setSubmitError(null);
    resetCandidateTracking();
    setCameraError(null);
    setScanStatus(t('upload.scan_initializing'));
    setStep('scan');
  }

  function openModal() {
    setSubmitError(null);
    setCameraError(null);
    setStep('type');
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setStep('type');
    stopScanLoop();
    stopCamera();
    resetCandidateTracking();
  }

  function submitVerifiedData() {
    setSubmitError(null);

    if (!verifyForm.documentNumber) {
      setSubmitError(t('upload.document_number_required'));
      return;
    }

    startTransition(async () => {
      const docNumber = verifyForm.documentNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const safeNumber = docNumber || Date.now().toString();
      const filename = `${category}_${safeNumber}.jpg`;

      const result = await uploadWalletDocument({
        category,
        filename,
        expiryDate: verifyForm.expiryDate || undefined,
        metadata: {
          fullName: verifyForm.fullName || undefined,
          documentNumber: verifyForm.documentNumber || undefined,
          dateOfBirth: verifyForm.dateOfBirth || undefined,
          nationality: verifyForm.nationality || undefined,
          scanConfidence: verifyForm.confidence,
          source: 'camera_ocr'
        }
      });

      if (!result) {
        setSubmitError(t('upload.failed'));
        return;
      }

      closeModal();
      router.refresh();
    });
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isOpen && step === 'scan') {
      const init = async () => {
        const cameraReady = await startCamera();
        if (cancelled || !cameraReady) return;

        setScanStatus(t('upload.scan_in_progress'));
        scanTimerRef.current = window.setInterval(() => {
          void runScanCycle();
        }, 1500);
      };

      void init();
    }

    if (!isOpen || step !== 'scan') {
      stopScanLoop();
    }

    return () => {
      cancelled = true;
      stopScanLoop();
    };
  }, [isOpen, runScanCycle, startCamera, step, t]);

  useEffect(() => {
    return () => {
      stopScanLoop();
      stopCamera();
      if (workerRef.current) {
        void workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const modalBody = (
    <div className="wallet-modal-overlay" role="dialog" aria-modal="true" aria-label={t('upload.aria')}>
      <div className="wallet-modal">
        <div className="wallet-modal-head">
          <h3>
            {step === 'type' ? t('upload.choose_type') : step === 'scan' ? t('upload.scan_document') : t('upload.verify_details')}
          </h3>
          <button type="button" className="wallet-modal-close" onClick={closeModal}>
            {t('common.close')}
          </button>
        </div>

        {step === 'type' ? (
          <div className="wallet-modal-body">
            <p className="wallet-upload-subtitle">{t('upload.select_type_first')}</p>
            <div className="wallet-type-grid">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`wallet-type-btn ${category === option.value ? 'wallet-type-btn-active' : ''}`}
                  onClick={() => setCategory(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button type="button" className="wallet-action wallet-action-primary" onClick={() => void beginScanStep()}>
              {t('upload.start_scan')}
            </button>
          </div>
        ) : null}

        {step === 'scan' ? (
          <div className="wallet-modal-body">
            <div className="wallet-camera-shell">
              <video ref={videoRef} className="wallet-camera-video" muted playsInline />
              <div className="wallet-scan-guide" aria-hidden>
                <div className="wallet-scan-frame">
                  <span>{t('upload.place_inside')}</span>
                </div>
              </div>
            </div>
            <p className="wallet-scan-status">{scanStatus}</p>
            {cameraError ? <p className="wallet-action-error">{cameraError}</p> : null}
            <div className="wallet-camera-actions">
              <button type="button" className="wallet-action wallet-action-soft" onClick={() => setStep('type')}>
                {t('common.back')}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'verify' ? (
          <div className="wallet-modal-body">
            <p className="wallet-upload-subtitle">{t('upload.prefilled_hint')}</p>
            <div className="wallet-verify-grid">
              <input
                className="wallet-field"
                placeholder={t('profile.full_name')}
                value={verifyForm.fullName}
                readOnly
              />
              <input
                className="wallet-field"
                placeholder={t('wallet.drawer_document_number')}
                value={verifyForm.documentNumber}
                readOnly
              />
              <input
                className="wallet-field"
                type="date"
                value={verifyForm.dateOfBirth}
                readOnly
              />
              <input
                className="wallet-field"
                type="date"
                value={verifyForm.expiryDate}
                readOnly
              />
              <input
                className="wallet-field"
                placeholder={t('upload.nationality')}
                value={verifyForm.nationality}
                readOnly
              />
              <div className="wallet-verify-meta">{t('upload.scan_confidence', { value: (verifyForm.confidence * 100).toFixed(0) })}</div>
            </div>
            {submitError ? <p className="wallet-action-error">{submitError}</p> : null}
            <div className="wallet-camera-actions">
              <button type="button" className="wallet-action wallet-action-primary" onClick={submitVerifiedData} disabled={isPending}>
                {isPending ? t('upload.adding_document') : t('upload.confirm_add')}
              </button>
              <button
                type="button"
                className="wallet-action wallet-action-soft"
                onClick={() => {
                  resetCandidateTracking();
                  void beginScanStep();
                }}
              >
                {t('upload.rescan')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" className="wallet-action wallet-action-primary" onClick={openModal}>
        {t('upload.add_new_document')}
      </button>
      {mounted && isOpen ? createPortal(modalBody, document.body) : null}
    </>
  );
}
