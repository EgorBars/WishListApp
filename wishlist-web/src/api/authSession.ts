let onUnauthorized: (() => void) | null = null;

export function registerAuthClear(handler: () => void): void {
  onUnauthorized = handler;
}

export function notifyUnauthorized(): void {
  onUnauthorized?.();
}
