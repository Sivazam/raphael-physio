/**
 * Honest alt text and intrinsic dimensions for the illustrative photography
 * attached to seeded services. The photos are sourced/AI-generated stand-ins
 * (see public/asset-attribution.md once published) — never presented as
 * clinic photographs, so every alt string begins with "Illustrative photo:".
 */

export interface ServiceImageMeta {
  alt: string;
  width: number;
  height: number;
}

const IMAGE_META: Record<string, ServiceImageMeta> = {
  "/images/photo-manual-therapy.jpg": {
    alt: "Illustrative photo: a physiotherapist performing a manual therapy technique on a patient's neck in a bright treatment room.",
    width: 1344,
    height: 768,
  },
  "/images/photo-band-gym.jpg": {
    alt: "Illustrative photo: a therapist assisting an older patient with a resistance-band exercise in a rehabilitation gym.",
    width: 1260,
    height: 720,
  },
  "/images/photo-gait-training.jpg": {
    alt: "Illustrative photo: a therapist supporting a patient practising walking between parallel bars.",
    width: 1312,
    height: 736,
  },
  "/images/photo-therapist-band.jpg": {
    alt: "Illustrative photo: a physiotherapist guiding an older patient through a resistance-band exercise in a bright clinic.",
    width: 1600,
    height: 1127,
  },
  "/images/photo-inpatient-room.jpg": {
    alt: "Illustrative photo: a calm patient room prepared for in-patient rehabilitation, with a walking frame beside the bed.",
    width: 1344,
    height: 768,
  },
};

/** Fallback for admin-uploaded images without curated alt text. */
export function serviceImageMeta(
  imageUrl: string | null | undefined
): ServiceImageMeta | null {
  if (!imageUrl) return null;
  return (
    IMAGE_META[imageUrl] ?? {
      alt: "Illustrative photo for this service.",
      width: 1344,
      height: 768,
    }
  );
}
