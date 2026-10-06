import type { PlayerAction } from '../vision/types';

export interface GameOverPayload { score: number; distance: number; coins: number }

/** Events flowing between the controller (React/vision side) and the Phaser scene. */
export interface BusEvents {
  action: PlayerAction;
  'scene:attract': undefined;
  'scene:prepare': undefined;
  'scene:start': undefined;
  'scene:pause': undefined;
  'scene:resume': undefined;
  'game:over': GameOverPayload;
  'game:best': number;
}

type Handler<T> = (payload: T) => void;

export class EventBus<E extends object> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) { set = new Set(); this.handlers.set(event, set); }
    set.add(handler as Handler<never>);
    return () => { set.delete(handler as Handler<never>); };
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    this.handlers.get(event)?.forEach((h) => (h as Handler<E[K]>)(payload));
  }
}

export const bus = new EventBus<BusEvents>();
