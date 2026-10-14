export const API_URL = "http://127.0.0.1:8000";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("dental_ai_token");
}

export function getOrganizationId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("dental_ai_organization_id");
}

export function getUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("dental_ai_user_id");
}

export function getUserRole(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("dental_ai_role");
}

export function clearAuth(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("dental_ai_token");
  localStorage.removeItem("dental_ai_organization_id");
  localStorage.removeItem("dental_ai_user_id");
  localStorage.removeItem("dental_ai_role");
}

type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
};

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);

  if (!headers.has("Content-Type") && fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!skipAuth) {
    const token = getAuthToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && !skipAuth) {
    clearAuth();
  }

  return response;
}

export async function apiJson<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const response = await apiFetch(path, options);

  const contentType = response.headers.get("content-type") || "";

  let data: unknown = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let message = "Something went wrong.";

    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data
    ) {
      const detail = (data as { detail?: unknown }).detail;

      if (typeof detail === "string") {
        message = detail;
      } else {
        message = JSON.stringify(detail);
      }
    }

    throw new Error(message);
  }

  return data as T;
}