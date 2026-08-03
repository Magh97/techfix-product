import type { LoginResponse, Usuario } from "./types";

export function saveSession(s: LoginResponse) {
  localStorage.setItem("ts_token", s.token);
  localStorage.setItem("ts_refresh", s.refreshToken);
  localStorage.setItem("ts_user", JSON.stringify(s.usuario));
}

export function clearSession() {
  localStorage.removeItem("ts_token");
  localStorage.removeItem("ts_refresh");
  localStorage.removeItem("ts_user");
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
