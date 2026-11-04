import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateImageWithGemini,
  uploadGeneratedImageToSupabase,
} from "@/utils/gemini/imageGenerator";
import {
  PROTEIN_OPTIONS,
  FIBER_OPTIONS,
  CARB_OPTIONS,
  CHUTNEY_OPTIONS,
  type PlateFormulaSelection,
} from "@/data/weekly-plan-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INSPIRING_THALIS_SYNC_DATE = "2099-12-29";
const INSPIRING_THALIS_MARKER = "__NOURISHTHALI_INSPIRING_THALIS_V2__";

export interface InspiringThaliRecord {
  id: string;
  title: string;
  plate: PlateFormulaSelection;
  imageUrl: string;
  healingLine: string;
  netCarbsG: number;
  fiberG: number;
  proteinG: number;
  createdAt: string;
}

const SUPABASE_STORAGE_BASE =
  "https://jqzhlhmuggakixrztwas.supabase.co/storage/v1/object/public/ai-plate-images";

const DEFAULT_INSPIRING_THALIS: InspiringThaliRecord[] = [
  {
    id: "inspiring-thali-1",
    title: "Palak Tofu & Garlic-Lemon Broccoli Healing Thali",
    plate: {
      protein: "Palak Tofu",
      fiber: "Steamed Garlic-Lemon Broccoli",
      carb: "Almond-Isabgol Roti",
      chutney: "Raw Haldi-Adrak-Lehsun Paste",
    },
    imageUrl: `${SUPABASE_STORAGE_BASE}/recipes/palak-tofu-paneer-keto.png`,
    healingLine:
      "Sulforaphane in steamed broccoli, curcumin in raw turmeric, and prebiotic psyllium fiber calm inflammation and strengthen gut immunity.",
    netCarbsG: 9,
    fiberG: 16,
    proteinG: 26,
    createdAt: "2026-11-03T08:00:00.000Z",
  },
  {
    id: "inspiring-thali-2",
    title: "Methi Mushroom & Lauki Shorba Nourish Thali",
    plate: {
      protein: "Methi Malai Mushroom & Broccoli Stir-Fry",
      fiber: "Lauki Pudina Shorba",
      carb: "Crispy Almond Flour & Methi Paratha",
      chutney: "Walnut-Pudina-Anardana Chutney",
    },
    imageUrl: `${SUPABASE_STORAGE_BASE}/recipes/methi-malai-mushroom-broccoli.png`,
    healingLine:
      "Mushroom beta-glucans, fenugreek greens, and omega-3 walnuts support immune defense while keeping blood sugar steady.",
    netCarbsG: 10,
    fiberG: 15,
    proteinG: 22,
    createdAt: "2026-11-03T09:00:00.000Z",
  },
  {
    id: "inspiring-thali-3",
    title: "Tofu Methi Bhurji & Flaxseed Roti Thali",
    plate: {
      protein: "Tofu Methi Bhurji",
      fiber: "Baingan Bharta",
      carb: "Flaxseed (Alsi) & Herb Mukhwas Roti",
      chutney: "Fresh Amla-Hara Dhaniya Chutney",
    },
    imageUrl: `${SUPABASE_STORAGE_BASE}/recipes/tofu-methi-bhurji.png`,
    healingLine:
      "Flaxseed lignans, roasted eggplant antioxidants, and vitamin-C rich amla protect cellular DNA and nourish the microbiome.",
    netCarbsG: 8,
    fiberG: 18,
    proteinG: 25,
    createdAt: "2026-11-03T10:00:00.000Z",
  },
];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-supabase-service-role-key"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function pickRandomFromPool<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

async function generateOneLineHealingWithGemini({
  plate,
  apiKey,
}: {
  plate: PlateFormulaSelection;
  apiKey: string;
}): Promise<{
  title: string;
  healingLine: string;
  netCarbsG: number;
  fiberG: number;
  proteinG: number;
} | null> {
  if (!apiKey || apiKey === "your-gemini-api-key") return null;

  const prompt = `We have assembled a 4-part Indian Keto Thali:
1. Protein: ${plate.protein}
2. Fiber/Sabzi: ${plate.fiber}
3. Low-Carb Roti/Rice: ${plate.carb}
4. Chutney: ${plate.chutney}

Draw upon integrative nutrition principles (such as anti-angiogenic phytonutrients, gut microbiome fiber, cellular DNA protection, and metabolic blood sugar balance), but DO NOT mention any book titles or author names.
Write ONE simple, warm, easy-to-read sentence (maximum 22 words) explaining how these specific ingredients help in healing.

Return ONLY valid JSON (no markdown fences):
{
  "title": "Short appetizing name for this Thali (max 6 words)",
  "healingLine": "One simple sentence (max 22 words) on how these ingredients support cellular healing and gut health.",
  "netCarbsG": 9,
  "fiberG": 16,
  "proteinG": 24
}`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
          "Api-Revision": "2026-05-20",
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          input: [{ type: "text", text: prompt }],
        }),
      }
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      output_text?: string;
      steps?: Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };

    let rawText = payload.output_text || "";
    if (!rawText && Array.isArray(payload.steps)) {
      for (const step of payload.steps) {
        if (step.type === "model_output" && Array.isArray(step.content)) {
          for (const block of step.content) {
            if (block.type === "text" && block.text) {
              rawText += block.text;
            }
          }
        }
      }
    }

    if (!rawText) return null;
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    if (parsed && parsed.title && parsed.healingLine) {
      return {
        title: String(parsed.title),
        healingLine: String(parsed.healingLine),
        netCarbsG: Number(parsed.netCarbsG) || 9,
        fiberG: Number(parsed.fiberG) || 15,
        proteinG: Number(parsed.proteinG) || 24,
      };
    }
  } catch {
    // Fallback handled by caller
  }
  return null;
}

