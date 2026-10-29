/**
 * Baked-in published content — the deployment safety net.
 *
 * WHY THIS EXISTS: the clinic database is a local SQLite file (`db/custom.db`,
 * git-ignored) plus a git-ignored `.env`. On serverless hosts (Vercel & co.)
 * neither travels with the deployment, so every database query fails and the
 * public pages — which are written to degrade silently — would render with
 * empty services/exercises sections and zeroed stat counters.
 *
 * This module is the single source of truth for the PUBLISHED seed content:
 *   - `prisma/seed.ts` inserts it into SQLite (local dev + admin CMS),
 *   - `src/lib/catalog.ts` serves it verbatim when the database is
 *     unavailable or empty (serverless deploys, wiped dev databases).
 *
 * Content policy is unchanged (docs/content-needed.md): only clinic-approved,
 * published copy lives here; drafts stay out. When the clinic edits content
 * through /admin those edits live in the database only — this snapshot stays
 * fixed until the next content release updates it (see BAKED_CONTENT_DATE).
 */

import type { FaqItem, Session } from "./content";

/** When this baked snapshot was last reviewed. Bump on content changes. */
export const BAKED_CONTENT_DATE = new Date("2026-10-29T00:00:00.000Z");

/* ------------------------------------------------------------------ types */

/** Mirrors the Prisma `category` include used by the public pages. */
export interface ServiceCategoryRef {
  name: string;
  slug: string;
}

/** Full exercise-category row (ExerciseCategory has no timestamp columns). */
export interface CatalogExerciseCategory {
  id: string;
  name: string;
  slug: string;
  bodyArea: string | null;
  description: string | null;
  sortOrder: number;
}

/**
 * A published exercise exactly as the public pages consume it: every scalar
 * column plus the `category` (full row) and `services` (published services)
 * relations included by the detail page.
 */
export interface CatalogExercise {
  id: string;
  categoryId: string | null;
  title: string;
  slug: string;
  purpose: string | null;
  summary: string;
  instructions: string;
  frequency: string | null;
  equipment: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  youtubeUrl: string | null;
  precautions: string | null;
  attribution: string | null;
  featured: boolean;
  status: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  category: CatalogExerciseCategory | null;
  services: { slug: string; name: string; tagline: string | null }[];
}

/**
 * A published service exactly as the public pages consume it: every scalar
 * column plus the `category` ref and the published `exercises` relation
 * (ordered, capped at 4) included by the detail page.
 */
export interface CatalogService {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  summary: string;
  description: string;
  conditions: string; // JSON string[] — parsed via parseJsonArray
  approach: string | null;
  faqs: string; // JSON FaqItem[] — parsed via parseJsonArray
  imageUrl: string | null;
  featured: boolean;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  category: ServiceCategoryRef | null;
  exercises: {
    slug: string;
    title: string;
    summary: string;
    category: { name: string } | null;
  }[];
}

/** Opening hours per weekday (0 = Sunday), mirroring OperatingHour rows. */
export interface BakedDayHours {
  dayOfWeek: number;
  isOpen: boolean;
  sessions: Session[];
}

/* ------------------------------------------------------ service categories */

export const BAKED_SERVICE_CATEGORIES: (CatalogServiceCategorySeed & {
  id: string;
})[] = [
  {
    id: "svc-cat-orthopaedic",
    name: "Orthopaedic & Musculoskeletal Care",
    slug: "orthopaedic",
    description:
      "Assessment and physiotherapy for bones, joints, muscles, and post-surgical recovery.",
    sortOrder: 1,
    status: "published",
  },
  {
    id: "svc-cat-sports",
    name: "Sports & Active Lifestyles",
    slug: "sports",
    description:
      "Rehabilitation and conditioning for people who train, play, or stay active.",
    sortOrder: 2,
    status: "published",
  },
  {
    id: "svc-cat-neurological",
    name: "Neurological Rehabilitation",
    slug: "neurological",
    description:
      "Movement and function-focused rehabilitation for neurological conditions.",
    sortOrder: 3,
    status: "published",
  },
  {
    id: "svc-cat-inpatient-daycare",
    name: "In-Patient & Day Care",
    slug: "inpatient-daycare",
    description:
      "Structured rehabilitation at the centre, in in-patient and day-care formats.",
    sortOrder: 4,
    status: "published",
  },
];

