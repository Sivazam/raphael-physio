/**
 * Initial content seed for Raphael Physiotherapy & Rehabilitation Centre.
 *
 * Content policy (see docs/content-needed.md):
 * - Contact details come from verified public listings.
 * - Service copy describes physiotherapy practice in general, professional
 *   terms and makes NO outcome or cure promises. All of it is flagged for
 *   clinic approval before launch and can be unpublished in /admin.
 * - Therapists are seeded as DRAFTS ONLY (no real names were provided).
 * - Patient stories are seeded as a DRAFT TEMPLATE ONLY (no consent on file).
 * - Exercises are general educational content, never framed as prescriptions.
 * - No impact statistics are seeded as verified.
 * - Operating hours are configurable DRAFTS pending clinic confirmation.
 */

import { PrismaClient } from "@prisma/client";
import { scryptHash } from "../src/lib/auth-crypto";

const db = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@raphaelphysio.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMe#2025";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Clinic Administrator";

async function main() {
  console.log("Seeding database…");

  // ---------------------------------------------------------------- settings
  await db.clinicSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      phonePrimary: "+919959274929",
      phoneAlternate: "08832470757",
      email: "raphaelphysiotherapyclinic@gmail.com",
      addressLine1: "26-3-23/3, Ground Floor",
      addressLine2:
        "Beside Sunstar Hospital and Venki's Delight, Jampet Road",
      addressLine3: "Opposite Hotel Anand Regency, Kambala Peta",
      city: "Rajamahendravaram",
      state: "Andhra Pradesh",
      postcode: "533103",
      country: "India",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Raphael+Physiotherapy+and+Rehabilitation+Centre+Jampet+Road+Rajamahendravaram",
      googleReviewsUrl:
        "https://www.google.com/maps/search/?api=1&query=Raphael+Physiotherapy+and+Rehabilitation+Centre+Jampet+Road+Rajamahendravaram",
      bookingMode: "internal",
      sundayBookingEnabled: false, // discovery-call requirement; configurable
      minBookingDateOffset: 1,
      maxBookingDateOffset: 30,
      slotDurationMinutes: 30,
      bookingNotes:
        "This sends an appointment request — our team will confirm the slot by phone.",
      smsProvider: "msg91",
      smsReminderHours: 24,
      // Social links intentionally absent: profiles not verified yet.
    },
  });

  // --------------------------------------------------------- operating hours
  // DRAFT hours pending clinic confirmation (see docs/content-needed.md).
  const weekdaySessions = JSON.stringify([
    { start: "09:00", end: "13:00" },
    { start: "14:00", end: "18:00" },
  ]);
  for (let day = 0; day <= 6; day++) {
    const isSunday = day === 0;
    await db.operatingHour.upsert({
      where: { dayOfWeek: day },
      update: {},
      create: {
        dayOfWeek: day,
        isOpen: !isSunday,
        sessions: isSunday ? "[]" : weekdaySessions,
      },
    });
  }

  // ------------------------------------------------------------- categories
  const cat = async (name: string, slug: string, description: string, status: string, sortOrder: number) =>
    db.serviceCategory.upsert({
      where: { slug },
      update: { name, description, status, sortOrder },
      create: { name, slug, description, status, sortOrder },
    });

  await cat(
    "Orthopaedic & Musculoskeletal Care",
    "orthopaedic",
    "Assessment and physiotherapy for bones, joints, muscles, and post-surgical recovery.",
    "published",
    1,
  );
  await cat(
    "Sports & Active Lifestyles",
    "sports",
    "Rehabilitation and conditioning for people who train, play, or stay active.",
    "published",
    2,
  );
  await cat(
    "Neurological Rehabilitation",
    "neurological",
    "Movement and function-focused rehabilitation for neurological conditions.",
    "published",
    3,
  );
  await cat(
    "In-Patient & Day Care",
    "inpatient-daycare",
    "Structured rehabilitation at the centre, in in-patient and day-care formats.",
    "published",
    4,
  );
  await cat(
    "Additional Therapies — pending confirmation",
    "additional-therapies",
    "Public listings hint at further offerings. These stay drafts until the clinic confirms them.",
    "draft",
    9,
  );

  // ---------------------------------------------------------------- services
  type ServiceSeed = {
    slug: string;
    name: string;
    categorySlug: string;
    tagline: string;
    summary: string;
    description: string;
    conditions: string[];
    approach: string;
    faqs: { question: string; answer: string }[];
    imageUrl?: string;
    featured: boolean;
    status: string;
    sortOrder: number;
    seoTitle?: string;
    seoDescription?: string;
  };

  const services: ServiceSeed[] = [
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
      status: "published",
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
      status: "published",
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
      status: "published",
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
      status: "published",
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
      status: "published",
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
      status: "published",
      sortOrder: 6,
    },
    // Drafts — public listings hint at these; they stay unpublished until
    // the clinic confirms they are offered (docs/content-needed.md).
    {
      slug: "acupuncture",
      name: "Acupuncture (pending confirmation)",
      categorySlug: "additional-therapies",
      tagline: "Listed publicly — awaiting clinic confirmation",
      summary:
        "Public business listings mention acupuncture. This service page remains a draft until the clinic confirms the offering and approves content.",
      description:
        "Draft placeholder. Do not publish until the clinic confirms this service and approves the description.",
      conditions: [],
      approach: null as unknown as string,
      faqs: [],
      featured: false,
      status: "draft",
      sortOrder: 90,
    },
    {
      slug: "womens-health-physiotherapy",
      name: "Women's Health Physiotherapy (pending confirmation)",
      categorySlug: "additional-therapies",
      tagline: "Listed publicly — awaiting clinic confirmation",
      summary:
        "Public business listings mention women's health. This service page remains a draft until the clinic confirms the offering and approves content.",
      description:
        "Draft placeholder. Do not publish until the clinic confirms this service and approves the description.",
      conditions: [],
      approach: null as unknown as string,
      faqs: [],
      featured: false,
      status: "draft",
      sortOrder: 91,
    },
    {
      slug: "chiropractic-osteopathy",
      name: "Chiropractic & Osteopathy (pending confirmation)",
      categorySlug: "additional-therapies",
      tagline: "Listed publicly — awaiting clinic confirmation",
      summary:
        "Public business categories mention chiropractic and osteopathy. This page remains a draft until the clinic confirms what is actually offered.",
      description:
        "Draft placeholder. Do not publish until the clinic confirms this service and approves the description.",
      conditions: [],
      approach: null as unknown as string,
      faqs: [],
      featured: false,
      status: "draft",
      sortOrder: 92,
    },
  ];

  const categories = await db.serviceCategory.findMany();
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (const s of services) {
    await db.service.upsert({
      where: { slug: s.slug },
      update: { imageUrl: s.imageUrl ?? null },
      create: {
        name: s.name,
        slug: s.slug,
        tagline: s.tagline,
        summary: s.summary,
        description: s.description,
        conditions: JSON.stringify(s.conditions),
        approach: s.approach ?? null,
        faqs: JSON.stringify(s.faqs),
        imageUrl: s.imageUrl ?? null,
        featured: s.featured,
        status: s.status,
        sortOrder: s.sortOrder,
        categoryId: catBySlug.get(s.categorySlug) ?? null,
        seoTitle: s.seoTitle ?? null,
        seoDescription: s.seoDescription ?? null,
      },
    });
  }

  // -------------------------------------------------------------- therapists
  // NO real names were provided — drafts only, never published as-is.
  const therapistDrafts = [
    {
      name: "[Add lead physiotherapist name]",
      slug: "lead-physiotherapist",
      title: "Physiotherapist",
      bio: "Replace this draft with the therapist's approved professional biography, qualifications, and areas of expertise before publishing.",
    },
    {
      name: "[Add second therapist name]",
      slug: "therapist-two",
      title: "Physiotherapist",
      bio: "Replace this draft with the therapist's approved professional biography, qualifications, and areas of expertise before publishing.",
    },
  ];
  for (const t of therapistDrafts) {
    await db.therapist.upsert({
      where: { slug: t.slug },
      update: {},
      create: { ...t, status: "draft", languages: "[]", expertise: "[]" },
    });
  }

  // ---------------------------------------------------------- patient stories
  // Draft TEMPLATE only — publishing requires documented consent.
  await db.patientStory.upsert({
    where: { slug: "example-story-template" },
    update: {},
    create: {
      title: "Example recovery story (template — not for publication)",
      slug: "example-story-template",
      conditionContext:
        "Describe the general rehabilitation context here, approved by the patient.",
      journey:
        "A short, patient-approved account of the rehabilitation journey. Replace with consented content, and attach approved before/after photographs where the patient has agreed in writing.",
      milestones: JSON.stringify([]),
      consentStatus: "pending",
      consentReference: null,
      status: "draft",
    },
  });

  // ------------------------------------------------------------------ stats
  // Intentionally empty: no verified statistics exist yet. See
  // docs/content-needed.md — statistics display only when verified=true.

  // ------------------------------------------------------------- exercises
  const exCat = async (name: string, slug: string, bodyArea: string, sortOrder: number) =>
    db.exerciseCategory.upsert({
      where: { slug },
      update: { name, bodyArea, sortOrder },
      create: { name, slug, bodyArea, sortOrder },
    });

  await exCat("Neck & Upper Back", "neck-upper-back", "Neck, shoulders, upper back", 1);
  await exCat("Shoulder", "shoulder", "Shoulders", 2);
  await exCat("Lower Back & Core", "lower-back-core", "Lower back and trunk", 3);
  await exCat("Hip & Glutes", "hip-glutes", "Hips and glutes", 4);
  await exCat("Knee", "knee", "Knees", 5);
  await exCat("Ankle & Foot", "ankle-foot", "Ankles, feet, calves", 6);

  type ExSeed = {
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
  };

  const exercises: ExSeed[] = [
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

  const exCats = await db.exerciseCategory.findMany();
  const exCatBySlug = new Map(exCats.map((c) => [c.slug, c.id]));
  const allServices = await db.service.findMany();
  const svcBySlug = new Map(allServices.map((s) => [s.slug, s]));

  for (const e of exercises) {
    const related = e.relatedServiceSlugs
      .map((slug) => svcBySlug.get(slug))
      .filter(Boolean);
    await db.exercise.upsert({
      where: { slug: e.slug },
      update: {},
      create: {
        title: e.title,
        slug: e.slug,
        purpose: e.purpose,
        summary: e.summary,
        instructions: e.instructions,
        frequency: null, // only set when specifically approved by the clinic
        equipment: e.equipment,
        precautions: e.precautions,
        featured: e.featured,
        status: "published",
        sortOrder: 0,
        categoryId: exCatBySlug.get(e.categorySlug) ?? null,
        services: { connect: related.map((s) => ({ id: s!.id })) },
      },
    });
  }

  // ------------------------------------------------------------- sync state
  await db.reviewSyncState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", provider: null, reviewCount: 0 },
  });

  // ------------------------------------------------------------ admin user
  // Always (re-)sync the admin credentials on seed so the .env password is
  // authoritative — a stale hash from an earlier run would lock staff out.
  await db.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      passwordHash: scryptHash(ADMIN_PASSWORD),
      role: "admin",
    },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash: scryptHash(ADMIN_PASSWORD),
      role: "admin",
    },
  });

  const counts = {
    services: await db.service.count(),
    exercises: await db.exercise.count(),
    categories: await db.serviceCategory.count(),
    therapists: await db.therapist.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