async function loadInspiringThalis(): Promise<InspiringThaliRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return DEFAULT_INSPIRING_THALIS;

  try {
    const { data, error } = await supabase
      .from("daily_quotes")
      .select("quote_text, ayurvedic_or_metabolic_tip")
      .eq("quote_date", INSPIRING_THALIS_SYNC_DATE)
      .maybeSingle();

    if (
      !error &&
      data?.quote_text === INSPIRING_THALIS_MARKER &&
      data?.ayurvedic_or_metabolic_tip
    ) {
      const parsed = JSON.parse(
        data.ayurvedic_or_metabolic_tip
      ) as InspiringThaliRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          ...item,
          imageUrl: item.imageUrl.includes("pkvkjdhpqnhOxpznrleb")
            ? DEFAULT_INSPIRING_THALIS[idx % DEFAULT_INSPIRING_THALIS.length]
                .imageUrl
            : item.imageUrl,
        }));
      }
    }
  } catch {
    // Ignore parse error
  }

  return DEFAULT_INSPIRING_THALIS;
}

async function saveInspiringThalis(list: InspiringThaliRecord[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("daily_quotes").upsert(
    {
      quote_date: INSPIRING_THALIS_SYNC_DATE,
      quote_text: INSPIRING_THALIS_MARKER,
      ayurvedic_or_metabolic_tip: JSON.stringify(list.slice(0, 9)),
    },
    { onConflict: "quote_date" }
  );
}

export async function GET() {
  const thalis = await loadInspiringThalis();
  return NextResponse.json({ thalis });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const customPlate = body.plate as Partial<PlateFormulaSelection> | undefined;

    const proteinOpt = pickRandomFromPool(PROTEIN_OPTIONS);
    const fiberOpt = pickRandomFromPool(FIBER_OPTIONS);
    const carbOpt = pickRandomFromPool(CARB_OPTIONS);
    const chutneyOpt = pickRandomFromPool(CHUTNEY_OPTIONS);

    const selectedPlate: PlateFormulaSelection = {
      protein: customPlate?.protein || proteinOpt.label,
      fiber: customPlate?.fiber || fiberOpt.label,
      carb: customPlate?.carb || carbOpt.label,
      chutney: customPlate?.chutney || chutneyOpt.label,
    };

    const apiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
    ).trim();

    const imagePrompt = `Overhead studio food photography of an appetizing Indian Ketogenic Thali on a matte ceramic and brass plate over a warm linen table: (1) ${selectedPlate.protein} in a brass katori, (2) ${selectedPlate.fiber} garnished with fresh herbs, (3) ${selectedPlate.carb}, and (4) vibrant ${selectedPlate.chutney} in a small bowl. Natural morning window light, 8k photorealistic, no text or watermarks.`;

    const [insights, generatedImg] = await Promise.all([
      generateOneLineHealingWithGemini({ plate: selectedPlate, apiKey }),
      generateImageWithGemini({
        prompt: imagePrompt,
        apiKey,
        model: "gemini-nano-banana-2.1",
      }),
    ]);

    const supabase = getSupabaseAdmin();
    let finalImageUrl = `${SUPABASE_STORAGE_BASE}/recipes/palak-tofu-paneer-keto.png`;

    if (generatedImg?.base64Data) {
      if (supabase) {
        const storagePath = `inspiring-thalis/thali-${Date.now()}.png`;
        const uploadedUrl = await uploadGeneratedImageToSupabase({
          supabase,
          bucket: "ai-plate-images",
          storagePath,
          base64Data: generatedImg.base64Data,
          mimeType: generatedImg.mimeType,
        });
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          finalImageUrl = `data:${generatedImg.mimeType};base64,${generatedImg.base64Data}`;
        }
      } else {
        finalImageUrl = `data:${generatedImg.mimeType};base64,${generatedImg.base64Data}`;
      }
    }

    const newThali: InspiringThaliRecord = {
      id: `inspiring-thali-${Date.now()}`,
      title:
        insights?.title ||
        `${selectedPlate.protein} & ${selectedPlate.fiber} Thali`,
      plate: selectedPlate,
      imageUrl: finalImageUrl,
      healingLine:
        insights?.healingLine ||
        `Phytonutrients, prebiotic fiber, and clean plant protein in ${selectedPlate.protein} and ${selectedPlate.fiber} calm inflammation and steady blood sugar.`,
      netCarbsG: insights?.netCarbsG || 9,
      fiberG: insights?.fiberG || 16,
      proteinG: insights?.proteinG || 24,
      createdAt: new Date().toISOString(),
    };

    const existing = await loadInspiringThalis();
    const updatedList = [newThali, ...existing].slice(0, 9);
    await saveInspiringThalis(updatedList);

    return NextResponse.json({
      success: true,
      thali: newThali,
      thalis: updatedList,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to generate inspiring Thali",
      },
      { status: 500 }
    );
  }
}
