// Command exports and InputSystem registration

export { TypeCharacterCommand, createTypeCharacterCommand } from './TypeCharacterCommand.ts';
export { BackspaceCommand, createBackspaceCommand } from './BackspaceCommand.ts';
export { OptionBackspaceCommand, createOptionBackspaceCommand } from './OptionBackspaceCommand.ts';
export { SpaceCommand, createSpaceCommand } from './SpaceCommand.ts';

import { inputSystem } from '../InputSystem.ts';
import { createTypeCharacterCommand } from './TypeCharacterCommand.ts';
import { createBackspaceCommand } from './BackspaceCommand.ts';
import { createOptionBackspaceCommand } from './OptionBackspaceCommand.ts';
import { createSpaceCommand } from './SpaceCommand.ts';

// Register all command factories with InputSystem
// Order matters: more specific patterns first
export function registerCommands(): void {
  // Option+Backspace before regular Backspace
  inputSystem.register(createOptionBackspaceCommand);
  inputSystem.register(createBackspaceCommand);
  inputSystem.register(createSpaceCommand);
  inputSystem.register(createTypeCharacterCommand);
}
