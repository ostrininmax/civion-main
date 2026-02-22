'use client';

import { forwardRef } from 'react';

export type TourCardProps = {
  title: string;
  body: string;
  secondary?: string;
  progressLabel: string;
  nextLabel: string;
  finishLabel: string;
  backLabel: string;
  skipLabel: string;
  restartLabel: string;
  targetMissingLabel?: string;
  isFinalStep: boolean;
  canSkip: boolean;
  canBack: boolean;
  busy?: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onRestart: () => void;
  onReplay: () => void;
  onGoDocuments: () => void;
  onGoCivicCard: () => void;
  onStartService: () => void;
  onClose: () => void;
  goDocumentsLabel: string;
  openCivicCardLabel: string;
  startServiceLabel: string;
  replayLabel: string;
  closeLabel: string;
};

export const TourCard = forwardRef<HTMLDivElement, TourCardProps>(function TourCard(props, ref) {
  return (
    <div
      ref={ref}
      className={`onboarding-tour-card ${props.isFinalStep ? 'onboarding-tour-card-finish' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={props.title}
      tabIndex={-1}
    >
      <div className="onboarding-tour-card-head">
        <p className="mono">{props.progressLabel}</p>
        {props.canSkip ? (
          <button
            type="button"
            className="wallet-action wallet-action-soft"
            onClick={props.onSkip}
            aria-label={props.skipLabel}
          >
            {props.skipLabel}
          </button>
        ) : null}
      </div>

      <h3>{props.title}</h3>
      <p>{props.body}</p>
      {props.secondary ? <p className="onboarding-tour-secondary">{props.secondary}</p> : null}
      {props.targetMissingLabel ? <p className="onboarding-tour-warning">{props.targetMissingLabel}</p> : null}

      <div className="onboarding-tour-actions">
        <button
          type="button"
          className="wallet-action wallet-action-soft"
          onClick={props.onBack}
          disabled={!props.canBack || props.busy}
          aria-label={props.backLabel}
        >
          {props.backLabel}
        </button>
        <button
          type="button"
          className="wallet-action"
          onClick={props.onRestart}
          disabled={props.busy}
          aria-label={props.restartLabel}
        >
          {props.restartLabel}
        </button>
        <button
          type="button"
          className="wallet-action wallet-action-primary"
          onClick={props.onNext}
          disabled={props.busy}
          aria-label={props.isFinalStep ? props.finishLabel : props.nextLabel}
        >
          {props.isFinalStep ? props.finishLabel : props.nextLabel}
        </button>
      </div>

      {props.isFinalStep ? (
        <div className="onboarding-tour-cta-row">
          <button type="button" className="wallet-action" onClick={props.onGoDocuments}>
            {props.goDocumentsLabel}
          </button>
          <button type="button" className="wallet-action" onClick={props.onGoCivicCard}>
            {props.openCivicCardLabel}
          </button>
          <button type="button" className="wallet-action" onClick={props.onStartService}>
            {props.startServiceLabel}
          </button>
          <button type="button" className="wallet-action wallet-action-soft" onClick={props.onReplay}>
            {props.replayLabel}
          </button>
          <button type="button" className="wallet-action wallet-action-soft" onClick={props.onClose}>
            {props.closeLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
});
