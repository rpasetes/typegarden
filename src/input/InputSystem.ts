// InputSystem - Command Pattern for keyboard input
// Based on Game Programming Patterns by Robert Nystrom
//
// Instead of a monolithic handleKeydown with nested conditionals,
// each input action is encapsulated as a Command object.

import { eventBus } from '../core/EventBus.ts';
import type { TypingState } from '../typing.ts';

// Command interface - all input commands implement this
export interface InputCommand {
  execute(state: TypingState): void;
}

// Command registry - maps keys to commands
type CommandFactory = (key: string, event: KeyboardEvent) => InputCommand | null;

export class InputSystem {
  private commandFactories: CommandFactory[] = [];
  private enabled = true;

  // Register a command factory
  register(factory: CommandFactory): void {
    this.commandFactories.push(factory);
  }

  // Process a keyboard event and return the appropriate command
  getCommand(event: KeyboardEvent): InputCommand | null {
    if (!this.enabled) return null;

    const key = event.key;

    // Try each factory until one returns a command
    for (const factory of this.commandFactories) {
      const command = factory(key, event);
      if (command) return command;
    }

    return null;
  }

  // Enable/disable input processing
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // Check if input is enabled
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const inputSystem = new InputSystem();
