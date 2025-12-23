1// EventBus - Centralized pub/sub for game events
// Based on Event Queue pattern from Game Programming Patterns by Robert Nystrom
//
// Replaces callback hell with typed, traceable events.
// All game systems emit events here, all interested parties subscribe.

import type { GameEvent, GameEventType, GameEventPayload } from './types.ts';

type EventHandler<T extends GameEventType> = (event: GameEventPayload<T>) => void;

interface Subscription {
  type: GameEventType;
  handler: EventHandler<GameEventType>;
  once: boolean;
}

class EventBusImpl {
  private subscriptions: Subscription[] = [];
  private debugMode = false;

  // Enable debug logging for all events
  setDebug(enabled: boolean): void {
    this.debugMode = enabled;
  }

  // Subscribe to a specific event type
  on<T extends GameEventType>(
    type: T,
    handler: EventHandler<T>
  ): () => void {
    const subscription: Subscription = {
      type,
      handler: handler as EventHandler<GameEventType>,
      once: false,
    };
    this.subscriptions.push(subscription);

    // Return unsubscribe function
    return () => {
      const index = this.subscriptions.indexOf(subscription);
      if (index > -1) {
        this.subscriptions.splice(index, 1);
      }
    };
  }

  // Subscribe to an event type, but only fire once
  once<T extends GameEventType>(
    type: T,
    handler: EventHandler<T>
  ): void {
    const subscription: Subscription = {
      type,
      handler: handler as EventHandler<GameEventType>,
      once: true,
    };
    this.subscriptions.push(subscription);
  }

  // Emit an event to all subscribers
  emit<T extends GameEvent>(event: T): void {
    if (this.debugMode) {
      console.log('[EventBus]', event.type, event);
    }

    // Process subscriptions, removing one-time handlers after they fire
    const toRemove: Subscription[] = [];

    for (const sub of this.subscriptions) {
      if (sub.type === event.type) {
        sub.handler(event as GameEventPayload<typeof sub.type>);
        if (sub.once) {
          toRemove.push(sub);
        }
      }
    }

    // Clean up one-time handlers
    for (const sub of toRemove) {
      const index = this.subscriptions.indexOf(sub);
      if (index > -1) {
        this.subscriptions.splice(index, 1);
      }
    }
  }

  // Remove all subscriptions (useful for cleanup/testing)
  clear(): void {
    this.subscriptions = [];
  }

  // Get count of subscriptions (useful for debugging)
  get subscriptionCount(): number {
    return this.subscriptions.length;
  }
}

// Singleton instance - all systems share this bus
export const eventBus = new EventBusImpl();

// Export class for testing purposes
export { EventBusImpl };
