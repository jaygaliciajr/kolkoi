type Listener = (active: boolean) => void;

let active = false;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener(active);
  }
}

export function startRouteProgress() {
  if (active) return;
  active = true;
  emit();
}

export function stopRouteProgress() {
  if (!active) return;
  active = false;
  emit();
}

export function subscribeRouteProgress(listener: Listener) {
  listeners.add(listener);
  listener(active);
  return () => {
    listeners.delete(listener);
  };
}
