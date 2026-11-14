export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  };
  // A lost response may already have committed. Retry the exact action once.
  let response: Response;
  try {
    response = await fetch(`/api${path}`, init);
  } catch {
    try {
      response = await fetch(`/api${path}`, init);
    } catch {
      throw new Error(
        "서버에 연결할 수 없습니다. 연결을 확인하고 다시 시도하세요.",
      );
    }
  }
  const data = await response
    .json()
    .catch(() => ({ error: "서버 응답을 읽을 수 없습니다." }));
  if (!response.ok)
    throw new ApiError(response.status, data.error ?? "요청에 실패했습니다.");
  return data;
}
