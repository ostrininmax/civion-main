'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { LocaleCode } from '../../lib/models/types';
import { onboardingTourSteps } from '../../lib/onboarding/tourSteps';
import {
  ONBOARDING_COMMAND_EVENT,
  type OnboardingCommandDetail,
  clearOnboardingProgress,
  createOnboardingActionContext,
  getElementRect,
  logOnboardingEvent,
  readOnboardingMeta,
  readOnboardingProgress,
  routeMatches,
  saveOnboardingProgress,
  setOnboardingCompleted,
  shouldSuppressAutoOnboarding,
  sleep,
  smoothScrollToElement,
  waitForRoute,
  waitForSelector,
  type TourPlacement
} from '../../lib/onboarding/tourEngine';
import { t as translate, ti as translateWithVars } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';
import { TourCard } from './TourCard';

type RectLike = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

type PlacementPosition = {
  top: number;
  left: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeIndex(index: number, total: number) {
  if (total <= 0) return 0;
  return clamp(index, 0, total - 1);
}

function resolvePlacement(rect: RectLike | null, placement: TourPlacement, width: number, height: number): PlacementPosition {
  const viewportWidth = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight;
  const isMobileViewport = viewportWidth <= 900;
  const safeWidth = Math.min(width, viewportWidth - 20);
  const safeHeight = Math.min(height, viewportHeight - 20);
  const margin = 14;

  if (isMobileViewport) {
    const topSafe = 74;
    const bottomSafe = 132;
    const shouldPlaceBottom = Boolean(rect && rect.top < viewportHeight * 0.42);

    return {
      top: shouldPlaceBottom
        ? clamp(viewportHeight - safeHeight - bottomSafe, topSafe, Math.max(topSafe, viewportHeight - safeHeight - 12))
        : topSafe,
      left: 10
    };
  }

  if (!rect) {
    return {
      top: clamp(viewportHeight * 0.5 - safeHeight * 0.5, 10, Math.max(10, viewportHeight - safeHeight - 10)),
      left: clamp(viewportWidth * 0.5 - safeWidth * 0.5, 10, Math.max(10, viewportWidth - safeWidth - 10))
    };
  }

  let resolved = placement;
  if (placement === 'auto') {
    if (rect.bottom + safeHeight + margin <= viewportHeight) {
      resolved = 'bottom';
    } else if (rect.top - safeHeight - margin >= 0) {
      resolved = 'top';
    } else if (rect.right + safeWidth + margin <= viewportWidth) {
      resolved = 'right';
    } else {
      resolved = 'left';
    }
  }

  let top = rect.bottom + margin;
  let left = rect.left;

  if (resolved === 'top') {
    top = rect.top - safeHeight - margin;
    left = rect.left;
  } else if (resolved === 'right') {
    top = rect.top;
    left = rect.right + margin;
  } else if (resolved === 'left') {
    top = rect.top;
    left = rect.left - safeWidth - margin;
  }

  return {
    top: clamp(top, 10, Math.max(10, viewportHeight - safeHeight - 10)),
    left: clamp(left, 10, Math.max(10, viewportWidth - safeWidth - 10))
  };
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function TourOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale: appLocale } = useTranslation();

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectLike | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasAutoCheckedRef = useRef(false);
  const runCounterRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const detachTargetRef = useRef<() => void>(() => undefined);

  const steps = onboardingTourSteps;
  const safeStepIndex = normalizeIndex(stepIndex, steps.length);
  const step = active ? steps[safeStepIndex] : null;

  const detachTarget = useCallback(() => {
    detachTargetRef.current();
    detachTargetRef.current = () => undefined;

    if (activeTargetRef.current) {
      activeTargetRef.current.classList.remove('onboarding-target-active');
      activeTargetRef.current = null;
    }

    setTargetRect(null);
  }, []);

  const attachTarget = useCallback(
    (target: HTMLElement | null) => {
      detachTarget();

      if (!target) return;

      const updateRect = () => {
        if (!target.isConnected) return;
        setTargetRect(getElementRect(target));
      };

      target.classList.add('onboarding-target-active');
      activeTargetRef.current = target;
      updateRect();

      const onScroll = () => updateRect();
      const onResize = () => updateRect();

      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onResize);

      detachTargetRef.current = () => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onResize);
      };
    },
    [detachTarget]
  );

  const completeTour = useCallback(
    (targetHref?: string) => {
      const currentStep = steps[safeStepIndex];
      clearOnboardingProgress();
      setOnboardingCompleted(true);
      setActive(false);
      setBusy(false);
      setTargetMissing(false);
      detachTarget();

      logOnboardingEvent({
        type: 'tour_finished',
        stepId: currentStep?.id,
        stepIndex: safeStepIndex
      });

      if (targetHref) {
        router.push(targetHref);
      }
    },
    [detachTarget, router, safeStepIndex, steps]
  );

  const pauseTour = useCallback(() => {
    const currentStep = steps[safeStepIndex];
    saveOnboardingProgress(safeStepIndex);
    setActive(false);
    setBusy(false);
    setTargetMissing(false);
    detachTarget();

    logOnboardingEvent({
      type: 'tour_skipped',
      stepId: currentStep?.id,
      stepIndex: safeStepIndex
    });
  }, [detachTarget, safeStepIndex, steps]);

  const startTour = useCallback(
    (startAt: number, source: 'auto' | 'manual' | 'resume', resetCompleted = false) => {
      const normalizedIndex = normalizeIndex(startAt, steps.length);
      const currentStep = steps[normalizedIndex];
      const context = createOnboardingActionContext();
      context.ensureDemoData();

      if (resetCompleted) {
        setOnboardingCompleted(false);
        clearOnboardingProgress();
      }

      setTargetMissing(false);
      setActive(true);
      setStepIndex(normalizedIndex);
      setBusy(false);
      saveOnboardingProgress(normalizedIndex);

      logOnboardingEvent({
        type: 'tour_started',
        stepId: currentStep?.id,
        stepIndex: normalizedIndex,
        source
      });
    },
    [steps]
  );

  const handleBack = useCallback(() => {
    if (safeStepIndex <= 0) return;
    const previousIndex = safeStepIndex - 1;
    setStepIndex(previousIndex);
    saveOnboardingProgress(previousIndex);
  }, [safeStepIndex]);

  const handleNext = useCallback(async () => {
    if (!step || busy) return;

    const context = createOnboardingActionContext();
    if (step.actionAfter) {
      await step.actionAfter(context);
    }

    logOnboardingEvent({
      type: 'tour_step_completed',
      stepId: step.id,
      stepIndex: safeStepIndex
    });

    if (safeStepIndex >= steps.length - 1) {
      completeTour();
      return;
    }

    const nextIndex = safeStepIndex + 1;
    setStepIndex(nextIndex);
    saveOnboardingProgress(nextIndex);
  }, [busy, completeTour, safeStepIndex, step, steps.length]);

  useEffect(() => {
    const onCommand = (event: Event) => {
      const detail = (event as CustomEvent<OnboardingCommandDetail>).detail;
      if (!detail?.mode) return;

      if (detail.mode === 'resume') {
        const resumeIndex = readOnboardingProgress() ?? 0;
        startTour(resumeIndex, 'resume');
        return;
      }

      if (detail.mode === 'restart') {
        startTour(0, 'manual', true);
        return;
      }

      startTour(0, 'manual', true);
    };

    window.addEventListener(ONBOARDING_COMMAND_EVENT, onCommand as EventListener);
    return () => {
      window.removeEventListener(ONBOARDING_COMMAND_EVENT, onCommand as EventListener);
    };
  }, [startTour]);

  useEffect(() => {
    if (shouldSuppressAutoOnboarding(pathname)) return;
    if (hasAutoCheckedRef.current) return;

    hasAutoCheckedRef.current = true;
    const meta = readOnboardingMeta();

    if (meta.completed || meta.canResume) return;

    startTour(0, 'auto');
  }, [pathname, startTour]);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        pauseTour();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleBack();
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        void handleNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [active, handleBack, handleNext, pauseTour]);

  useEffect(() => {
    if (!active || !step) return;

    let cancelled = false;
    const runId = ++runCounterRef.current;

    const runStep = async () => {
      setBusy(true);
      setTargetMissing(false);

      const context = createOnboardingActionContext();
      context.ensureDemoData();

      if (step.actionBefore) {
        await step.actionBefore(context);
      }

      if (cancelled || runId !== runCounterRef.current) return;

      if (!routeMatches(step.route, window.location.pathname, window.location.search)) {
        router.push(step.route);
      }

      await waitForRoute(step.route);

      if (cancelled || runId !== runCounterRef.current) return;

      const waitSelector = step.waitForSelector ?? step.target;
      if (waitSelector) {
        await waitForSelector(waitSelector, 8000);
      }

      if (cancelled || runId !== runCounterRef.current) return;

      const target = step.target ? (document.querySelector(step.target) as HTMLElement | null) : null;

      if (target) {
        smoothScrollToElement(target);
        await sleep(window.innerWidth <= 900 ? 80 : 200);
        if (cancelled || runId !== runCounterRef.current) return;
        attachTarget(target);
      } else {
        attachTarget(null);
        setTargetMissing(Boolean(step.target));
      }

      setBusy(false);
    };

    void runStep();

    return () => {
      cancelled = true;
      setBusy(false);
    };
  }, [active, attachTarget, pathname, router, step]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      cardRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active, safeStepIndex, targetRect]);

  useEffect(() => () => detachTarget(), [detachTarget]);

  const hideSpotlightOnMobile = useMemo(() => {
    if (!targetRect || typeof window === 'undefined') return false;
    if (window.innerWidth > 900) return false;
    return false;
  }, [targetRect]);

  const spotlightRect = useMemo(() => {
    if (!targetRect) return null;
    if (typeof window === 'undefined' || window.innerWidth > 900) {
      return {
        top: Math.max(8, targetRect.top - 8),
        left: Math.max(8, targetRect.left - 8),
        width: targetRect.width + 16,
        height: targetRect.height + 16
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = viewportWidth - 24;
    const maxHeight = Math.min(196, Math.round(viewportHeight * 0.32));
    const baseWidth = Math.min(targetRect.width + 16, maxWidth);
    const baseHeight = Math.min(targetRect.height + 16, maxHeight);
    const focusTop = clamp(targetRect.top + 8, 8, Math.max(8, viewportHeight - baseHeight - 84));
    const focusLeft = clamp(targetRect.left + (targetRect.width + 16 - baseWidth) / 2, 8, Math.max(8, viewportWidth - baseWidth - 8));

    return {
      top: focusTop,
      left: focusLeft,
      width: baseWidth,
      height: baseHeight
    };
  }, [targetRect]);

  const overlayPosition = useMemo(() => {
    const cardWidth = 400;
    const cardHeight = step?.id === 'finish' ? 310 : 250;
    return resolvePlacement(targetRect, step?.placement ?? 'auto', cardWidth, cardHeight);
  }, [step?.id, step?.placement, targetRect]);

  if (!active || !step) {
    return null;
  }

  const stepLocale: LocaleCode = step.id === 'language-picker' ? 'en' : appLocale;
  const tt = (key: string, fallback?: string) => translate(stepLocale, key, fallback);
  const tti = (key: string, vars: Record<string, string | number>, fallback?: string) =>
    translateWithVars(stepLocale, key, vars, fallback);

  const progressLabel = tti('onboarding.progress', { current: safeStepIndex + 1, total: steps.length });

  return (
    <div className="onboarding-overlay" aria-live="polite">
      {targetRect && spotlightRect && !hideSpotlightOnMobile ? (
        <div
          className="onboarding-spotlight"
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`
          }}
          aria-hidden
        />
      ) : (
        <div className="onboarding-mask" aria-hidden />
      )}

      <div
        className="onboarding-card-wrap"
        style={{ top: `${overlayPosition.top}px`, left: `${overlayPosition.left}px` }}
      >
        <TourCard
          ref={cardRef}
          title={tt(step.titleKey)}
          body={tt(step.bodyKey)}
          progressLabel={progressLabel}
          nextLabel={tt('onboarding.next')}
          finishLabel={tt('onboarding.finish')}
          backLabel={tt('common.back')}
          skipLabel={tt('onboarding.skip')}
          restartLabel={tt('onboarding.restart')}
          targetMissingLabel={targetMissing ? tt('onboarding.target_missing') : undefined}
          isFinalStep={step.id === 'finish'}
          canSkip={step.canSkip !== false}
          canBack={safeStepIndex > 0}
          busy={busy}
          onBack={handleBack}
          onNext={() => {
            void handleNext();
          }}
          onSkip={pauseTour}
          onRestart={() => startTour(0, 'manual', true)}
          onGoDocuments={() => completeTour('/wallet')}
          onGoCivicCard={() => completeTour('/civic-card')}
          onClose={() => completeTour()}
          goDocumentsLabel={tt('onboarding.go_documents')}
          openCivicCardLabel={tt('onboarding.open_civic_card')}
          closeLabel={tt('onboarding.close_tour')}
        />
      </div>
    </div>
  );
}
