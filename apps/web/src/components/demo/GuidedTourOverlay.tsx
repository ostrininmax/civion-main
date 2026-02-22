'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getDemoScenario } from '../../lib/demo/scenarios';
import { runDemoScenarioStep } from '../../lib/demo/engine';
import { stopGuidedTour, setGuidedTourStep, startGuidedTour } from '../../lib/demo/runtime-store';
import { useDemoRuntimeState } from '../../lib/demo/use-demo-runtime';
import { useDemoSelector } from '../../lib/storage/use-demo-state';
import type { LocaleCode } from '../../lib/models/types';
import { normalizeLocale, t as translate } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';

type RectLike = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ViewportMetrics = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
  bottomInset: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function overlapAmount(startA: number, endA: number, startB: number, endB: number) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function overlapArea(rectA: RectLike, rectB: RectLike) {
  return (
    overlapAmount(rectA.left, rectA.left + rectA.width, rectB.left, rectB.left + rectB.width) *
    overlapAmount(rectA.top, rectA.top + rectA.height, rectB.top, rectB.top + rectB.height)
  );
}

function getViewportMetrics(): ViewportMetrics {
  if (typeof window === 'undefined') {
    return {
      width: 1440,
      height: 900,
      offsetTop: 0,
      offsetLeft: 0,
      bottomInset: 0
    };
  }

  const vv = window.visualViewport;
  if (!vv) {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetTop: 0,
      offsetLeft: 0,
      bottomInset: 0
    };
  }

  return {
    width: vv.width,
    height: vv.height,
    offsetTop: vv.offsetTop,
    offsetLeft: vv.offsetLeft,
    bottomInset: Math.max(0, window.innerHeight - (vv.offsetTop + vv.height))
  };
}

function isRenderableTarget(element: HTMLElement | null): element is HTMLElement {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  const rect = element.getBoundingClientRect();
  return rect.width >= 8 && rect.height >= 8;
}

