export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// FastAPI returns `detail` as a string, or as a list of field errors on validation failures
function errorMessage(detail: unknown): string {
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item?.msg === "string" ? item.msg.replace(/^Value error, /, "") : null))
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  return "Request failed";
}

export async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(errorMessage((err as { detail?: unknown }).detail), res.status);
  }
  if (res.status === 204) return null as unknown as T;
  return res.json() as Promise<T>;
}