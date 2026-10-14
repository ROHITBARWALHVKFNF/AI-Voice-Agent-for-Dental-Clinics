import {
  clearAuth,
  getAuthToken,
  getOrganizationId,
  getUserId,
  getUserRole,
} from "./api";

export interface AuthSession {
  token: string;
  organizationId: string;
  userId: string;
  role: string;
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = getAuthToken();
  const organizationId = getOrganizationId();
  const userId = getUserId();
  const role = getUserRole();

  if (!token || !organizationId || !userId || !role) {
    return null;
  }

  return {
    token,
    organizationId,
    userId,
    role,
  };
}

export function isAuthenticated(): boolean {
  return getAuthSession() !== null;
}

export function logout(): void {
  clearAuth();

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}