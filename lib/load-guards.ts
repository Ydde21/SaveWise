export interface LoadGuardSnapshot {
  loadId: number;
  userIdAtStart: string | null;
}

type LoadIdStore = { current: number };
type ScopedLoadIdStore<Key extends string> = { current: Record<Key, number> };

export function beginLoadGuard(
  activeLoadIdRef: LoadIdStore,
  userIdAtStart: string | null
): LoadGuardSnapshot {
  const loadId = activeLoadIdRef.current + 1;
  activeLoadIdRef.current = loadId;
  return { loadId, userIdAtStart };
}

export function isLoadGuardActive(
  activeLoadIdRef: LoadIdStore,
  currentUserId: string | null,
  snapshot: LoadGuardSnapshot
): boolean {
  return (
    activeLoadIdRef.current === snapshot.loadId &&
    currentUserId === snapshot.userIdAtStart
  );
}

export function beginScopedLoadGuard<Key extends string>(
  activeLoadIdByScopeRef: ScopedLoadIdStore<Key>,
  scope: Key,
  userIdAtStart: string | null
): LoadGuardSnapshot {
  const currentScopeLoadId = activeLoadIdByScopeRef.current[scope] ?? 0;
  const loadId = currentScopeLoadId + 1;
  activeLoadIdByScopeRef.current[scope] = loadId;
  return { loadId, userIdAtStart };
}

export function isScopedLoadGuardActive<Key extends string>(
  activeLoadIdByScopeRef: ScopedLoadIdStore<Key>,
  scope: Key,
  currentUserId: string | null,
  snapshot: LoadGuardSnapshot
): boolean {
  return (
    (activeLoadIdByScopeRef.current[scope] ?? 0) === snapshot.loadId &&
    currentUserId === snapshot.userIdAtStart
  );
}
