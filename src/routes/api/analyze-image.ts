import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analyze-image")({
  server: {
    handlers: {
      POST: async () => {
        return Response.json(
          { error: "Smart Scanner feature is disabled." },
          { status: 403 }
        );
      },
    },
  },
});