interface CatalogServiceCategorySeed {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  status: string;
}

/* ----------------------------------------------------- exercise categories */

export const BAKED_EXERCISE_CATEGORIES: CatalogExerciseCategory[] = [
  {
    id: "ex-cat-neck-upper-back",
    name: "Neck & Upper Back",
    slug: "neck-upper-back",
    bodyArea: "Neck, shoulders, upper back",
    description: null,
    sortOrder: 1,
  },
  {
    id: "ex-cat-shoulder",
    name: "Shoulder",
    slug: "shoulder",
    bodyArea: "Shoulders",
    description: null,
    sortOrder: 2,
  },
  {
    id: "ex-cat-lower-back-core",
    name: "Lower Back & Core",
    slug: "lower-back-core",
    bodyArea: "Lower back and trunk",
    description: null,
    sortOrder: 3,
  },
  {
    id: "ex-cat-hip-glutes",
    name: "Hip & Glutes",
    slug: "hip-glutes",
    bodyArea: "Hips and glutes",
    description: null,
    sortOrder: 4,
  },
  {
    id: "ex-cat-knee",
    name: "Knee",
    slug: "knee",
    bodyArea: "Knees",
    description: null,
    sortOrder: 5,
  },
  {
    id: "ex-cat-ankle-foot",
    name: "Ankle & Foot",
    slug: "ankle-foot",
    bodyArea: "Ankles, feet, calves",
    description: null,
    sortOrder: 6,
  },
];

/* -------------------------------------------------------------- exercises */

interface ExerciseSeed {
  slug: string;
  title: string;
  categorySlug: string;
  purpose: string;
  summary: string;
  instructions: string;
  equipment: string;
  precautions: string;
  featured: boolean;
  relatedServiceSlugs: string[];
}

