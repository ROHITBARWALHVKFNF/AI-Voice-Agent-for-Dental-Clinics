
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dental_ai_token");
}

export function getOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dental_ai_organization_id");
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dental_ai_user_id");
}

export function getUserRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dental_ai_role");
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;

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
  const { skipAuth = false, ...fetchOptions } = options;

  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(fetchOptions.headers);

  const isFormData =
    typeof FormData !== "undefined" &&
    fetchOptions.body instanceof FormData;

  // Let the browser set the multipart boundary for file uploads.
  if (isFormData) {
    headers.delete("Content-Type");
  } else if (
    fetchOptions.body != null &&
    !headers.has("Content-Type")
  ) {
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

  let response: Response;

  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown network error";

    throw new Error(
      `Cannot reach the API at ${url}. Check that the backend is running, ` +
        `the URL is reachable from this browser, and CORS allows this frontend origin. ` +
        `Details: ${reason}`
    );
  }

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

  let data: unknown;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let message = `Request failed with HTTP ${response.status}.`;

    if (typeof data === "object" && data !== null && "detail" in data) {
      const detail = (data as { detail?: unknown }).detail;

      if (typeof detail === "string") {
        message = detail;
      } else if (detail != null) {
        message = JSON.stringify(detail);
      }
    } else if (typeof data === "string" && data.trim()) {
      message = data;
    }

    throw new Error(message);
  }

  return data as T;
}
