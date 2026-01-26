import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create admin client for user details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user from auth.users (requires admin access)
    let authUserData = null;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!error && data) {
          authUserData = {
            id: data.user.id,
            email: data.user.email,
            created_at: data.user.created_at,
            last_sign_in_at: data.user.last_sign_in_at,
            email_confirmed_at: data.user.email_confirmed_at,
            phone: data.user.phone,
            confirmed_at: data.user.confirmed_at,
            user_metadata: data.user.user_metadata,
            app_metadata: data.user.app_metadata,
          };
        }
      } catch (err) {
        console.log("Could not fetch from admin API, trying alternative method");
      }
    }

    // Get user from public.auth table
    const { data: publicAuthData, error: publicError } = await supabaseAdmin
      .from("auth")
      .select("*")
      .eq("id", userId)
      .single();

    if (publicError && publicError.code !== "PGRST116") {
      return NextResponse.json(
        { message: publicError.message || "Failed to fetch user data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        publicAuth: publicAuthData,
        authUser: authUserData,
      },
    });
  } catch (error: any) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

