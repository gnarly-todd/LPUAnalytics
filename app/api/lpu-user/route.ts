import { fetchLpuUser, LpuRateLimitError } from "../../lpu-request";

// Browser owner checks use this same-origin route because LPU restricts API CORS.
// Only an explicit public user ID is accepted; no arbitrary URL proxying.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("userId") ?? "";
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(id))
    return Response.json({ message: "Enter a valid LPU user ID." }, { status: 400 });
  try {
    const response = await fetchLpuUser(id);
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof LpuRateLimitError)
      return Response.json(
        { message: error.message, retryAt: error.retryAt },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(Math.max(1, Math.ceil((error.retryAt - Date.now()) / 1000))),
          },
        },
      );
    return Response.json(
      { message: "LPU’s profile service could not be reached. Saved results remain available." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