const EXERCISE_SEEDS: ExerciseSeed[] = [
  {
    slug: "chin-tuck",
    title: "Chin Tuck",
    categorySlug: "neck-upper-back",
    purpose:
      "A gentle mobility exercise for the neck, often used in desk-work and posture-related programmes.",
    summary:
      "A slow, controlled movement that draws the head back over the shoulders — commonly taught for neck stiffness and posture education.",
    instructions:
      "Sit or stand comfortably, looking straight ahead.\nDraw your chin straight back — as if making a double chin — while keeping your eyes level.\nHold for a few seconds, feeling a light stretch at the back of the neck.\nRelease slowly and repeat.",
    equipment: "None",
    precautions:
      "Keep the movement small and pain-free. Stop and tell your therapist if you feel dizziness, tingling, or discomfort spreading to the arms.",
    featured: true,
    relatedServiceSlugs: ["back-neck-pain-care"],
  },
  {
    slug: "shoulder-blade-squeeze",
    title: "Shoulder Blade Squeeze",
    categorySlug: "shoulder",
    purpose:
      "Activates the muscles between the shoulder blades — a common starting point for shoulder and upper-back programmes.",
    summary:
      "A controlled squeeze of the shoulder blades together, teaching the upper back to support the shoulder during daily activity.",
    instructions:
      "Sit tall with arms relaxed at your sides.\nGently draw your shoulder blades back and down, as if pinching a pencil between them.\nHold for five to ten seconds, breathing normally.\nRelease slowly and repeat.",
    equipment: "None",
    precautions:
      "Keep the neck relaxed — the movement should come from the upper back, not the shoulders shrugging upwards.",
    featured: true,
    relatedServiceSlugs: ["back-neck-pain-care", "orthopaedic-physiotherapy"],
  },
  {
    slug: "cat-cow-stretch",
    title: "Cat–Cow Movement",
    categorySlug: "lower-back-core",
    purpose:
      "A rhythmic mobility exercise for the whole spine, frequently included early in lower-back programmes.",
    summary:
      "A slow alternation between rounding and arching the back while on all fours, moving each part of the spine in turn.",
    instructions:
      "Start on hands and knees with hands under shoulders and knees under hips.\nExhale and gently round the spine upwards, letting the head drop.\nInhale and let the belly ease downwards, lifting the chest and tailbone.\nMove slowly between the two positions.",
    equipment:
      "A cushion or folded towel under the knees if the floor is uncomfortable",
    precautions:
      "Keep the range small if your back is irritable. Avoid after certain spinal surgeries unless your therapist has cleared it.",
    featured: true,
    relatedServiceSlugs: ["back-neck-pain-care"],
  },
  {
    slug: "knee-to-chest-stretch",
    title: "Knee-to-Chest Stretch",
    categorySlug: "lower-back-core",
    purpose: "A gentle stretch for the lower back and hips.",
    summary:
      "Lying on your back, one knee is drawn towards the chest at a time, easing tension along the lower back and buttock.",
    instructions:
      "Lie on your back with knees bent and feet flat.\nBring one knee towards your chest and hold it with both hands.\nHold for twenty to thirty seconds, breathing easily.\nLower the leg slowly and repeat on the other side.",
    equipment: "A bed or exercise mat",
    precautions:
      "Keep the other foot on the floor for support. Ease off if you feel discomfort in the hip rather than a stretch.",
    featured: false,
    relatedServiceSlugs: ["back-neck-pain-care"],
  },
  {
    slug: "pelvic-tilt",
    title: "Pelvic Tilt",
    categorySlug: "lower-back-core",
    purpose:
      "Teaches conscious control of the lower-back and abdominal muscles — a foundation exercise for many back programmes.",
    summary:
      "While lying down, the lower back is gently flattened against the floor using the deep abdominal muscles.",
    instructions:
      "Lie on your back with knees bent and feet flat, arms by your sides.\nGently flatten the small of your back towards the floor by tightening the lower abdomen.\nHold for five to ten seconds while breathing normally.\nRelease and repeat.",
    equipment: "A bed or exercise mat",
    precautions:
      "The movement is small — your hips should not visibly lift. Stop if it provokes back pain.",
    featured: false,
    relatedServiceSlugs: ["back-neck-pain-care", "post-surgical-rehabilitation"],
  },
  {
    slug: "glute-bridge",
    title: "Glute Bridge",
    categorySlug: "hip-glutes",
    purpose:
      "Strengthens the gluteal muscles while teaching the trunk to stay steady — used in hip, knee, and back programmes.",
    summary:
      "Lying on your back with knees bent, the hips are lifted until the body forms a straight line from knees to shoulders.",
    instructions:
      "Lie on your back with knees bent and feet flat, hip-width apart.\nPush through the heels and lift the hips until the body is straight from knees to shoulders.\nHold briefly at the top, then lower slowly with control.",
    equipment: "An exercise mat",
    precautions:
      "Lift only as high as you can keep the hips level. Stop if you feel pinching at the front of the hips.",
    featured: true,
    relatedServiceSlugs: ["orthopaedic-physiotherapy", "sports-injury-rehabilitation"],
  },
  {
    slug: "straight-leg-raise",
    title: "Straight Leg Raise",
    categorySlug: "knee",
    purpose:
      "Maintains and rebuilds quadriceps (front-of-thigh) strength while protecting the knee — common after knee surgery and injury.",
    summary:
      "Lying down, one leg is kept straight and lifted a small distance off the supporting surface, holding briefly.",
    instructions:
      "Lie on your back with one knee bent and the other leg straight.\nTighten the thigh of the straight leg, pointing the knee upwards.\nLift the straight leg to about the height of the bent knee.\nHold briefly, then lower with control.",
    equipment: "A bed or exercise mat",
    precautions:
      "Keep the lower back relaxed — the working leg does the lifting. Follow your therapist's guidance on repetitions after surgery.",
    featured: false,
    relatedServiceSlugs: ["post-surgical-rehabilitation", "orthopaedic-physiotherapy"],
  },
  {
    slug: "quad-set",
    title: "Quad Set",
    categorySlug: "knee",
    purpose:
      "A very early quadriceps activation exercise, often taught right after knee surgery or during flare-ups.",
    summary:
      "With the leg supported and straight, the thigh muscles are tightened to press the knee gently downwards — no visible movement.",
    instructions:
      "Sit or lie with the leg extended and supported.\nTighten the muscles on the front of the thigh, pressing the back of the knee down.\nHold for five to ten seconds.\nRelax completely and repeat.",
    equipment: "A rolled towel under the ankle (optional)",
    precautions:
      "The movement is muscular, not visible — the foot should stay still. Discontinue if it provokes knee pain.",
    featured: false,
    relatedServiceSlugs: ["post-surgical-rehabilitation"],
  },
  {
    slug: "ankle-pumps",
    title: "Ankle Pumps",
    categorySlug: "ankle-foot",
    purpose:
      "Keeps circulation moving and the calf muscles awake — commonly advised after surgery or long periods of rest.",
    summary:
      "A simple up-and-down pumping movement of the foot at the ankle, done slowly and repeatedly.",
    instructions:
      "Sit or lie with the leg supported.\nPoint the foot downwards, then pull it up towards you, moving through the full comfortable range.\nKeep the movement slow and rhythmic.",
    equipment: "None",
    precautions:
      "Keep it pain-free. If advised after surgery, follow the schedule your clinical team gave you.",
    featured: true,
    relatedServiceSlugs: ["post-surgical-rehabilitation", "inpatient-daycare-rehabilitation"],
  },
  {
    slug: "wall-calf-stretch",
    title: "Wall Calf Stretch",
    categorySlug: "ankle-foot",
    purpose: "Maintains calf length — relevant for walking, stairs, and ankle stiffness.",
    summary:
      "With hands on a wall, one leg steps back and the heel is kept down to stretch the calf.",
    instructions:
      "Stand facing a wall with hands on it for support.\nStep one foot back, keeping it flat on the floor and that knee straight.\nLean gently forward until a stretch is felt in the calf of the back leg.\nHold for twenty to thirty seconds, then change sides.",
    equipment: "A wall or sturdy support",
    precautions:
      "Keep the back heel down and the toes pointing forward. Ease off if the stretch becomes sharp.",
    featured: false,
    relatedServiceSlugs: ["sports-injury-rehabilitation", "neurological-rehabilitation"],
  },
];

