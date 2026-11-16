export const PUBLIC_API_VERSION = 1;

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

const API_VERSION_HEADER = "X-VenueOne-API";

export function apiJson(
  body: unknown,
  options: { status?: number; cache?: string } = {},
): Response {
  const headers = new Headers({ [API_VERSION_HEADER]: String(PUBLIC_API_VERSION) });
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (options.cache) headers.set("Cache-Control", options.cache);
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers,
  });
}

export function apiError(status: number, code: string, message: string): Response {
  return apiJson({ error: { code, message } } satisfies ApiErrorBody, {
    status,
    cache: "no-store",
  });
}
