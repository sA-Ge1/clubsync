import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { userId, blocked, duration } = await req.json();

    if (!userId || typeof blocked !== "boolean") {
      return NextResponse.json(
        { message: "User ID and blocked status are required" },
        { status: 400 }
      );
    }

    // Convert duration to hours format for Supabase ban_duration
    // Duration can be: "1h", "24h", "168h" (1 week), "720h" (1 month), "permanent", or number of hours
    let banDuration = "0"; // 0 means not banned
    let blockedUntil: string | null = null;
    
    if (blocked) {
      if (duration === "permanent" || !duration) {
        banDuration = "876000h"; // ~100 years (effectively permanent)
        blockedUntil = null; // null means permanent
      } else if (typeof duration === "string" && duration.endsWith("h")) {
        banDuration = duration;
        const hours = parseInt(duration.replace("h", ""));
        blockedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      } else if (typeof duration === "number") {
        banDuration = `${duration}h`;
        blockedUntil = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();
      } else {
        // Parse duration strings like "1d", "1w", "1m"
        const durationMap: Record<string, number> = {
          "1h": 1,
          "24h": 24,
          "168h": 168, // 1 week
          "720h": 720, // ~1 month (30 days)
        };
        const hours = durationMap[duration] || 876000;
        banDuration = `${hours}h`;
        if (hours < 876000) {
          blockedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        }
      }
    }

    // Update blocked status in public.auth table
    // First check if blocked column exists, if not we'll add it via migration
    // For now, we'll use a metadata field or add a blocked column
    const updateData: any = { blocked: blocked };
    if (blockedUntil !== null) {
      updateData.blocked_until = blockedUntil;
    } else if (!blocked) {
      updateData.blocked_until = null;
    }
    
    const { error: updateError } = await supabaseAdmin
      .from("auth")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      // If column doesn't exist, try using app_metadata
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (userData && userData.user) {
            const appMetadata: any = {
              ...(userData.user.app_metadata || {}),
              blocked: blocked,
            };
            if (blockedUntil !== null) {
              appMetadata.blocked_until = blockedUntil;
            } else if (!blocked) {
              appMetadata.blocked_until = null;
            }
            
            const { error: adminError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
              app_metadata: appMetadata,
            });
            if (adminError) throw adminError;
          } else {
            return NextResponse.json(
              { message: "User not found" },
              { status: 404 }
            );
          }
        } catch (adminErr: any) {
          return NextResponse.json(
            { message: adminErr.message || "Failed to block/unblock user" },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { message: "Failed to update blocked status. Column may not exist." },
          { status: 500 }
        );
      }
    }

    // Also ban/unban user in Supabase Auth if service role key is available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: banDuration,
        });
      } catch (banError) {
        // Non-critical, log but don't fail
        console.log("Could not update ban status:", banError);
      }
    }

    return NextResponse.json({
      success: true,
      message: blocked ? "User blocked successfully" : "User unblocked successfully",
    });
  } catch (error: any) {
    console.error("Error blocking/unblocking user:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