export function GuidedTourOverlay() {
  const runtime = useDemoRuntimeState();
  const locale = useDemoSelector((state) => state.locale);
  const { locale: appLocale } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [targetRect, setTargetRect] = useState<RectLike | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [popoverHeight, setPopoverHeight] = useState(228);
  const [, setViewportVersion] = useState(0);
  const executedStepRef = useRef<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const scenario = useMemo(() => {
    if (!runtime.tour.active || !runtime.tour.scenarioId) return null;
    return getDemoScenario(runtime.tour.scenarioId);
  }, [runtime.tour.active, runtime.tour.scenarioId]);

  const steps = scenario?.steps ?? [];
  const stepIndex = clamp(runtime.tour.stepIndex, 0, Math.max(steps.length - 1, 0));
  const step = steps[stepIndex] ?? null;
  const textLocale = useMemo<LocaleCode>(() => {
    if (!runtime.tour.active) return appLocale;
    if (step?.id === 'tour-language') return 'en';
    return normalizeLocale(appLocale);
  }, [appLocale, runtime.tour.active, step?.id]);
  const tt = (key: string) => translate(textLocale, key);

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
    if (!runtime.tour.active) return;

    const refreshViewport = () => {
      setViewportVersion((value) => value + 1);
    };

    const vv = window.visualViewport;
    window.addEventListener('resize', refreshViewport);
    vv?.addEventListener('resize', refreshViewport);
    vv?.addEventListener('scroll', refreshViewport);
    return () => {
      window.removeEventListener('resize', refreshViewport);
      vv?.removeEventListener('resize', refreshViewport);
      vv?.removeEventListener('scroll', refreshViewport);
    };
  }, [runtime.tour.active]);

  useEffect(() => {
    if (!runtime.tour.active || !popoverRef.current) return;

    const popoverElement = popoverRef.current;
    const measure = () => {
      const nextHeight = Math.round(popoverElement.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setPopoverHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
      }
    };

    measure();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            measure();
          })
        : null;

    observer?.observe(popoverElement);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
    };
  }, [runtime.tour.active, step?.id, targetRect]);

  useEffect(() => {
    if (!runtime.tour.active || !step?.target) {
      setTargetRect(null);
      setTargetMissing(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let currentTarget: HTMLElement | null = null;

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
      currentTarget = element;
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
      if (isRenderableTarget(element)) {
        attachTarget(element);
        return;
      }

      attempts += 1;
      if (attempts < 60) {
        timer = setTimeout(locateTarget, 110);
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
      currentTarget = null;
    };
  }, [pathname, runtime.tour.active, step?.id, step?.target]);

  const progressLabel = `${stepIndex + 1}/${steps.length}`;
  const viewport = getViewportMetrics();
  const viewportHeight = viewport.height;
  const viewportWidth = viewport.width;
  const mobileViewport = viewportWidth <= 900;
  const spotlightRect = useMemo(() => {
    if (!targetRect) return null;
    const languageStep = step?.id === 'tour-language';
    const desktopPadding = languageStep ? 4 : 8;
    const mobilePadding = languageStep ? 6 : 18;

    if (!mobileViewport) {
      const maxWidth = Math.max(140, Math.round(viewportWidth * 0.9));
      const maxHeight = Math.max(90, Math.round(viewportHeight * 0.62));
      const width = Math.min(targetRect.width + desktopPadding * 2, maxWidth);
      const height = Math.min(targetRect.height + desktopPadding * 2, maxHeight);
      const minTop = viewport.offsetTop + 8;
      const maxTop = viewport.offsetTop + viewportHeight - height - 8;
      const minLeft = viewport.offsetLeft + 8;
      const maxLeft = viewport.offsetLeft + viewportWidth - width - 8;
      const centeredTop = targetRect.top + targetRect.height / 2 - height / 2;
      const centeredLeft = targetRect.left + targetRect.width / 2 - width / 2;
      return {
        top: clamp(centeredTop, minTop, Math.max(minTop, maxTop)),
        left: clamp(centeredLeft, minLeft, Math.max(minLeft, maxLeft)),
        width,
        height
      };
    }

    const maxWidth = Math.max(84, viewportWidth - 16);
    const maxHeight = Math.max(72, Math.round(viewportHeight * 0.46));
    const width = clamp(targetRect.width + mobilePadding, Math.min(120, maxWidth), maxWidth);
    const height = clamp(targetRect.height + mobilePadding, Math.min(58, maxHeight), maxHeight);
    const minTop = viewport.offsetTop + 8;
    const maxTop = viewport.offsetTop + viewportHeight - height - 8;
    const minLeft = viewport.offsetLeft + 8;
    const maxLeft = viewport.offsetLeft + viewportWidth - width - 8;
    const centeredTop = targetRect.top + targetRect.height / 2 - height / 2;
    const centeredLeft = targetRect.left + targetRect.width / 2 - width / 2;
    return {
      top: clamp(centeredTop, minTop, Math.max(minTop, maxTop)),
      left: clamp(centeredLeft, minLeft, Math.max(minLeft, maxLeft)),
      width,
      height
    };
  }, [mobileViewport, step?.id, targetRect, viewport.offsetLeft, viewport.offsetTop, viewportHeight, viewportWidth]);

  const resolvedPopoverHeight = Math.max(164, popoverHeight);
  const popoverWidth = mobileViewport ? Math.min(440, viewportWidth - 20) : Math.min(380, viewportWidth - 24);
  const popoverPosition = useMemo(() => {
    const horizontalPadding = mobileViewport ? 10 : 14;
    const minLeft = viewport.offsetLeft + horizontalPadding;
    const maxLeft = Math.max(minLeft, viewport.offsetLeft + viewportWidth - popoverWidth - horizontalPadding);
    const minTop = viewport.offsetTop + (mobileViewport ? 10 : 14);
    const maxTop = Math.max(
      minTop,
      viewport.offsetTop + viewportHeight - resolvedPopoverHeight - (mobileViewport ? viewport.bottomInset + 84 : 14)
    );

    const evaluate = (rawTop: number, rawLeft: number, bias = 0) => {
      const top = clamp(rawTop, minTop, maxTop);
      const left = clamp(rawLeft, minLeft, maxLeft);
      const cardRect: RectLike = {
        top,
        left,
        width: popoverWidth,
        height: resolvedPopoverHeight
      };
      const overlap = spotlightRect ? overlapArea(cardRect, spotlightRect) : 0;
      const clampPenalty = Math.abs(rawTop - top) + Math.abs(rawLeft - left);
      return { top, left, score: overlap * 2 + clampPenalty + bias };
    };

    if (!spotlightRect) {
      return mobileViewport
        ? evaluate(maxTop, minLeft)
        : evaluate(viewport.offsetTop + viewportHeight / 2 - resolvedPopoverHeight / 2, viewport.offsetLeft + viewportWidth / 2 - popoverWidth / 2);
    }

    if (mobileViewport) {
      const targetMid = spotlightRect.top + spotlightRect.height / 2;
      const viewportMid = viewport.offsetTop + viewportHeight / 2;
      const preferBottom = targetMid < viewportMid;

      const topCandidate = evaluate(minTop, minLeft, preferBottom ? 8 : 2);
      const bottomCandidate = evaluate(maxTop, minLeft, preferBottom ? 2 : 8);
      const middleCandidate = evaluate(viewport.offsetTop + viewportHeight / 2 - resolvedPopoverHeight / 2, minLeft, 12);

      const bestMobile = [topCandidate, bottomCandidate, middleCandidate].sort((a, b) => a.score - b.score)[0];
      return { top: bestMobile.top, left: bestMobile.left };
    }

    const centerX = spotlightRect.left + spotlightRect.width / 2;
    const centerY = spotlightRect.top + spotlightRect.height / 2;
    const gap = 16;

    const rightCandidate = evaluate(centerY - resolvedPopoverHeight / 2, spotlightRect.left + spotlightRect.width + gap);
    const leftCandidate = evaluate(centerY - resolvedPopoverHeight / 2, spotlightRect.left - popoverWidth - gap);
    const belowCandidate = evaluate(spotlightRect.top + spotlightRect.height + gap, centerX - popoverWidth / 2);
    const aboveCandidate = evaluate(spotlightRect.top - resolvedPopoverHeight - gap, centerX - popoverWidth / 2);

    const bestDesktop = [rightCandidate, leftCandidate, belowCandidate, aboveCandidate].sort((a, b) => a.score - b.score)[0];
    return { top: bestDesktop.top, left: bestDesktop.left };
  }, [
    mobileViewport,
    popoverWidth,
    resolvedPopoverHeight,
    spotlightRect,
    viewport.bottomInset,
    viewport.offsetLeft,
    viewport.offsetTop,
    viewportHeight,
    viewportWidth
  ]);

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
    <div className="demo-tour-overlay" role="dialog" aria-modal="true" aria-label={tt('demo.tour.title')}>
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

      <div className="demo-tour-popover" style={{ top: popoverPosition.top, left: popoverPosition.left, width: popoverWidth }} ref={popoverRef}>
        <div className="demo-tour-head">
          <p className="mono">{progressLabel}</p>
          <button type="button" className="wallet-action wallet-action-soft demo-tour-btn-skip" onClick={() => stopGuidedTour()}>
            {tt('demo.tour.skip')}
          </button>
        </div>

        <h3>{tt(step.titleKey)}</h3>
        <p>{tt(step.bodyKey)}</p>
        {targetMissing ? <p className="demo-tour-warning">{tt('demo.tour.target_missing')}</p> : null}

        <div className="demo-tour-actions">
          <button
            type="button"
            className="wallet-action wallet-action-soft demo-tour-btn-back"
            onClick={handleBack}
            disabled={stepIndex === 0}
          >
            {tt('common.back')}
          </button>
          <button type="button" className="wallet-action demo-tour-btn-restart" onClick={() => startGuidedTour('guided-tour', 0)}>
            {tt('demo.tour.restart')}
          </button>
          <button type="button" className="wallet-action wallet-action-primary demo-tour-btn-next" onClick={handleNext}>
            {stepIndex >= steps.length - 1 ? tt('demo.tour.finish') : tt('demo.tour.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
