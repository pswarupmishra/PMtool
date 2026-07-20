const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function apiError(response: Response) {
  let detail = `API request failed: ${response.status}`;
  try {
    const payload = await response.json();
    if (typeof payload.detail === "string") {
      detail = payload.detail;
    }
  } catch {
    // Keep the status-based fallback when the response is not JSON.
  }
  return new Error(detail);
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw await apiError(response);
  }

  return response.json() as Promise<T>;
}

export async function apiSend<T>(path: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await apiError(response);
  }

  return response.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, { method: "DELETE" });

  if (!response.ok) {
    throw await apiError(response);
  }
}
