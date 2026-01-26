import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // Delete from public.auth table (this will cascade to auth.users if foreign key is set)
    const { error: deleteError } = await supabaseAdmin
      .from("auth")
      .delete()
      .eq("id", userId);

    if (deleteError) {
      // If deletion from public.auth fails, try deleting from auth.users directly
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { error: adminError } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (adminError) throw adminError;
        } catch (adminErr: any) {
          return NextResponse.json(
            { message: adminErr.message || "Failed to delete user" },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { message: deleteError.message || "Failed to delete user" },
          { status: 500 }
        );
      }
    } else {
      // Also delete from auth.users if service role key is available
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch (adminErr) {
          // Non-critical if already deleted via cascade
          console.log("User may have been deleted via cascade:", adminErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

