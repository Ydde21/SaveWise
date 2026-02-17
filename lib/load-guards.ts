export interface LoadGuardSnapshot {
  loadId: number;
  userIdAtStart: string | null;
}

export function beginLoadGuard(
  activeLoadIdRef: { current: number },
  userIdAtStart: string | null
): LoadGuardSnapshot {
  const loadId = activeLoadIdRef.current + 1;
  activeLoadIdRef.current = loadId;
  return { loadId, userIdAtStart };
}

export function isLoadGuardActive(
  activeLoadIdRef: { current: number },
  currentUserId: string | null,
  snapshot: LoadGuardSnapshot
): boolean {
  return (
    activeLoadIdRef.current === snapshot.loadId &&
    currentUserId === snapshot.userIdAtStart
  );
}
