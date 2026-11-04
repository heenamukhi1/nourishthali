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
const INSPIRING_THALIS_MARKER = "__NOURISHTHALI_INSPIRING_THALIS_V1__";

export interface InspiringThaliRecord {
  id: string;
  title: string;
  subtitle: string;
  plate: PlateFormulaSelection;
  imageUrl: string;
  healingSummary: string;
  eatToBeatDiseaseInsight: string;
  metabolicApproachInsight: string;
  defenseSystems: string[];
  netCarbsG: number;
  fiberG: number;
  proteinG: number;
  createdAt: string;
}

const DEFAULT_INSPIRING_THALIS: InspiringThaliRecord[] = [
  {
    id: "inspiring-thali-1",
    title: "Sulforaphane & Curcumin Terrain-Nourishing Thali",
    subtitle: "Picked from Recipe Builder • Anti-Angiogenic & Low-Glycemic",
    plate: {
      protein: "Palak Tofu",
      fiber: "Steamed Garlic-Lemon Broccoli",
      carb: "Almond-Isabgol Roti",
      chutney: "Raw Haldi-Adrak-Lehsun Paste",
    },
    imageUrl:
      "https://pkvkjdhpqnhOxpznrleb.supabase.co/storage/v1/object/public/ai-plate-images/recipes/palak-tofu-paneer-keto.png",
    healingSummary:
      "This vibrant green-and-gold Thali pairs plant isoflavones and iron-rich spinach in Palak Tofu with cruciferous Steamed Garlic-Lemon Broccoli, prebiotic Almond-Isabgol Roti, and pungent Raw Haldi-Adrak-Lehsun (Turmeric-Ginger-Garlic) paste.",
    eatToBeatDiseaseInsight:
      "From Dr. William Li’s 'Eat to Beat Disease': Steamed broccoli and garlic release sulforaphane and allicin, which activate the body’s anti-angiogenic defense system (starving abnormal blood vessels) and boost detoxification enzymes, while psyllium (Isabgol) feeds Akkermansia muciniphila in the gut microbiome.",
    metabolicApproachInsight:
      "From Dr. Nasha Winters’ 'The Metabolic Approach to Cancer': Replacing refined wheat with Almond-Isabgol Roti eliminates glucose and insulin spikes, while raw turmeric (curcumin) and ginger modulate the NF-κB inflammatory pathway and support mitochondrial resilience.",
    defenseSystems: [
      "Anti-Angiogenesis",
      "Gut Microbiome",
      "DNA Protection",
      "Metabolic Glycemic Control",
    ],
    netCarbsG: 9,
    fiberG: 16,
    proteinG: 26,
    createdAt: "2026-11-03T08:00:00.000Z",
  },
  {
    id: "inspiring-thali-2",
    title: "Beta-Glucan Mushroom & Cruciferous Microbiome Thali",
    subtitle: "Picked from Recipe Builder • Immune & Mitochondrial Support",
    plate: {
      protein: "Methi Malai Mushroom & Broccoli Stir-Fry",
      fiber: "Lauki Pudina Shorba",
      carb: "Crispy Almond Flour & Methi Paratha",
      chutney: "Walnut-Pudina-Anardana Chutney",
    },
    imageUrl:
      "https://pkvkjdhpqnhOxpznrleb.supabase.co/storage/v1/object/public/ai-plate-images/recipes/methi-malai-mushroom-broccoli.png",
    healingSummary:
      "An aromatic Rajasthani-inspired ketogenic plate combining fenugreek-scented mushrooms and broccoli with hydrating bottle gourd mint soup, almond-methi flatbread, and omega-3 rich walnut-mint chutney.",
    eatToBeatDiseaseInsight:
      "From Dr. William Li’s 'Eat to Beat Disease': Culinary mushrooms supply soluble beta-glucan fibers that stimulate protective NK and T-cell immunity, while walnuts and pomegranate (anardana) provide ellagitannins that nourish beneficial butyrate-producing gut flora.",
    metabolicApproachInsight:
      "From Dr. Nasha Winters’ 'The Metabolic Approach to Cancer': Fenugreek (methi) leaves contain trigonelline and 4-hydroxyisoleucine to stabilize post-meal blood glucose, keeping the metabolic terrain in fat-adapted ketosis while deeply hydrating cellular pathways.",
    defenseSystems: [
      "Immunity Defense",
      "Gut Microbiome",
      "Stem Cell Regeneration",
      "Ketogenic Terrain",
    ],
    netCarbsG: 10,
    fiberG: 15,
    proteinG: 22,
    createdAt: "2026-11-03T09:00:00.000Z",
  },
  {
    id: "inspiring-thali-3",
    title: "Polyphenol Tadka & Prebiotic Flax Healing Thali",
    subtitle: "Picked from Recipe Builder • Epigenetic & Anti-Inflammatory",
    plate: {
      protein: "Tofu Methi Bhurji",
      fiber: "Baingan Bharta",
      carb: "Flaxseed (Alsi) & Herb Mukhwas Roti",
      chutney: "Fresh Amla-Hara Dhaniya Chutney",
    },
    imageUrl:
      "https://pkvkjdhpqnhOxpznrleb.supabase.co/storage/v1/object/public/ai-plate-images/recipes/tofu-methi-bhurji.png",
    healingSummary:
      "Spiced scrambled organic tofu with fresh fenugreek greens served alongside smoky roasted eggplant bharta, lignan-rich flaxseed roti, and vitamin-C packed fresh amla-coriander chutney.",
    eatToBeatDiseaseInsight:
      "From Dr. William Li’s 'Eat to Beat Disease': Eggplant skin (nasunin), soy genistein in tofu, and Indian gooseberry (amla) polyphenols protect cellular DNA from oxidative stress and inhibit pathological angiogenesis.",
    metabolicApproachInsight:
      "From Dr. Nasha Winters’ 'The Metabolic Approach to Cancer': Flaxseeds (alsi) provide plant lignans and alpha-linolenic acid (ALA) that support healthy estrogen metabolism and cell membrane fluidity, while zero-starch ingredients maintain optimal ketone production.",
    defenseSystems: [
      "DNA Protection",
      "Anti-Angiogenesis",
      "Hormone & Terrain Balance",
      "Microbiome Fiber",
    ],
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

async function generateHealingInsightsWithGemini({
  plate,
  apiKey,
}: {
  plate: PlateFormulaSelection;
  apiKey: string;
}): Promise<{
  title: string;
  subtitle: string;
  healingSummary: string;
  eatToBeatDiseaseInsight: string;
  metabolicApproachInsight: string;
  defenseSystems: string[];
  netCarbsG: number;
  fiberG: number;
  proteinG: number;
} | null> {
  if (!apiKey || apiKey === "your-gemini-api-key") return null;

  const prompt = `You are an integrative culinary nutritionist specializing in Indian Ketogenic therapeutic meals.
We have assembled a 4-part Indian Keto Nourish Thali from our Recipe Builder:
1. Protein Base: ${plate.protein}
2. Fiber & Sabzi: ${plate.fiber}
3. Low-Carb Roti/Rice Swap: ${plate.carb}
4. Therapeutic Chutney & Dip: ${plate.chutney}

Pull scientific and culinary insights specifically from:
- "Eat to Beat Disease" by Dr. William Li (focusing on the 5 health defense systems: Angiogenesis, Regeneration/Stem Cells, Microbiome, DNA Protection, and Immunity, and bioactive phytonutrients in these Indian ingredients).
- "The Metabolic Approach to Cancer" by Dr. Nasha Winters (focusing on the Metabolic Terrain, low-glycemic ketogenic adaptation, mitochondrial health, anti-inflammatory pathways like NF-kB, and epigenetic nutrition).

Return ONLY valid JSON (no markdown fences) matching this exact structure:
{
  "title": "Poetic & appetizing name for this Healing Thali (max 8 words)",
  "subtitle": "Picked from Recipe Builder • Short therapeutic focus",
  "healingSummary": "2 sentences describing the flavors and how the 4 dishes work together synergistically.",
  "eatToBeatDiseaseInsight": "2 sentences referencing Dr. William Li's 'Eat to Beat Disease' explaining which of the 5 Defense Systems and specific bioactive compounds in ${plate.protein}, ${plate.fiber}, ${plate.carb}, and ${plate.chutney} support healing.",
  "metabolicApproachInsight": "2 sentences referencing Dr. Nasha Winters' 'The Metabolic Approach to Cancer' explaining how this low-carb combination supports mitochondrial function, glycemic stability, and the metabolic terrain.",
  "defenseSystems": ["Anti-Angiogenesis", "Gut Microbiome", "DNA Protection", "Metabolic Terrain"],
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
    if (parsed && parsed.title && parsed.eatToBeatDiseaseInsight) {
      return {
        title: String(parsed.title),
        subtitle: String(
          parsed.subtitle || "Picked from Recipe Builder • Integrative Healing Thali"
        ),
        healingSummary: String(parsed.healingSummary || ""),
        eatToBeatDiseaseInsight: String(parsed.eatToBeatDiseaseInsight),
        metabolicApproachInsight: String(parsed.metabolicApproachInsight || ""),
        defenseSystems: Array.isArray(parsed.defenseSystems)
          ? parsed.defenseSystems.slice(0, 4).map(String)
          : ["Anti-Angiogenesis", "Gut Microbiome", "DNA Protection", "Metabolic Terrain"],
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

    if (!error && data?.ayurvedic_or_metabolic_tip) {
      const parsed = JSON.parse(
        data.ayurvedic_or_metabolic_tip
      ) as InspiringThaliRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
      ayurvedic_or_metabolic_tip: JSON.stringify(list.slice(0, 12)),
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

    // Pick a combination of 4 dishes from the Recipe Builder (or use custom selection)
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

    const imagePrompt = `Overhead studio food photography of an inspiring Indian Ketogenic Healing Thali on a handcrafted matte ceramic and brass plate over a warm linen table: (1) ${selectedPlate.protein} in a brass katori, (2) ${selectedPlate.fiber} garnished with fresh herbs, (3) ${selectedPlate.carb}, and (4) vibrant ${selectedPlate.chutney} in a small bowl. Natural morning window light, editorial culinary styling, 8k photorealistic, no text or watermarks.`;

    // Run Gemini 3.8 Flash (book-grounded healing insights) and Gemini Nano Banana 2.1 (Thali image) in parallel
    const [insights, generatedImg] = await Promise.all([
      generateHealingInsightsWithGemini({ plate: selectedPlate, apiKey }),
      generateImageWithGemini({
        prompt: imagePrompt,
        apiKey,
        model: "gemini-nano-banana-2.1",
      }),
    ]);

    const supabase = getSupabaseAdmin();
    let finalImageUrl =
      "https://pkvkjdhpqnhOxpznrleb.supabase.co/storage/v1/object/public/ai-plate-images/recipes/palak-tofu-paneer-keto.png";

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
        `${selectedPlate.protein} & ${selectedPlate.fiber} Healing Thali`,
      subtitle:
        insights?.subtitle ||
        "Picked from Recipe Builder • Integrative Healing Thali",
      plate: selectedPlate,
      imageUrl: finalImageUrl,
      healingSummary:
        insights?.healingSummary ||
        `A deeply nourishing 4-part ketogenic combination uniting ${selectedPlate.protein} with fiber-rich ${selectedPlate.fiber}, low-glycemic ${selectedPlate.carb}, and phytonutrient-dense ${selectedPlate.chutney}.`,
      eatToBeatDiseaseInsight:
        insights?.eatToBeatDiseaseInsight ||
        `Inspired by Dr. William Li’s "Eat to Beat Disease": Polyphenols, sulfur compounds, and prebiotic soluble fibers in ${selectedPlate.fiber} and ${selectedPlate.chutney} activate anti-angiogenic defenses, support gut microbiome diversity, and protect cellular DNA.`,
      metabolicApproachInsight:
        insights?.metabolicApproachInsight ||
        `Inspired by Dr. Nasha Winters’ "The Metabolic Approach to Cancer": Pairing clean protein (${selectedPlate.protein}) with low-glycemic ${selectedPlate.carb} stabilizes blood glucose and insulin while nourishing mitochondrial efficiency and calming inflammatory pathways.`,
      defenseSystems: insights?.defenseSystems || [
        "Anti-Angiogenesis",
        "Gut Microbiome",
        "DNA Protection",
        "Metabolic Terrain",
      ],
      netCarbsG: insights?.netCarbsG || 9,
      fiberG: insights?.fiberG || 16,
      proteinG: insights?.proteinG || 24,
      createdAt: new Date().toISOString(),
    };

    const existing = await loadInspiringThalis();
    const updatedList = [newThali, ...existing].slice(0, 12);
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