/* -------------------------------------------------------------- services */

interface ServiceSeed {
  slug: string;
  name: string;
  categorySlug: string;
  tagline: string;
  summary: string;
  description: string;
  conditions: string[];
  approach: string;
  faqs: FaqItem[];
  imageUrl: string;
  featured: boolean;
  sortOrder: number;
  seoTitle?: string;
  seoDescription?: string;
}

const SERVICE_SEEDS: ServiceSeed[] = [
  {
    slug: "orthopaedic-physiotherapy",
    imageUrl: "/images/photo-manual-therapy.jpg",
    name: "Orthopaedic Physiotherapy",
    categorySlug: "orthopaedic",
    tagline: "Assessment and treatment for joints, muscles, and movement",
    summary:
      "Physiotherapy assessment and treatment for musculoskeletal concerns — from persisting joint discomfort to post-fracture stiffness.",
    description:
      "Orthopaedic physiotherapy focuses on how your bones, joints, muscles, and ligaments work together. A session typically begins with a physical assessment and a conversation about your daily demands — work, walking, stairs, sleep — before a treatment plan is drawn up.\n\nTreatment may combine manual therapy, graded exercise programmes, mobility work, and advice on managing symptoms at home. The plan is reviewed as you progress.",
    conditions: [
      "Joint pain and stiffness",
      "Muscle strains and tightness",
      "Arthritis-related discomfort",
      "Post-fracture stiffness",
      "Tendon complaints",
    ],
    approach:
      "Assessment first, then a structured plan: manual therapy where useful, progressive exercise, and clear guidance on what you can safely do at home between visits.",
    faqs: [
      {
        question: "What should I bring to my first visit?",
        answer:
          "Any relevant reports — X-rays, scans, discharge summaries, or a list of current medication — and comfortable clothing you can move in.",
      },
      {
        question: "Do I need a doctor's referral?",
        answer:
          "You may book directly. If you are recovering from surgery, bring the surgeon's instructions so your programme respects them.",
      },
    ],
    featured: true,
    sortOrder: 1,
    seoTitle: "Orthopaedic Physiotherapy in Rajamahendravaram",
    seoDescription:
      "Orthopaedic physiotherapy assessment and treatment at Raphael Physiotherapy & Rehabilitation Centre, Jampet Road, Rajamahendravaram.",
  },
  {
    slug: "back-neck-pain-care",
    imageUrl: "/images/photo-band-gym.jpg",
    name: "Back & Neck Pain Care",
    categorySlug: "orthopaedic",
    tagline: "Care for the most common reasons people seek physiotherapy",
    summary:
      "Structured assessment and graded care for back and neck complaints, with a focus on understanding triggers and restoring comfortable movement.",
    description:
      "Back and neck pain are among the most common reasons people visit a physiotherapist. Care begins with an assessment to understand the pattern — what eases it, what provokes it, and how it affects sleep, work, and daily activity.\n\nA typical plan combines graded movement, mobility work, postural education for your actual daily routine, and simple strategies to manage flare-ups. The goal is comfortable, confident movement — not just short-term relief.",
    conditions: [
      "Non-specific back pain",
      "Neck stiffness and tension",
      "Radiating pain to arm or leg",
      "Posture-related strain",
      "Work and desk-related discomfort",
    ],
    approach:
      "Assessment, education about your pain pattern, graded exercise, and practical changes to the activities that matter to you.",
    faqs: [
      {
        question: "Is exercise safe when my back hurts?",
        answer:
          "For most common back pain, carefully graded movement is part of recovery — but the right starting point differs for everyone, which is why it is assessed first.",
      },
    ],
    featured: true,
    sortOrder: 2,
    seoTitle: "Back & Neck Pain Physiotherapy — Rajamahendravaram",
    seoDescription:
      "Assessment and graded physiotherapy care for back and neck pain in Rajamahendravaram at Raphael Physiotherapy & Rehabilitation Centre.",
  },
  {
    slug: "post-surgical-rehabilitation",
    imageUrl: "/images/photo-gait-training.jpg",
    name: "Post-Surgical Rehabilitation",
    categorySlug: "orthopaedic",
    tagline: "Recovery support after orthopaedic procedures",
    summary:
      "Structured rehabilitation after procedures such as joint replacement, ligament repair, or fracture fixation — progressed at a pace that respects your surgical team's instructions.",
    description:
      "Rehabilitation after surgery is a progressive process. If you are recovering from a joint replacement, ligament repair, spinal procedure, or fracture fixation, your programme is built around your surgeon's protocol and your own recovery milestones.\n\nSessions typically progress from early mobility and swelling management, through strength and control work, towards the activities you need back — walking confidently, climbing stairs, returning to work or sport. Family members who will support you at home are welcome to join sessions.",
    conditions: [
      "Joint replacement recovery",
      "Ligament and tendon repair rehabilitation",
      "Fracture fixation recovery",
      "Spinal surgery rehabilitation",
    ],
    approach:
      "Protocol-aware progression: early mobility, swelling and pain management, then graded strengthening towards your daily activities, with home guidance at every stage.",
    faqs: [
      {
        question: "When should rehabilitation start after surgery?",
        answer:
          "Follow your surgical team's guidance — some protocols begin within days, others later. Bring your discharge summary so the plan can respect it.",
      },
    ],
    featured: false,
    sortOrder: 3,
    seoTitle: "Post-Surgical Rehabilitation — Rajamahendravaram",
    seoDescription:
      "Post-surgical physiotherapy rehabilitation after joint replacement, ligament repair, and fracture fixation in Rajamahendravaram.",
  },
  {
    slug: "sports-injury-rehabilitation",
    imageUrl: "/images/photo-therapist-band.jpg",
    name: "Sports Injury Rehabilitation",
    categorySlug: "sports",
    tagline: "From first assessment back to confident movement",
    summary:
      "Rehabilitation for sports and activity-related injuries — sprains, strains, and tendon complaints — with return-to-activity conditioning.",
    description:
      "Sports injuries benefit from rehabilitation that respects both healing tissue and your goals. Whether you run, play club sport, cycle, or simply refuse to slow down, the programme is built around the movements your activity demands.\n\nExpect an assessment of the injury and the way you move, progressive strength and control work, load management guidance, and a graded path back to activity.",
    conditions: [
      "Ankle sprains",
      "Hamstring and muscle strains",
      "Knee injuries",
      "Tendon complaints (e.g. Achilles, patellar)",
      "Shoulder injuries in overhead sports",
    ],
    approach:
      "Assessment, progressive loading, movement re-training, and a graded return to your sport or activity.",
    faqs: [
      {
        question: "Can I keep training while injured?",
        answer:
          "Often some form of training is possible — the assessment identifies what can be safely modified versus rested.",
      },
    ],
    featured: false,
    sortOrder: 4,
  },
  {
    slug: "neurological-rehabilitation",
    imageUrl: "/images/photo-gait-training.jpg",
    name: "Neurological Rehabilitation",
    categorySlug: "neurological",
    tagline: "Movement, balance, and everyday function",
    summary:
      "Function-focused rehabilitation for people living with neurological conditions, in frequencies from day-care visits to in-patient programmes.",
    description:
      "Neurological rehabilitation supports people living with conditions such as stroke, Parkinson's disease, and other neurological diagnoses. Sessions work on the practical building blocks of independence — sitting and standing balance, walking, transferring safely, and using the affected side in daily tasks.\n\nFamily members and caregivers are encouraged to be involved, so that progress made in sessions continues at home. Programmes are adjusted to stamina and ability, and can run as day-care visits or as part of an in-patient stay.",
    conditions: [
      "Stroke rehabilitation",
      "Parkinson's disease support",
      "Balance and gait training",
      "Post-neurological-surgery recovery",
      "Other neurological conditions (as assessed)",
    ],
    approach:
      "Task-focused training, balance and gait work, caregiver involvement, and careful pacing — delivered in day-care or in-patient formats where suitable.",
    faqs: [
      {
        question: "Is neurological rehabilitation only for recent diagnoses?",
        answer:
          "No. People at different stages — recently discharged or living with longer-term conditions — can benefit from assessment and a tailored programme.",
      },
    ],
    featured: false,
    sortOrder: 5,
  },
  {
    slug: "inpatient-daycare-rehabilitation",
    imageUrl: "/images/photo-inpatient-room.jpg",
    name: "In-Patient & Day Care Rehabilitation",
    categorySlug: "inpatient-daycare",
    tagline: "Structured rehabilitation at the centre",
    summary:
      "Structured rehabilitation programmes delivered at the centre in two formats — in-patient stays for people who need daily supported rehabilitation, and day care for those who attend sessions and return home the same day.",
    description:
      "The centre is set up for two complementary formats of rehabilitation.\n\nIn-patient rehabilitation is for people who benefit from staying at the centre — typically after surgery, a stroke, or an injury that needs daily supported rehabilitation. Days are structured around therapy sessions, rest, and planned progression, with family kept informed and involved in discharge planning.\n\nDay care rehabilitation suits people who are medically stable at home but need intensive, regular input — attending scheduled sessions through the day and returning home in the evening.\n\nWhich format fits is a clinical decision made with the patient and family. Speak to the centre directly to discuss a specific situation.",
    conditions: [
      "Post-surgical recovery requiring daily rehabilitation",
      "Stroke and neurological rehabilitation phases",
      "Recovery after prolonged hospital stays",
      "Deconditioning and mobility decline",
    ],
    approach:
      "A daily structure of physiotherapy and rehabilitation sessions, monitored progression, caregiver training, and planned discharge to home routines.",
    faqs: [
      {
        question: "How do I know whether in-patient or day care is suitable?",
        answer:
          "That depends on the clinical situation. Call the centre and describe it — the team will advise which format fits and what an admission would involve.",
      },
      {
        question: "Can family stay or visit?",
        answer:
          "Family involvement is part of the rehabilitation plan, especially for in-patient stays. Ask the centre about visiting arrangements.",
      },
    ],
    featured: true,
    sortOrder: 6,
  },
];

