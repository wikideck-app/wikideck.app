import { cookies } from "next/headers";
import type { MeResponse } from "@wikideck/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function getCurrentUser() {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, { headers: { cookie }, cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as MeResponse).user;
  } catch {
    return null;
  }
}

export async function apiGet<T>(path: string): Promise<T | null> {
  const cookie = (await cookies()).toString();
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: { cookie }, cache: "no-store" });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
