import { NextResponse } from "next/server";

export function ok(data: Record<string, unknown> = {}, message?: string) {
  return NextResponse.json({ success: true, ...(message ? { message } : {}), ...data });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function int(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Converts known domain errors to a 400 and logs the rest. */
export function handleError(err: unknown, known: Array<new (...a: never[]) => Error> = []) {
  if (known.some((K) => err instanceof K)) return fail((err as Error).message);
  console.error(err);
  return fail("خطای داخلی سرور.", 500);
}