/* --------------------------------------------------------- derived layers */

const serviceCategoryBySlug = new Map(
  BAKED_SERVICE_CATEGORIES.map((c) => [c.slug, c])
);
const exerciseCategoryBySlug = new Map(
  BAKED_EXERCISE_CATEGORIES.map((c) => [c.slug, c])
);
const serviceSeedBySlug = new Map(SERVICE_SEEDS.map((s) => [s.slug, s]));

/**
 * Published exercises with their category and related-service relations
 * filled in — exactly what the exercise pages consume.
 */
export const BAKED_EXERCISES: CatalogExercise[] = EXERCISE_SEEDS.map(
  (e, index) => {
    const category = exerciseCategoryBySlug.get(e.categorySlug) ?? null;
    const services = e.relatedServiceSlugs
      .map((slug) => serviceSeedBySlug.get(slug))
      .filter((s): s is ServiceSeed => Boolean(s))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ slug: s.slug, name: s.name, tagline: s.tagline }));
    return {
      id: `baked-exercise-${e.slug}`,
      categoryId: category?.id ?? null,
      title: e.title,
      slug: e.slug,
      purpose: e.purpose,
      summary: e.summary,
      instructions: e.instructions,
      frequency: null, // only set when specifically approved by the clinic
      equipment: e.equipment,
      imageUrl: null,
      videoUrl: null,
      youtubeUrl: null,
      precautions: e.precautions,
      attribution: null,
      featured: e.featured,
      status: "published",
      sortOrder: index + 1,
      createdAt: BAKED_CONTENT_DATE,
      updatedAt: BAKED_CONTENT_DATE,
      category,
      services,
    };
  }
);

