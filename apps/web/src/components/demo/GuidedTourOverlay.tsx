'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getDemoScenario } from '../../lib/demo/scenarios';
import { runDemoScenarioStep } from '../../lib/demo/engine';
import { stopGuidedTour, setGuidedTourStep, startGuidedTour } from '../../lib/demo/runtime-store';
import { useDemoRuntimeState } from '../../lib/demo/use-demo-runtime';
import { useDemoSelector } from '../../lib/storage/use-demo-state';
import { useTranslation } from '../../lib/i18n/context';

type RectLike = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function GuidedTourOverlay() {
  const runtime = useDemoRuntimeState();
  const locale = useDemoSelector((state) => state.locale);
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [targetRect, setTargetRect] = useState<RectLike | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const executedStepRef = useRef<string | null>(null);

  const scenario = useMemo(() => {
    if (!runtime.tour.active || !runtime.tour.scenarioId) return null;
    return getDemoScenario(runtime.tour.scenarioId);
  }, [runtime.tour.active, runtime.tour.scenarioId]);

  const steps = scenario?.steps ?? [];
  const stepIndex = clamp(runtime.tour.stepIndex, 0, Math.max(steps.length - 1, 0));
  const step = steps[stepIndex] ?? null;

  useEffect(() => {
    if (!runtime.tour.active || !step || !scenario) return;

    const signature = `${scenario.id}:${step.id}:${stepIndex}`;
    if (executedStepRef.current === signature) return;
    executedStepRef.current = signature;

    runDemoScenarioStep(step, {
      locale,
      navigate: (path) => router.push(path)
    });
  }, [locale, router, runtime.tour.active, scenario, step, stepIndex]);

  useEffect(() => {
    if (!runtime.tour.active) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopGuidedTour();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [runtime.tour.active]);

  useEffect(() => {
    if (!runtime.tour.active || !step?.target) {
      setTargetRect(null);
      setTargetMissing(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let currentTarget: HTMLElement | null = null;

    const cleanupCurrentTarget = () => {
      if (currentTarget) {
        currentTarget.classList.remove('demo-tour-target-active');
      }
    };

    const refreshRect = () => {
      if (!currentTarget) return;
      const rect = currentTarget.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    };

    const attachTarget = (element: HTMLElement) => {
      cleanupCurrentTarget();
      currentTarget = element;
      element.classList.add('demo-tour-target-active');
      setTargetMissing(false);
      const isMobileViewport = window.innerWidth <= 900;
      element.scrollIntoView({
        behavior: isMobileViewport ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      refreshRect();
      window.setTimeout(refreshRect, 60);
      window.addEventListener('scroll', refreshRect, true);
      window.addEventListener('resize', refreshRect);
    };

    const detachListeners = () => {
      window.removeEventListener('scroll', refreshRect, true);
      window.removeEventListener('resize', refreshRect);
    };

    let attempts = 0;
    const locateTarget = () => {
      if (cancelled) return;
      const element = document.querySelector(step.target ?? '') as HTMLElement | null;
      if (element) {
        attachTarget(element);
        return;
      }

      attempts += 1;
      if (attempts < 45) {
        timer = setTimeout(locateTarget, 90);
      } else {
        setTargetRect(null);
        setTargetMissing(true);
      }
    };

    locateTarget();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      detachListeners();
      cleanupCurrentTarget();
    };
  }, [pathname, runtime.tour.active, step?.id, step?.target]);

  const progressLabel = `${stepIndex + 1}/${steps.length}`;
  const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight;
  const viewportWidth = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const mobileViewport = viewportWidth <= 900;
  const spotlightRect = useMemo(() => {
    if (!targetRect) return null;

    if (!mobileViewport) {
      return {
        top: Math.max(8, targetRect.top - 8),
        left: Math.max(8, targetRect.left - 8),
        width: targetRect.width + 16,
        height: targetRect.height + 16
      };
    }

    const width = Math.min(viewportWidth - 18, targetRect.width + 16);
    const height = Math.min(Math.round(viewportHeight * 0.33), targetRect.height + 16);
    return {
      top: clamp(targetRect.top, 8, Math.max(8, viewportHeight - height - 84)),
      left: clamp(targetRect.left + (targetRect.width + 16 - width) / 2, 8, Math.max(8, viewportWidth - width - 8)),
      width,
      height
    };
  }, [mobileViewport, targetRect, viewportHeight, viewportWidth]);
  const popoverTop = mobileViewport
    ? targetRect
      ? targetRect.top < viewportHeight * 0.45
        ? clamp(viewportHeight - 240 - 104, 72, Math.max(viewportHeight - 260, 72))
        : 72
      : clamp(viewportHeight - 240 - 104, 72, Math.max(viewportHeight - 260, 72))
    : targetRect
      ? clamp(targetRect.top + targetRect.height + 14, 16, Math.max(viewportHeight - 220, 16))
      : Math.max(viewportHeight / 2 - 120, 20);
  const popoverLeft = mobileViewport
    ? 10
    : targetRect
      ? clamp(targetRect.left, 14, Math.max(viewportWidth - 420, 14))
      : Math.max(viewportWidth / 2 - 200, 12);

  if (!runtime.tour.active || !scenario || !step) return null;

  const handleBack = () => {
    if (stepIndex === 0) return;
    setGuidedTourStep(stepIndex - 1);
  };

  const handleNext = () => {
    if (stepIndex >= steps.length - 1) {
      stopGuidedTour();
      return;
    }
    setGuidedTourStep(stepIndex + 1);
  };

  return (
    <div className="demo-tour-overlay" role="dialog" aria-modal="true" aria-label={t('demo.tour.title')}>
      {spotlightRect ? (
        <div
          className="demo-tour-spotlight"
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`
          }}
          aria-hidden
        />
      ) : (
        <div className="demo-tour-mask" aria-hidden />
      )}

      <div className="demo-tour-popover" style={{ top: popoverTop, left: popoverLeft }}>
        <div className="demo-tour-head">
          <p className="mono">{progressLabel}</p>
          <button type="button" className="wallet-action wallet-action-soft" onClick={() => stopGuidedTour()}>
            {t('demo.tour.skip')}
          </button>
        </div>

        <h3>{t(step.titleKey)}</h3>
        <p>{t(step.bodyKey)}</p>
        {targetMissing ? <p className="demo-tour-warning">{t('demo.tour.target_missing')}</p> : null}

        <div className="demo-tour-actions">
          <button type="button" className="wallet-action wallet-action-soft" onClick={handleBack} disabled={stepIndex === 0}>
            {t('common.back')}
          </button>
          <button type="button" className="wallet-action" onClick={() => startGuidedTour('guided-tour', 0)}>
            {t('demo.tour.restart')}
          </button>
          <button type="button" className="wallet-action wallet-action-primary" onClick={handleNext}>
            {stepIndex >= steps.length - 1 ? t('demo.tour.finish') : t('demo.tour.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
