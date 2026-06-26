import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/db/client.server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging, type SendResponse } from "firebase-admin/messaging";

// Initialize Firebase Admin SDK if not already initialized
let adminInitialized = false;
if (getApps().length === 0) {
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountVar) {
    try {
      const serviceAccount = JSON.parse(serviceAccountVar);
      initializeApp({
        credential: cert(serviceAccount),
      });
      adminInitialized = true;
      console.log("[Firebase Admin] Initialized successfully via service account JSON.");
    } catch (err) {
      console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", err);
    }
  } else {
    console.warn(
      "[Firebase Admin] Warning: FIREBASE_SERVICE_ACCOUNT environment variable is not defined. Background push notifications cannot be sent.",
    );
  }
} else {
  adminInitialized = true;
}

export const Route = createFileRoute("/api/send-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { userId, title, body } = await request.json();

          if (!userId || !title || !body) {
            return Response.json(
              { error: "Bad Request: userId, title, and body are required." },
              { status: 400 },
            );
          }

          // 1. Fetch all push tokens for this user
          const { data: tokensData, error: tokensError } = await supabaseAdmin
            .from("push_tokens")
            .select("token")
            .eq("user_id", userId);

          if (tokensError) {
            console.error("[send-push] Error fetching tokens from database:", tokensError);
            return Response.json({ error: tokensError.message }, { status: 500 });
          }

          const tokens = tokensData?.map((t) => t.token).filter(Boolean) || [];

          if (tokens.length === 0) {
            console.log(`[send-push] No registered push tokens found for user ${userId}.`);
            return Response.json({
              success: true,
              message: "No push tokens registered for this user.",
              tokensCount: 0,
            });
          }

          // 2. Send push notifications via FCM if Admin SDK is ready
          if (!adminInitialized) {
            console.warn("[send-push] Firebase Admin not initialized, simulating background push.");
            return Response.json({
              success: true,
              message: "Firebase Admin is not configured, but tokens are stored in the database.",
              tokensCount: tokens.length,
              simulated: true,
            });
          }

          console.log(
            `[send-push] Sending background push notifications to ${tokens.length} tokens for user ${userId}...`,
          );

          const messagePayload = {
            notification: {
              title,
              body,
            },
            webpush: {
              headers: {
                Urgency: "high",
              },
              notification: {
                title,
                body,
                icon: "/logo.png",
              },
            },
          };

          const response = await getMessaging().sendEachForMulticast({
            tokens,
            ...messagePayload,
          });

          console.log(
            `[send-push] Push notification results. Success: ${response.successCount}, Failure: ${response.failureCount}`,
          );

          // Clean up invalid/expired tokens from the database if they failed
          if (response.failureCount > 0) {
            const tokensToDelete: string[] = [];
            response.responses.forEach((res: SendResponse, index: number) => {
              if (!res.success && res.error) {
                // If token is invalid or unregistered, queue it for deletion
                const errCode = res.error.code;
                if (
                  errCode === "messaging/invalid-argument" ||
                  errCode === "messaging/registration-token-not-registered"
                ) {
                  tokensToDelete.push(tokens[index]);
                }
              }
            });

            if (tokensToDelete.length > 0) {
              console.log(
                `[send-push] Cleaning up ${tokensToDelete.length} invalid/expired tokens...`,
              );
              await supabaseAdmin
                .from("push_tokens")
                .delete()
                .eq("user_id", userId)
                .in("token", tokensToDelete);
            }
          }

          return Response.json({
            success: true,
            sentCount: response.successCount,
            failureCount: response.failureCount,
            tokensCount: tokens.length,
          });
        } catch (e) {
          console.error("[send-push] Uncaught error in route handler:", e);
          return Response.json(
            { error: e instanceof Error ? e.message : "Internal Server Error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
