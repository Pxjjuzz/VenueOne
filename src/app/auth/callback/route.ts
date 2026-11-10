import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { syncSupabaseProfile } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/navigation";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/dashboard");

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=unconfigured", request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=callback", request.url),
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth code exchange failed", error.message);
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=callback", request.url),
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await syncSupabaseProfile(user);
    }

    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error("Auth callback failed", error);
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=callback", request.url),
    );
  }
}