/**
 * Published services with their category ref and related-exercise relations
 * (published exercises that point back at the service, capped at 4 — the
 * same shape the service detail page's Prisma include returns).
 */
export const BAKED_SERVICES: CatalogService[] = SERVICE_SEEDS.map((s) => {
  const category = serviceCategoryBySlug.get(s.categorySlug) ?? null;
  const exercises = BAKED_EXERCISES.filter((e) =>
    e.services.some((rel) => rel.slug === s.slug)
  ).map((e) => ({
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    category: e.category ? { name: e.category.name } : null,
  }));
  return {
    id: `baked-service-${s.slug}`,
    categoryId: category?.id ?? null,
    name: s.name,
    slug: s.slug,
    tagline: s.tagline,
    summary: s.summary,
    description: s.description,
    conditions: JSON.stringify(s.conditions),
    approach: s.approach,
    faqs: JSON.stringify(s.faqs),
    imageUrl: s.imageUrl,
    featured: s.featured,
    status: "published",
    seoTitle: s.seoTitle ?? null,
    seoDescription: s.seoDescription ?? null,
    sortOrder: s.sortOrder,
    createdAt: BAKED_CONTENT_DATE,
    updatedAt: BAKED_CONTENT_DATE,
    category: category ? { name: category.name, slug: category.slug } : null,
    exercises,
  };
});

