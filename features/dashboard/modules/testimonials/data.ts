import type { Testimonial, TestimonialStatus } from "./types";

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

const STATUSES: TestimonialStatus[] = ["published", "published", "published", "pending", "hidden"];

/** [author, role, location, quote, rating] */
const ITEMS: [string, string, string, string, number][] = [
  ["Amelia Clarke", "Solo traveller", "London, UK", "Booking was effortless and the resort exceeded every expectation. I'll never use another platform.", 5],
  ["Rajesh Patel", "Business traveller", "Mumbai, India", "Fast checkout, honest pricing and my airport transfer was waiting. Exactly what a business trip needs.", 5],
  ["Sofia Moretti", "Family traveller", "Milan, Italy", "The family suite was spotless and the kids' club made our week. Customer support answered in minutes.", 4],
  ["Liam O'Connor", "Couple", "Dublin, Ireland", "Romantic getaway sorted in ten minutes. The map view helped us pick the perfect beachfront spot.", 5],
  ["Yuki Tanaka", "Solo traveller", "Tokyo, Japan", "Loved the transparent cancellation policy. Changed my dates twice with zero fuss.", 4],
  ["Grace Mwangi", "Group organiser", "Nairobi, Kenya", "Organising a stay for twelve people is usually chaos — this made it genuinely simple.", 5],
  ["Carlos Herrera", "Business traveller", "Madrid, Spain", "Invoicing and receipts were immaculate, which my finance team appreciated more than I did.", 4],
  ["Nadia Haddad", "Couple", "Dubai, UAE", "Beautiful resorts and the loyalty rewards actually add up. Booked our third trip this year.", 5],
  ["Emma Novak", "Family traveller", "Prague, Czechia", "A hiccup with our room was resolved instantly with a free upgrade. That's how you keep customers.", 4],
  ["Tomás Silva", "Solo traveller", "Lisbon, Portugal", "Clean interface, great filters, and the reviews were spot on. Highly recommend.", 5],
  ["Aisha Bello", "Group organiser", "Lagos, Nigeria", "Waiting on a response about our group discount before I book again.", 3],
  ["Henrik Larsen", "Business traveller", "Copenhagen, Denmark", "Decent selection but I'd love more filtering on workspace amenities.", 3],
];

export const TESTIMONIALS_SEED: Testimonial[] = ITEMS.map(
  ([author, role, location, quote, rating], i) => ({
    id: `tst_${1000 + i}`,
    author,
    role,
    location,
    quote,
    rating,
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 5) % 80),
  }),
);
