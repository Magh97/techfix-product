import type { LoginResponse, Usuario } from "./types";

export const SESSION_EXPIRED_EVENT = "ts:session-expired";

export function saveSession(s: LoginResponse) {
  localStorage.setItem("ts_token", s.token);
  localStorage.setItem("ts_refresh", s.refreshToken);
  localStorage.setItem("ts_user", JSON.stringify(s.usuario));
}

export function setTokens(token: string, refreshToken: string) {
  localStorage.setItem("ts_token", token);
  localStorage.setItem("ts_refresh", refreshToken);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("ts_refresh");
}

export function clearSession() {
  localStorage.removeItem("ts_token");
  localStorage.removeItem("ts_refresh");
  localStorage.removeItem("ts_user");
}

export function notifySessionExpired() {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export function getSessionUser(): Usuario | null {
  const raw = localStorage.getItem("ts_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}
