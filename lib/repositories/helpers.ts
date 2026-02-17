export function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export function requireData<T>(data: T | null, error: unknown): T {
  if (error) {
    throw error;
  }
  if (data === null) {
    throw new Error("No data returned from Supabase.");
  }
  return data;
}

export function getPaginationRange(input?: {
  limit?: number;
  offset?: number;
}) {
  const limit = Math.max(1, Math.min(input?.limit ?? 100, 500));
  const offset = Math.max(0, input?.offset ?? 0);
  return {
    from: offset,
    to: offset + limit - 1,
  };
}
