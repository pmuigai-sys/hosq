// Allow unauthenticated calls from the patient self-serve flow.
export const config = {
  verify_jwt: false,
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey",
};

interface TriageRequest {
  queueEntryId: string;
  patientId?: string;
  visitReason?: string;
  notes?: string;
  age?: number | null;
}

type Rule = {
  id: string;
  targetFlags: string[];
  strong: RegExp[];
  weak: RegExp[];
  weakThreshold: number;
};

const rules: Rule[] = [
  {
    id: "unconscious",
    targetFlags: ["unconscious"],
    strong: [
      /\bunconscious|unconscious|not\s+respond(ing)?|not\s+moving\b/,
      /\bfainted|fainting|collapse(d)?|passed\s*out\b/,
      /\bcoma|no\s+response|amezimia|hajitambui\b/,
    ],
    weak: [/\bdizzy|dizziness|confus(ed|ion)\b/, /\bweak|can't\s+stand\b/],
    weakThreshold: 2,
  },
  {
    id: "breathing_difficulty",
    targetFlags: ["breathing_difficulty", "anaphylaxis"],
    strong: [
      /\b(can'?t|cannot|hard\s*to)\s*brea(th|d)e|breathless|short(ness)?\s+of\s+breath\b/,
      /\bwheez(ing)?|asthma\s+attack|choking\b/,
      /\bblue\s+lips|gasp(ing)?|cannot\s+inhale|hapumui\s+vizuri\b/,
    ],
    weak: [/\bcough(ing)?\s+bad\b/, /\bchest\s+tight(ness)?\b/, /\bswollen?\s+(face|tongue|throat)\b/],
    weakThreshold: 2,
  },
  {
    id: "severe_bleeding",
    targetFlags: ["severe_bleeding", "obstetric_emergency"],
    strong: [
      /\bsevere\s+bleed(ing)?|bleed(ing)?\s+alot|bleeding\s+too\s+much\b/,
      /\bnot\s+stop(ping)?\s+bleed(ing)?|uncontrol(l)?ed\s+bleed(ing)?\b/,
      /\bvomit(ing)?\s+blood|blood\s+in\s+stool|black\s+stool|anatoka\s+damu\s+nyingi\b/,
    ],
    weak: [/\bblood\b/, /\bwound|cut\b/, /\bpost.?partum|pregnan(t|cy)\b/],
    weakThreshold: 2,
  },
  {
    id: "cardiac_emergency",
    targetFlags: ["cardiac_emergency", "hypertensive_crisis"],
    strong: [
      /\bchest\s+pain|pain\s+in\s+chest|chest\s+pressure|heart\s+pain\b/,
      /\bheart\s+attack|cardiac|palpitation(s)?|presha\s+imepanda\b/,
      /\bleft\s+arm\s+pain|jaw\s+pain\s+with\s+chest\b/,
    ],
    weak: [/\bsweat(ing)?\s+much\b/, /\bnausea|vomit(ing)?\b/, /\bbreathless|dizzy\b/],
    weakThreshold: 2,
  },
  {
    id: "stroke_symptoms",
    targetFlags: ["stroke_symptoms", "hypertensive_crisis"],
    strong: [
      /\bstroke|str0ke\b/,
      /\bface\s+droop|mouth\s+twist(ed)?|one\s+side\s+weak\b/,
      /\bslur(red)?\s+speech|cannot\s+talk|speech\s+problem\b/,
      /\bsudden\s+weak(ness)?\s+(arm|leg|side)|anaongea\s+vibaya\b/,
    ],
    weak: [/\bsevere\s+head(ache)?\b/, /\bblur(red)?\s+vision\b/, /\bconfus(ed|ion)\b/],
    weakThreshold: 2,
  },
  {
    id: "seizure_active",
    targetFlags: ["seizure_active", "unconscious"],
    strong: [
      /\bseizure|sezure|fit(s)?|convulsion(s)?|kifafa\b/,
      /\bshaking\s+body|body\s+jerk(ing)?\b/,
      /\bepilep(sy|tic)\b/,
    ],
    weak: [/\bbitten?\s+tongue\b/, /\bnot\s+aware\b/, /\bfainted\b/],
    weakThreshold: 2,
  },
  {
    id: "obstetric_emergency",
    targetFlags: ["obstetric_emergency", "severe_bleeding"],
    strong: [
      /\bpregnan(t|cy)|pregnency|pregnat\b/,
      /\blabor\s+pain\s+severe|water\s+broke\b/,
      /\bbleeding\s+in\s+pregnan(t|cy)|reduced\s+fetal\s+movement\b/,
      /\bectopic|miscarriage|post.?partum\s+bleed(ing)?|mtoto\s+hatikisiki\b/,
    ],
    weak: [/\babdominal\s+pain\b/, /\bdizzy\b/, /\bswelling\b/],
    weakThreshold: 2,
  },
  {
    id: "anaphylaxis",
    targetFlags: ["anaphylaxis", "breathing_difficulty"],
    strong: [
      /\ballerg(y|ic)\s+reaction|anaphylax(is|is)\b/,
      /\bswollen?\s+(tongue|throat|face)\b/,
      /\braceh|rash\s+all\s+over|itching\s+severe|amevimba\s+uso\b/,
    ],
    weak: [/\bbreath(ing)?\s+problem\b/, /\bafter\s+food|after\s+drug\b/, /\bvomit(ing)?\b/],
    weakThreshold: 2,
  },
  {
    id: "poisoning_overdose",
    targetFlags: ["poisoning_overdose", "unconscious"],
    strong: [
      /\bpoison(ing)?|overdose|od\b/,
      /\bdrank\s+chemical|pesticide|detergent|bleach\b/,
      /\btoo\s+many\s+tablets|medicine\s+overdose\b/,
      /\bsnake\s+bite|dog\s+bite\s+severe|amekunywa\s+dawa\s+nyingi\b/,
    ],
    weak: [/\bvomit(ing)?\b/, /\bconfus(ed|ion)\b/, /\bdrowsy\b/],
    weakThreshold: 2,
  },
  {
    id: "major_trauma",
    targetFlags: ["major_trauma", "severe_bleeding", "severe_pain"],
    strong: [
      /\baccident|rta|road\s+traffic|knocked\s+by\s+car|bodaboda\s+accident\b/,
      /\bhead\s+injury|deep\s+cut|fracture|broken\s+bone\b/,
      /\bfall\s+from\s+height|stab(bed)?|gunshot\b/,
    ],
    weak: [/\bswelling\b/, /\bsevere\s+pain\b/, /\bbleeding\b/],
    weakThreshold: 2,
  },
  {
    id: "diabetic_emergency",
    targetFlags: ["diabetic_emergency", "unconscious"],
    strong: [
      /\bdiabet(ic|es)\s+(coma|emergency)|sugar\s+very\s+(high|low)\b/,
      /\bdka|ketoacidosis|hypoglyc(a)?emia|hypo\b/,
      /\bconfus(ed|ion)\s+with\s+diabet(es|ic)|sukari\s+imepanda|sukari\s+imeshuka\b/,
    ],
    weak: [/\btoo\s+thirsty\b/, /\bpee\s+many\s+times\b/, /\bfruity\s+breath\b/],
    weakThreshold: 2,
  },
  {
    id: "severe_dehydration",
    targetFlags: ["severe_dehydration"],
    strong: [
      /\bdehydrat(ed|ion)|very\s+dry\s+mouth\b/,
      /\bdiarrh(o)?ea\s+many\s+times|vomit(ing)?\s+many\s+times\b/,
      /\bsunken\s+eyes|cannot\s+drink|no\s+urine\b/,
    ],
    weak: [/\bweak(ness)?\b/, /\bdizzy\b/, /\bchild\b/],
    weakThreshold: 2,
  },
  {
    id: "high_fever_risk",
    targetFlags: ["high_fever_risk", "seizure_active"],
    strong: [
      /\bhigh\s+fever|very\s+hot\s+body|temperature\s+high\b/,
      /\bfever\s+with\s+convulsion|febrile\s+seizure\b/,
      /\binfant\s+fever|baby\s+fever\s+high|homa\s+kali\b/,
    ],
    weak: [/\bchills\b/, /\bnot\s+eating\b/, /\bvomit(ing)?\b/],
    weakThreshold: 2,
  },
  {
    id: "hypertensive_crisis",
    targetFlags: ["hypertensive_crisis", "stroke_symptoms", "cardiac_emergency"],
    strong: [
      /\bbp\s+(very\s+)?high|blood\s+pressure\s+(very\s+)?high\b/,
      /\bsevere\s+headache\s+with\s+blur(red)?\s+vision\b/,
      /\bnose\s+bleed(ing)?\s+with\s+high\s+bp|presha\s+kubwa\b/,
    ],
    weak: [/\bchest\s+pain\b/, /\bconfus(ed|ion)\b/, /\bweak\s+one\s+side\b/],
    weakThreshold: 2,
  },
  {
    id: "severe_pain",
    targetFlags: ["severe_pain"],
    strong: [
      /\bsevere\s+pain|pain\s+too\s+much|pain\s+9\/10|pain\s+10\/10\b/,
      /\bcannot\s+walk\s+due\s+pain|scream(ing)?\s+pain|maumivu\s+makali\b/,
    ],
    weak: [/\bpain\s+all\s+over\b/, /\bcry(ing)?\s+from\s+pain\b/, /\bnot\s+sleeping\s+pain\b/],
    weakThreshold: 2,
  },
];

function normalizeText(value: string): string {
  return ` ${value
    .toLowerCase()
    .replace(/[^a-z0-9\s/+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function evaluateRule(rule: Rule, normalizedText: string): { matched: boolean; evidence: string[] } {
  const evidence: string[] = [];

  for (const pattern of rule.strong) {
    const match = normalizedText.match(pattern);
    if (match?.[0]) {
      evidence.push(match[0].trim());
    }
  }

  if (evidence.length > 0) {
    return { matched: true, evidence };
  }

  let weakMatches = 0;
  for (const pattern of rule.weak) {
    const match = normalizedText.match(pattern);
    if (match?.[0]) {
      weakMatches += 1;
      evidence.push(match[0].trim());
    }
  }

  return { matched: weakMatches >= rule.weakThreshold, evidence };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          error: "Supabase runtime credentials are missing",
          details:
            "Expected SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY).",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: TriageRequest = await req.json();
    if (!body.queueEntryId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: queueEntryId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: queueEntry, error: queueError } = await supabase
      .from("queue_entries")
      .select("id, patient_id, status, notes")
      .eq("id", body.queueEntryId)
      .maybeSingle();

    if (queueError || !queueEntry) {
      return new Response(
        JSON.stringify({ error: "Queue entry not found", details: queueError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.patientId && body.patientId !== queueEntry.patient_id) {
      return new Response(
        JSON.stringify({ error: "Provided patientId does not match queue entry" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("visit_reason, age")
      .eq("id", queueEntry.patient_id)
      .maybeSingle();

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: "Patient not found", details: patientError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reason = body.visitReason ?? patient.visit_reason ?? "";
    const extra = body.notes ?? "";
    const normalizedText = normalizeText(`${reason} ${extra}`);
    const age = typeof body.age === "number" ? body.age : patient.age;

    const matches = rules
      .map((rule) => ({ rule, outcome: evaluateRule(rule, normalizedText) }))
      .filter((item) => item.outcome.matched);

    // Age-based risk escalations common in triage:
    // - Infants/older adults with high fever
    // - Very young/elderly with breathing distress
    if (age !== null && age !== undefined) {
      if (age <= 2 && /fever|very\s+hot\s+body|temperature\s+high/.test(normalizedText)) {
        matches.push({
          rule: rules.find((r) => r.id === "high_fever_risk")!,
          outcome: { matched: true, evidence: ["infant with fever"] },
        });
      }
      if (age >= 65 && /breathless|short(ness)?\s+of\s+breath|chest\s+pain/.test(normalizedText)) {
        matches.push({
          rule: rules.find((r) => r.id === "cardiac_emergency")!,
          outcome: { matched: true, evidence: ["elderly with chest/breathing symptoms"] },
        });
      }
    }

    // De-duplicate by rule id.
    const dedupedMatches = Array.from(
      new Map(matches.map((entry) => [entry.rule.id, entry])).values(),
    );

    if (dedupedMatches.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          flagged: false,
          matchedRules: [],
          appliedFlags: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const candidateFlagNames = Array.from(
      new Set(dedupedMatches.flatMap((entry) => entry.rule.targetFlags)),
    );

    const { data: activeFlags, error: flagsError } = await supabase
      .from("emergency_flags")
      .select("id, name")
      .in("name", candidateFlagNames)
      .eq("is_active", true);

    if (flagsError) {
      return new Response(
        JSON.stringify({ error: "Failed to load emergency flags", details: flagsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const flagByName = new Map((activeFlags ?? []).map((f) => [f.name, f.id]));
    const selectedFlagIds = new Set<string>();
    const appliedFlags: string[] = [];

    for (const match of dedupedMatches) {
      const selected = match.rule.targetFlags.find((name) => flagByName.has(name));
      if (!selected) continue;
      selectedFlagIds.add(flagByName.get(selected)!);
      appliedFlags.push(selected);
    }

    if (selectedFlagIds.size === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          flagged: false,
          matchedRules: dedupedMatches.map((m) => m.rule.id),
          appliedFlags: [],
          details: "Rules matched, but no configured emergency flag names were found.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existingLinks, error: linksError } = await supabase
      .from("patient_emergency_flags")
      .select("emergency_flag_id")
      .eq("queue_entry_id", queueEntry.id);

    if (linksError) {
      return new Response(
        JSON.stringify({ error: "Failed to check existing emergency links", details: linksError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const existingIds = new Set((existingLinks ?? []).map((row) => row.emergency_flag_id));
    const rowsToInsert = Array.from(selectedFlagIds)
      .filter((flagId) => !existingIds.has(flagId))
      .map((flagId) => ({
        queue_entry_id: queueEntry.id,
        emergency_flag_id: flagId,
        noted_by_user_id: null,
      }));

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("patient_emergency_flags").insert(rowsToInsert);
      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to attach emergency flags", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const triageNote = `[AUTO-TRIAGE] ${new Date().toISOString()} rules=${dedupedMatches
      .map((m) => m.rule.id)
      .join(",")}`;
    const existingNotes = queueEntry.notes?.trim();
    const updatedNotes = existingNotes ? `${existingNotes}\n${triageNote}` : triageNote;

    const { error: queueUpdateError } = await supabase
      .from("queue_entries")
      .update({ has_emergency_flag: true, notes: updatedNotes })
      .eq("id", queueEntry.id);

    if (queueUpdateError) {
      return new Response(
        JSON.stringify({ error: "Failed to mark queue entry as emergency", details: queueUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        flagged: true,
        matchedRules: dedupedMatches.map((m) => m.rule.id),
        evidence: dedupedMatches.map((m) => ({ rule: m.rule.id, evidence: m.outcome.evidence.slice(0, 3) })),
        appliedFlags: Array.from(new Set(appliedFlags)),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
