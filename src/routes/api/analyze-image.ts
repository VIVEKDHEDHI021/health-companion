import { createFileRoute } from "@tanstack/react-router";
import { detectDeviceAndReadings } from "../../frontend/components/smart-scanner/deviceHeuristics";

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

          const visionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY || process.env.VITE_GOOGLE_CLOUD_VISION_API_KEY;
          
          if (visionApiKey) {
            console.log("[analyze-image] Sending request to Google Cloud Vision API...");
            const response = await fetch(
              `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  requests: [
                    {
                      image: {
                        content: base64Data,
                      },
                      features: [
                        {
                          type: "DOCUMENT_TEXT_DETECTION",
                        },
                      ],
                    },
                  ],
                }),
              }
            );

            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`Google Cloud Vision API error: ${errText}`);
            }

            const resJson = await response.json();
            const annotations = resJson.responses?.[0]?.textAnnotations || [];
            const fullText = annotations[0]?.description || "";

            const blocks = annotations.slice(1).map((ann: any) => {
              const vertices = ann.boundingPoly?.vertices || [];
              const x = vertices[0]?.x ?? 0;
              const y = vertices[0]?.y ?? 0;
              const x1 = vertices[1]?.x ?? x;
              const y2 = vertices[2]?.y ?? y;
              return {
                text: ann.description || "",
                confidence: 90,
                x,
                y,
                width: Math.max(0, x1 - x),
                height: Math.max(0, y2 - y),
              };
            });

            // Perform heuristics parsing on the server
            const parsedResult = detectDeviceAndReadings({
              text: fullText,
              blocks,
              source: "Google Cloud Vision"
            });

            if (parsedResult) {
              console.log("[analyze-image] Parsed Google Cloud Vision response successfully:", parsedResult);
              return Response.json({
                deviceType: parsedResult.deviceType,
                data: parsedResult.data,
                confidence: parsedResult.confidence,
              });
            } else {
              throw new Error("Could not detect device and readings from Google Cloud Vision OCR result.");
            }
          }

          const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
          if (!geminiApiKey) {
            return Response.json(
              { error: "No vision API key (Google Cloud Vision or Gemini) configured on the server." },
              { status: 500 }
            );
          }

          console.log("[analyze-image] Sending request to Gemini Vision API...");
          
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
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
