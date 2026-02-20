'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createInitialDemoState } from '../mockData/demo-seed';
import type { DemoState } from '../models/types';
import { getDemoState, subscribeDemoState } from './demo-store';

const serverSnapshot = createInitialDemoState();

export function useDemoState() {
  return useSyncExternalStore(subscribeDemoState, getDemoState, () => serverSnapshot);
}

type Selector<T> = (state: DemoState) => T;
type Equality<T> = (prev: T, next: T) => boolean;

export function useDemoSelector<T>(selector: Selector<T>, isEqual: Equality<T> = Object.is) {
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);
  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  const [selected, setSelected] = useState<T>(() => selector(getDemoState()));

  useEffect(() => {
    const compute = () => selectorRef.current(getDemoState());
    const unsubscribe = subscribeDemoState(() => {
      const next = compute();
      setSelected((prev) => (isEqualRef.current(prev, next) ? prev : next));
    });

    const immediate = compute();
    setSelected((prev) => (isEqualRef.current(prev, immediate) ? prev : immediate));

    return unsubscribe;
  }, []);

  return selected;
}