/* --------------------------------------------------------- operating hours */

/** Draft hours pending clinic confirmation — identical to the seed rows. */
export const BAKED_HOURS: BakedDayHours[] = Array.from(
  { length: 7 },
  (_, day) => ({
    dayOfWeek: day,
    isOpen: day !== 0, // Sunday closed
    sessions:
      day === 0
        ? []
        : [
            { start: "09:00", end: "13:00" },
            { start: "14:00", end: "18:00" },
          ],
  })
);

/* ------------------------------------------------------------------- admins */

/**
 * The clinic's baked admin identities — the last-resort authorization list
 * for Firebase sign-ins on database-less deployments (Vercel).
 *
 * The seed creates the same identity in SQLite from ADMIN_EMAIL/ADMIN_NAME
 * (defaults below), and the Firebase Auth account for the primary email was
 * created from the same source — so "the email the clinic signs in with"
 * resolves identically on every tier: AdminUser row → ADMIN_FIREBASE_EMAILS
 * env → Firestore `admins` docs (scripts/firestore-seed.ts mirrors the rows)
 * → this constant. Firebase sign-in ALONE is never enough: the verified
 * email must match one of those tiers before a session is issued.
 */
export interface BakedAdmin {
  email: string;
  name: string;
  role: string; // "admin" | "staff"
}

export const BAKED_ADMINS: BakedAdmin[] = [
  {
    email: "admin@raphaelphysio.local",
    name: "Clinic Administrator",
    role: "admin",
  },
];

/* -------------------------------------------------------------- seed data */

/**
 * Plain seed shapes (no ids/relations) for prisma/seed.ts, so the database
 * and the baked fallback are populated from ONE definition of the content.
 */
export const SERVICE_SEED_ROWS = SERVICE_SEEDS;
export const EXERCISE_SEED_ROWS = EXERCISE_SEEDS;
