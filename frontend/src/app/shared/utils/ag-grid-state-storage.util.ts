export function loadAgGridStateFromStorage(storageKey: string): any | undefined {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return undefined;
    }

    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function saveAgGridStateToStorage(storageKey: string, api: any): void {
  if (!api?.getState) {
    return;
  }

  try {
    const currentState = api.getState();
    localStorage.setItem(storageKey, JSON.stringify(currentState));
  } catch {
    // Ignore storage write failures (private mode/storage quota).
  }
}

export function hasAgGridStateInStorage(storageKey: string): boolean {
  try {
    return !!localStorage.getItem(storageKey);
  } catch {
    return false;
  }
}

export function clearAgGridStateFromStorage(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage access failures.
  }
}
