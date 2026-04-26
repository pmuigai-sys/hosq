import { db } from './instant';

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
      /\bunconscious|not\s+respond(ing)?|not\s+moving\b/,
      /\bfainted|fainting|collapse(d)?|passed\s*out\b/,
      /\bnot\s+wak(ing|e)\s+up|won'?t\s+wake\s+up|limp\s+body\b/,
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
      /\bcan'?t\s+breathe|difficulty\s+breath(ing)?|trouble\s+breath(ing)?\b/,
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
      /\bsevere\s+bleed(ing)?|bleed(ing)?\s+a\s*lot|bleeding\s+too\s+much\b/,
      /\bheavy\s+bleed(ing)?|profuse\s+bleed(ing)?|active\s+bleed(ing)?\b/,
      /\bnon.?stop\s+bleed(ing)?|keeps?\s+bleed(ing)?|won'?t\s+stop\s+bleed(ing)?\b/,
      /\blot(s)?\s+of\s+blood|bleed(ing)?\s+(heavily|profusely|badly)\b/,
      /\bnot\s+stop(ping)?\s+bleed(ing)?|uncontrol(l)?ed\s+bleed(ing)?\b/,
      /\bvomit(ing)?\s+blood|blood\s+in\s+stool|black\s+stool\b/,
      /\banatoka\s+damu\s+nyingi|kutoka\s+damu|damu\s+nyingi\b/,
      /\bbleed(ing)?\b/,
    ],
    weak: [/\bblood\b/, /\bwound|cut\b/, /\bpost.?partum|pregnan(t|cy)\b/],
    weakThreshold: 1,
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
      /\bbleed(ing)?\b/,
    ],
    weak: [/\bswelling\b/, /\bsevere\s+pain\b/],
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
    weak: [/\bpain\s+all\s+over\b/, /\bcry(ing)?\s+from\s+pain\b/, /\bnot\s+sleeping\s+pain\b/, /\bpain\b/],
    weakThreshold: 1,
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

export async function runAutoEmergencyTriage(
  queueEntryId: string,
  _patientId: string,
  visitReason: string,
  age?: number,
  notes: string = ""
): Promise<{ success: boolean; flagged?: boolean; error?: string }> {
  try {
    const normalizedText = normalizeText(`${visitReason} ${notes}`);
    
    const matches = rules
      .map((rule) => ({ rule, outcome: evaluateRule(rule, normalizedText) }))
      .filter((item) => item.outcome.matched);

    if (age !== undefined && age !== null) {
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

    const dedupedMatches = Array.from(
      new Map(matches.map((entry) => [entry.rule.id, entry])).values(),
    );

    if (dedupedMatches.length === 0) {
      return { success: true, flagged: false };
    }

    const candidateFlagNames = Array.from(
      new Set(dedupedMatches.flatMap((entry) => entry.rule.targetFlags)),
    );

    // Get active flags from DB
    const { data: flagData } = await db.queryOnce({
      emergency_flags: {
        $: {
          where: {
            is_active: true
          }
        }
      }
    });

    if (!flagData || !flagData.emergency_flags) {
        return { success: false, error: "Failed to load emergency flags" };
    }

    const activeFlags = flagData.emergency_flags.filter(f => candidateFlagNames.includes(f.name));
    const flagByName = new Map(activeFlags.map((f) => [f.name, f.id]));
    
    const selectedFlagIds: string[] = [];
    const appliedFlags: string[] = [];

    for (const match of dedupedMatches) {
      const selected = match.rule.targetFlags.find((name) => flagByName.has(name));
      if (!selected) continue;
      selectedFlagIds.push(flagByName.get(selected)!);
      appliedFlags.push(selected);
    }

    if (selectedFlagIds.length === 0) {
      return { success: true, flagged: false };
    }

    // Apply flags in InstantDB
    const triageNote = `[AUTO-TRIAGE] ${new Date().toISOString()} rules=${dedupedMatches
      .map((m) => m.rule.id)
      .join(",")}`;

    // Create emergency flag entries one by one
    for (const flagId of selectedFlagIds) {
      const flagEntryId = crypto.randomUUID();
      await db.transact(
        db.tx.patient_emergency_flags[flagEntryId].update({
          created_at: new Date().toISOString(),
        })
        .link({ queue_entry: queueEntryId, flag_definition: flagId })
      );
    }

    // Update queue entry
    await db.transact(
      db.tx.queue_entries[queueEntryId].update({
        has_emergency_flag: true,
        notes: notes ? `${notes}\n${triageNote}` : triageNote,
        updated_at: new Date().toISOString()
      })
    );

    return {
      success: true,
      flagged: true,
    };
  } catch (error: any) {
    console.error("Triage error:", error);
    return { success: false, error: error.message || "Unknown error during triage" };
  }
}
