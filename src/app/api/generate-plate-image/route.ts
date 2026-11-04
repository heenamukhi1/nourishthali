import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/utils/supabase/client";
import {
  generateImageWithGemini,
  uploadGeneratedImageToSupabase,
} from "@/utils/gemini/imageGenerator";

interface GeneratePlateRequest {
  slot?: "brunch" | "dinner";
  protein: string;
  fiber: string;
  carb: string;
  chutney: string;
  apiKey?: string;
}

function buildCustomThaliSvgDataUrl({
  protein,
  fiber,
  carb,
  chutney,
}: GeneratePlateRequest): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 670 360" width="670" height="360">
    <defs>
      <radialGradient id="woodBg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#3D2B1F"/>
        <stop offset="100%" stop-color="#1E140E"/>
      </radialGradient>
      <radialGradient id="thaliRim" cx="45%" cy="45%" r="55%">
        <stop offset="0%" stop-color="#F6F1E7"/>
        <stop offset="85%" stop-color="#E5DAC8"/>
        <stop offset="100%" stop-color="#C2B299"/>
      </radialGradient>
      <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.45"/>
      </filter>
    </defs>

    <!-- Rustic Dark Wood Table Surface -->
    <rect width="670" height="360" fill="url(#woodBg)"/>
    <line x1="0" y1="72" x2="670" y2="72" stroke="#2A1C13" stroke-width="2" opacity="0.6"/>
    <line x1="0" y1="180" x2="670" y2="180" stroke="#2A1C13" stroke-width="2" opacity="0.6"/>
    <line x1="0" y1="288" x2="670" y2="288" stroke="#2A1C13" stroke-width="2" opacity="0.6"/>

    <!-- AI Generated Badge -->
    <rect x="18" y="16" width="168" height="28" rx="14" fill="#1E3528" opacity="0.9"/>
    <text x="102" y="34" text-anchor="middle" fill="#FAF4E8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="0.5">✨ GEMINI AI THALI RENDER</text>

    <!-- Main Ceramic & Brass Thali Plate -->
    <circle cx="335" cy="182" r="158" fill="url(#thaliRim)" filter="url(#dropShadow)" stroke="#B89F7D" stroke-width="4"/>
    <circle cx="335" cy="182" r="144" fill="#EFE7D8" stroke="#D5C7B2" stroke-width="1.5"/>

    <!-- 1. Protein Base Katori (Top-Left) -->
    <g filter="url(#dropShadow)">
      <circle cx="268" cy="130" r="52" fill="#D8CBB8" stroke="#8C7A65" stroke-width="3"/>
      <circle cx="268" cy="130" r="46" fill="#2A5C38"/>
      <!-- Tofu / Paneer Cubes -->
      <rect x="248" y="110" width="14" height="14" rx="3" fill="#F7E7C4" transform="rotate(10 255 117)"/>
      <rect x="270" y="114" width="14" height="14" rx="3" fill="#F7E7C4" transform="rotate(-12 277 121)"/>
      <rect x="254" y="132" width="14" height="14" rx="3" fill="#F7E7C4" transform="rotate(-6 261 139)"/>
      <rect x="276" y="134" width="13" height="13" rx="3" fill="#F7E7C4" transform="rotate(15 282 140)"/>
    </g>

    <!-- 2. Fiber & Sabzi Katori (Top-Right) -->
    <g filter="url(#dropShadow)">
      <circle cx="390" cy="118" r="46" fill="#D8CBB8" stroke="#8C7A65" stroke-width="3"/>
      <circle cx="390" cy="118" r="40" fill="#3B7A47"/>
      <circle cx="378" cy="108" r="12" fill="#4E9A5B"/>
      <circle cx="398" cy="110" r="11" fill="#2E6939"/>
      <circle cx="386" cy="126" r="13" fill="#438950"/>
      <circle cx="404" cy="126" r="10" fill="#52A360"/>
    </g>

    <!-- 3. Roti / Chilla / Rice Swap (Bottom-Right) -->
    <g filter="url(#dropShadow)">
      <path d="M 345 170 Q 435 160 445 245 Q 375 295 335 235 Z" fill="#E3A84B" stroke="#B57B24" stroke-width="2"/>
      <path d="M 355 182 Q 430 178 435 255 Q 375 285 342 238 Z" fill="#EDB95E"/>
      <circle cx="382" cy="212" r="2.5" fill="#8C5811"/>
      <circle cx="405" cy="228" r="2.5" fill="#8C5811"/>
      <circle cx="374" cy="238" r="2" fill="#8C5811"/>
      <circle cx="396" cy="202" r="2" fill="#8C5811"/>
    </g>

    <!-- 4. Chutney & Dip Bowl (Bottom-Left) -->
    <g filter="url(#dropShadow)">
      <circle cx="288" cy="236" r="34" fill="#D8CBB8" stroke="#8C7A65" stroke-width="3"/>
      <circle cx="288" cy="236" r="29" fill="#4C9A45"/>
      <circle cx="288" cy="236" r="20" fill="#5BB053" opacity="0.6"/>
      <circle cx="288" cy="236" r="4" fill="#E9F5E6"/>
    </g>

    <!-- Labels Pill Overlay at Bottom -->
    <rect x="24" y="314" width="622" height="32" rx="16" fill="#14241B" opacity="0.88"/>
    <text x="335" y="334" text-anchor="middle" fill="#FAF4E8" font-family="system-ui, sans-serif" font-size="12" font-weight="600">
      ${protein} • ${fiber} • ${carb} • ${chutney}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GeneratePlateRequest;
    const {
      slot = "brunch",
      protein = "Palak Tofu",
      fiber = "Garlic Broccoli",
      carb = "Almond-Isabgol Roti",
      chutney = "Mint Coriander Chutney",
      apiKey,
    } = body;

    const prompt = `Overhead top-down editorial food photography of an Indian wholesome Thali plate on a dark rustic wooden table, featuring four compartments: 1) ${protein}, 2) ${fiber}, 3) ${carb}, and 4) a small bowl of ${chutney}. Warm natural daylight, high resolution, photorealistic.`;

    const generated = await generateImageWithGemini({
      prompt,
      apiKey,
      model: "gemini-nano-banana-2.1",
    });

    if (generated) {
      let publicUrl: string | null = null;

      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const ext = generated.mimeType.includes("jpeg") ? "jpg" : "png";
          const storagePath = `plates/${slot}-${Date.now()}.${ext}`;
          publicUrl = await uploadGeneratedImageToSupabase({
            supabase,
            bucket: "ai-plate-images",
            storagePath,
            base64Data: generated.base64Data,
            mimeType: generated.mimeType,
          });
        } catch {
          // Ignore storage upload errors and return base64 dataUrl directly
        }
      }

      const dataUrl = `data:${generated.mimeType};base64,${generated.base64Data}`;
      return NextResponse.json({
        success: true,
        imageUrl: publicUrl || dataUrl,
        provider: generated.model,
        prompt,
      });
    }

    const customSvgUrl = buildCustomThaliSvgDataUrl({
      slot,
      protein,
      fiber,
      carb,
      chutney,
    });

    const resolvedKey = (
      apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
    ).trim();

    return NextResponse.json({
      success: true,
      imageUrl: customSvgUrl,
      provider: resolvedKey
        ? "gemini-fallback-svg"
        : "custom-thali-visualizer",
      prompt,
      notice: resolvedKey
        ? "Gemini API key did not return image bytes; rendered custom 4-part Thali visual."
        : "Rendered custom 4-part Thali visual. Add GEMINI_API_KEY in .env.local (or in the modal) for live Gemini Nano Banana 2.1 photorealistic generation.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate plate image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
