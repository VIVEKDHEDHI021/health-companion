import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/db/client.server';

export const Route = createFileRoute('/api/admin/reset-password')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // --- STEP 1: Verify Authorization securely on the server ---
          // Check for a secure admin API key header to prevent unauthorized access.
          // We check if the custom header matches our server-side service role key.
          const authKey = request.headers.get('x-admin-api-key');
          const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          if (!expectedKey) {
            return Response.json(
              { error: 'Server configuration error: Admin key is not configured.' },
              { status: 500 }
            );
          }

          if (!authKey || authKey !== expectedKey) {
            return Response.json(
              { error: 'Unauthorized: Invalid or missing admin API key.' },
              { status: 401 }
            );
          }

          // --- STEP 2: Parse Request Body ---
          const { userId, newPassword } = await request.json();

          if (!userId || !newPassword) {
            return Response.json(
              { error: 'Bad Request: Both userId and newPassword are required.' },
              { status: 400 }
            );
          }

          // --- STEP 3: Invoke supabase.auth.admin.updateUserById() to reset password ---
          // Using supabaseAdmin (configured with the service role key) bypasses RLS securely on the server.
          const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword,
          });

          // --- STEP 4: Handle Success/Error Responses ---
          if (error) {
            return Response.json(
              { error: `Supabase Admin Error: ${error.message}` },
              { status: error.status || 500 }
            );
          }

          return Response.json({
            success: true,
            message: 'User password updated successfully.',
            user: {
              email: data.user.email,
              updatedAt: data.user.updated_at,
            },
          });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : 'Internal Server Error' },
            { status: 500 }
          );
        }
      },
    },
  },
});
