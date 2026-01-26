import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  try {
    // Get all users from public.auth table
    const { data: publicAuthUsers, error: publicError } = await supabaseAdmin
      .from("auth")
      .select("*")
      .order("email");

    if (publicError) {
      return NextResponse.json(
        { message: publicError.message || "Failed to fetch users" },
        { status: 500 }
      );
    }

    // If we have service role key, enrich with blocked status from Supabase Auth
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && publicAuthUsers) {
      const enrichedUsers = await Promise.all(
        publicAuthUsers.map(async (user: any) => {
          try {
            const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(user.id);
            
            if (authUserData?.user) {
              // Check if user is banned
              const bannedUntil = authUserData.user.banned_until;
              const appMetadata = authUserData.user.app_metadata || {};
              
              // User is blocked if:
              // 1. banned_until exists and is in the future, OR
              // 2. app_metadata.blocked is true (and not expired)
              const now = new Date();
              const isBannedByTime = bannedUntil && new Date(bannedUntil) > now;
              const isBlockedInMetadata = appMetadata.blocked === true;
              
              // Check if blocked_until in metadata is still valid
              const metadataBlockedUntil = appMetadata.blocked_until;
              const isMetadataBlockValid = metadataBlockedUntil && new Date(metadataBlockedUntil) > now;
              
              const isBlocked = isBannedByTime || (isBlockedInMetadata && (isMetadataBlockValid || !metadataBlockedUntil));
              
              // Get blocked_until from app_metadata or banned_until
              let blockedUntil = appMetadata.blocked_until || null;
              if (!blockedUntil && bannedUntil && new Date(bannedUntil) > now) {
                blockedUntil = bannedUntil;
              } else if (blockedUntil && new Date(blockedUntil) <= now) {
                // If blocked_until is in the past, user is no longer blocked
                blockedUntil = null;
              }
              
              return {
                ...user,
                blocked: isBlocked,
                blocked_until: blockedUntil,
              };
            }
          } catch (err) {
            // If we can't fetch from auth, just return the public.auth data
            console.log(`Could not fetch auth data for user ${user.id}:`, err);
          }
          
          // Fallback: use blocked status from public.auth table if available
          return {
            ...user,
            blocked: user.blocked || false,
            blocked_until: user.blocked_until || null,
          };
        })
      );

      return NextResponse.json({
        success: true,
        users: enrichedUsers,
      });
    }

    // Fallback: return public.auth data without enrichment
    return NextResponse.json({
      success: true,
      users: publicAuthUsers || [],
    });
  } catch (error: any) {
    console.error("Error fetching users with status:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

