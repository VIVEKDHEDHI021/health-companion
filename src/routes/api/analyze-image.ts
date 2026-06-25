import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/analyze-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { image } = await request.json();
          if (!image) {
            return Response.json({ error: "Missing image data" }, { status: 400 });
          }

          // Strip base64 headers
          const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

          const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
          if (!apiKey) {
            return Response.json(
              { error: "GEMINI_API_KEY environment variable is not set on the server." },
              { status: 500 }
            );
          }

          console.log("[analyze-image] Sending request to Gemini Vision API...");
          
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: "Analyze this medical device screen image. Identify the device type (one of: 'Blood Glucose Meter', 'Blood Pressure Monitor', 'Pulse Oximeter', 'Thermometer', 'Weight Scale'). Extract the readings, units, and confidence. Return ONLY a JSON object matching this schema: { \"deviceType\": string, \"data\": { \"glucose\"?: number, \"systolic\"?: number, \"diastolic\"?: number, \"pulse\"?: number, \"spo2\"?: number, \"temperature\"?: number, \"weight\"?: number, \"unit\"?: string }, \"confidence\": number }. Do not include any markdown formatting, backticks, or comments.",
                      },
                      {
                        inlineData: {
                          mimeType: "image/jpeg",
                          data: base64Data,
                        },
                      },
                    ],
                  },
                ],
              }),
            }
          );

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error: ${errText}`);
          }

          const resJson = await response.json();
          const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          // Parse JSON out of response
          const cleanText = responseText.replace(/```json|```/g, "").trim();
          const parsedResult = JSON.parse(cleanText);

          console.log("[analyze-image] Parsed response successfully:", parsedResult);
          return Response.json(parsedResult);
        } catch (err: any) {
          console.error("[analyze-image] Error analyzing image:", err);
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
