import { createServerFn } from "@tanstack/react-start";

export interface ReceiptItem {
  item: string;
  quantity: number;
  price: number;
  category?: string;
  confidence?: number;
}

export interface ReceiptData {
  items: ReceiptItem[];
  total: number | null;
  date: string | null;
  storeName: string | null;
  rawText: string;
  currency: string;
}

export const extractReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: { imageBase64: string; mimeType: string }) => {
    if (!input.imageBase64 || !input.mimeType) {
      throw new Error("imageBase64 and mimeType are required");
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(input.mimeType)) {
      throw new Error("Only JPEG, PNG, and WebP images are supported");
    }
    if (input.imageBase64.length > 20_000_000) {
      throw new Error("Image too large (max ~15MB)");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a receipt OCR and data extraction specialist. You will be given an image of a receipt. Your job is to:

1. Read all text from the receipt (OCR)
2. Extract structured data: item names, quantities, prices
3. Identify the total amount, date, store name, and currency
4. Categorize items (food, beverage, grocery, household, other)
5. Assign a confidence score (0.0-1.0) to each extracted field

Return a JSON object with this exact structure:
{
  "items": [
    { "item": "Item Name", "quantity": 1, "price": 9.99, "category": "food", "confidence": 0.95 }
  ],
  "total": 29.97,
  "date": "2024-01-15",
  "storeName": "Store Name",
  "rawText": "The full OCR text from the receipt",
  "currency": "USD"
}

Rules:
- If quantity is not specified, assume 1
- Prices should be numbers (no currency symbols)
- If total is not found, sum the items
- Date should be ISO format (YYYY-MM-DD) or null
- rawText should contain ALL text you can read from the receipt
- Handle common OCR issues: 0 vs O, 1 vs l, etc.
- Ignore non-item lines like "Thank you", "Visit again", footers, headers
- Categories: food, beverage, grocery, household, health, other`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all structured data from this receipt image." },
              {
                type: "image_url",
                image_url: {
                  url: `data:${data.mimeType};base64,${data.imageBase64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt_data",
              description: "Extract structured receipt data from OCR text",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        quantity: { type: "number" },
                        price: { type: "number" },
                        category: { type: "string", enum: ["food", "beverage", "grocery", "household", "health", "other"] },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                      },
                      required: ["item", "quantity", "price"],
                      additionalProperties: false,
                    },
                  },
                  total: { type: "number" },
                  date: { type: "string" },
                  storeName: { type: "string" },
                  rawText: { type: "string" },
                  currency: { type: "string" },
                },
                required: ["items", "rawText"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limited. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add funds.");
      }
      const text = await response.text();
      console.error("AI Gateway error:", response.status, text);
      throw new Error("Failed to process receipt. Please try again.");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      // Fallback: try to parse from content
      const content = result.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ReceiptData;
        }
      } catch {
        // ignore
      }
      throw new Error("Could not extract receipt data from the image.");
    }

    const parsed = JSON.parse(toolCall.function.arguments) as ReceiptData;

    // Ensure total is calculated if not provided
    if (!parsed.total && parsed.items.length > 0) {
      parsed.total = parsed.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    return parsed;
  });
