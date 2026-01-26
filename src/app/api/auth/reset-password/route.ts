import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create client for password reset
// Use service role key if available, otherwise use anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists in public.auth table
    const { data: authUser, error: authError } = await supabaseClient
      .from("auth")
      .select("id, email")
      .eq("email", email)
      .single();

    if (authError || !authUser) {
      return NextResponse.json(
        { message: "User not found in system" },
        { status: 404 }
      );
    }

    // Try to use admin API if service role key is available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { error: adminError } = await supabaseClient.auth.admin.generateLink({
          type: "recovery",
          email: email,
        });

        if (!adminError) {
          return NextResponse.json({
            success: true,
            message: "Password reset email sent successfully",
          });
        }
      } catch (adminErr) {
        // Fall through to public API
        console.log("Admin API not available, using public API");
      }
    }

    // Fallback: Use public API (requires user to exist in auth.users)
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"}/auth/callback?source=reset`;
    
    const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (resetError) {
      console.error("Password reset error:", resetError);
      return NextResponse.json(
        { message: resetError.message || "Failed to send password reset email. User may need to sign up first." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error: any) {
    console.error("Error in reset password route:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

