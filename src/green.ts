// Green Letter System
// Rare letter that triggers fever mode when captured

export interface GreenLetter {
  wordIndex: number;
  charIndex: number;
}

// Active green letter (deterministic position, set by tutorial)
let activeGreen: GreenLetter | null = null;

// Callback for when green is captured
let onCaptureCallback: (() => void) | null = null;

export function setOnGreenCapture(callback: () => void): void {
  onCaptureCallback = callback;
}

export function setGreenLetterPosition(wordIndex: number, charIndex: number): void {
  activeGreen = { wordIndex, charIndex };
}

export function getActiveGreen(): GreenLetter | null {
  return activeGreen;
}

export function isGreenPosition(wordIndex: number, charIndex: number): boolean {
  if (!activeGreen) return false;
  return activeGreen.wordIndex === wordIndex && activeGreen.charIndex === charIndex;
}

export function captureGreen(): void {
  if (!activeGreen) return;

  activeGreen = null;

  if (onCaptureCallback) {
    onCaptureCallback();
  }
}

export function resetGreen(): void {
  activeGreen = null;
}
