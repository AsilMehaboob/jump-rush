import { useSyncExternalStore } from 'react';
import { controller } from '../app/GameController';
import type { AppSnapshot } from '../app/AppStore';

export function useAppState(): AppSnapshot {
  return useSyncExternalStore(controller.store.subscribe, controller.store.getSnapshot);
}
