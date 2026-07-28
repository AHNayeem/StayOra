import type { MediaAsset, MediaType } from "./types";

/** Deterministic epoch — no module-load clock (keeps seeds stable across renders). */
function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

const UPLOADERS = ["AH Nayeem", "Ben Silva", "Chen Wong", "Dana Meyer"];

/** [name, type, folder, sizeKB, dimensions] */
const ASSETS: [string, MediaType, string, number, string][] = [
  ["hero-maldives.jpg", "image", "banners", 842, "2400×1200"],
  ["hero-alps-winter.jpg", "image", "banners", 771, "2400×1200"],
  ["promo-summer-sale.png", "image", "promotions", 318, "1600×900"],
  ["resort-poolside.jpg", "image", "listings", 655, "1920×1080"],
  ["apartment-loft.jpg", "image", "listings", 512, "1920×1080"],
  ["city-guide-london.jpg", "image", "blog", 489, "1600×1067"],
  ["testimonial-avatar-01.png", "image", "testimonials", 96, "512×512"],
  ["testimonial-avatar-02.png", "image", "testimonials", 88, "512×512"],
  ["brand-logo-dark.svg", "image", "brand", 14, "512×512"],
  ["brand-logo-light.svg", "image", "brand", 14, "512×512"],
  ["walkthrough-booking.mp4", "video", "guides", 18_400, "1920×1080"],
  ["destination-reel.mp4", "video", "promotions", 24_100, "1080×1920"],
  ["terms-of-service.pdf", "document", "legal", 244, ""],
  ["merchant-agreement.pdf", "document", "legal", 312, ""],
  ["press-kit.pdf", "document", "brand", 1_820, ""],
  ["invoice-template.pdf", "document", "finance", 96, ""],
  ["welcome-jingle.mp3", "audio", "notifications", 640, ""],
  ["rate-card-2026.pdf", "document", "finance", 128, ""],
  ["banner-eid-offer.png", "image", "promotions", 402, "1600×900"],
  ["gallery-santorini.jpg", "image", "listings", 708, "1920×1280"],
  ["gallery-kyoto.jpg", "image", "listings", 664, "1920×1280"],
  ["faq-illustration.svg", "image", "blog", 22, "800×600"],
];

export const MEDIA_SEED: MediaAsset[] = ASSETS.map(
  ([name, type, folder, sizeKB, dimensions], i) => ({
    id: `media_${600 + i}`,
    name,
    type,
    folder,
    url: `https://cdn.otithee.example/${folder}/${name}`,
    size: sizeKB * 1024,
    dimensions,
    uploadedBy: UPLOADERS[i % UPLOADERS.length],
    uploadedAt: iso((i * 4) % 90),
  }),
);
