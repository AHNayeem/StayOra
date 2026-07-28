/**
 * UI translations keyed by the English source string, so a component can call
 * `t("Sign In")` and get the active language's version — falling back to the
 * English source when a language or a specific key is missing. This keeps the
 * call sites readable and lets untranslated copy render as-is.
 *
 * Only languages with real translations need an entry here; every other
 * language (and any missing key) passes the English source straight through.
 * Coverage is the core site chrome — primary nav, header actions, the hero
 * search widget, section headings and the footer.
 */

export type Dictionary = Record<string, string>;

/** Bangla (বাংলা) — the reference translation for the prototype. */
const bn: Dictionary = {
  // — Primary navigation —
  Home: "হোম",
  Tours: "ট্যুর",
  Destinations: "গন্তব্য",
  "About Us": "আমাদের সম্পর্কে",
  Pages: "পেজ",
  Blog: "ব্লগ",
  "Contact Us": "যোগাযোগ",
  Contact: "যোগাযোগ",

  // — Mega-menu / footer column headings —
  Stays: "থাকার জায়গা",
  "Book & Go": "বুক করে যাত্রা",
  Company: "কোম্পানি",
  Explore: "এক্সপ্লোর",
  "Get in touch": "যোগাযোগ করুন",

  // — Verticals (plural labels used in nav, footer and search tabs) —
  Hotels: "হোটেল",
  Apartments: "অ্যাপার্টমেন্ট",
  Resorts: "রিসোর্ট",
  "Shared Rooms": "শেয়ারড রুম",
  "Convention Halls": "কনভেনশন হল",
  Transport: "পরিবহন",
  Activities: "অ্যাক্টিভিটি",
  "All Visa": "সকল ভিসা",

  // — Company links —
  FAQs: "সাধারণ জিজ্ঞাসা",
  "Terms & Conditions": "শর্তাবলী",

  // — Header actions —
  "Sign In": "সাইন ইন",
  "Sign Up": "সাইন আপ",
  "Open menu": "মেনু খুলুন",
  Search: "খুঁজুন",

  // — Hero search: field labels —
  Where: "কোথায়",
  "Check in": "চেক ইন",
  "Check out": "চেক আউট",
  Guests: "অতিথি",
  Beds: "বেড",
  "Event date": "ইভেন্টের তারিখ",
  "End date": "শেষ তারিখ",
  Attendees: "অংশগ্রহণকারী",
  "From / To": "কোথা থেকে / কোথায়",
  Departure: "যাত্রা",
  Return: "ফিরতি",
  Passengers: "যাত্রী",
  Destination: "গন্তব্য",
  From: "থেকে",
  To: "পর্যন্ত",
  Date: "তারিখ",
  Travellers: "ভ্রমণকারী",
  "Destination country": "গন্তব্য দেশ",
  Applicants: "আবেদনকারী",

  // — Hero search: placeholders & prompts —
  "Search destinations": "গন্তব্য খুঁজুন",
  "City, area or apartment": "শহর, এলাকা বা অ্যাপার্টমেন্ট",
  "City or venue": "শহর বা ভেন্যু",
  "Pickup or route": "পিকআপ বা রুট",
  "Where to?": "কোথায় যাবেন?",
  "City or activity": "শহর বা অ্যাক্টিভিটি",
  "Where are you travelling?": "কোথায় ভ্রমণ করছেন?",
  "Add dates": "তারিখ যোগ করুন",
  "Add date": "তারিখ যোগ করুন",
  "Add guests": "অতিথি যোগ করুন",
  night: "রাত",
  nights: "রাত",

  // — Footer —
  "Subscribe to our newsletter": "আমাদের নিউজলেটার সাবস্ক্রাইব করুন",
  "Your email": "আপনার ইমেইল",
  Subscribe: "সাবস্ক্রাইব",
  "All rights reserved.": "সর্বস্বত্ব সংরক্ষিত।",

  // — Homepage section eyebrows & titles —
  "Top destinations": "শীর্ষ গন্তব্য",
  "Explore popular places to stay": "জনপ্রিয় থাকার জায়গা এক্সপ্লোর করুন",
  "Popular tours": "জনপ্রিয় ট্যুর",
  "Trips worth taking": "যে ট্রিপগুলো নেওয়ার মতো",
  "Popular hotels": "জনপ্রিয় হোটেল",
  "Stays our guests rate highest": "অতিথিদের সর্বোচ্চ রেটিং পাওয়া থাকার জায়গা",
  "Things to do": "করণীয় কাজ",
  "Experiences to remember": "মনে রাখার মতো অভিজ্ঞতা",
  "Getting around": "চলাচল",
  "Transport for every route": "প্রতিটি রুটের জন্য পরিবহন",
  "Why book with us": "কেন আমাদের সাথে বুক করবেন",
  "Travel with total confidence": "পূর্ণ আস্থায় ভ্রমণ করুন",
  "Phenomenal deals": "দুর্দান্ত অফার",
  "Limited-time offers": "সীমিত সময়ের অফার",
  "From the blog": "ব্লগ থেকে",
  "Travel inspiration & tips": "ভ্রমণ অনুপ্রেরণা ও টিপস",
  "Loved by travellers": "ভ্রমণকারীদের পছন্দের",
  "What our guests say": "আমাদের অতিথিরা যা বলেন",
  "Travel documents": "ভ্রমণ নথি",
  "Visa services made simple": "ভিসা সেবা সহজ করা হয়েছে",
  "Fun facts": "মজার তথ্য",
  "Trusted by travellers worldwide": "বিশ্বজুড়ে ভ্রমণকারীদের আস্থা",
  "Featured resorts": "বাছাই করা রিসোর্ট",
  "Escapes worth every mile": "প্রতিটি মাইলের যোগ্য গন্তব্য",
  "Featured apartments": "বাছাই করা অ্যাপার্টমেন্ট",
  "Feel at home, anywhere": "যেকোনো জায়গায় ঘরের অনুভূতি",
  "Where to next": "এরপর কোথায়",
  "Trending destinations": "ট্রেন্ডিং গন্তব্য",
  "Go global": "বিশ্বজুড়ে",
  "Browse by country": "দেশ অনুযায়ী ব্রাউজ করুন",
  "All-in-one trips": "সব-এক-সাথে ট্রিপ",
  "Trending packages": "ট্রেন্ডিং প্যাকেজ",
  "Ends soon": "শীঘ্রই শেষ",
  "Flash deals": "ফ্ল্যাশ ডিল",
  "Find your vibe": "আপনার পছন্দ খুঁজুন",
  "Travel inspiration": "ভ্রমণ অনুপ্রেরণা",
  "Recognised worldwide": "বিশ্বজুড়ে স্বীকৃত",
  "Award-winning service": "পুরস্কারপ্রাপ্ত সেবা",
  "Good to know": "জেনে রাখা ভালো",
  "Frequently asked questions": "সাধারণ জিজ্ঞাসা",
  "Trusted by leading travel brands worldwide": "বিশ্বের শীর্ষ ভ্রমণ ব্র্যান্ডের আস্থা",
  "Your next trip starts here": "আপনার পরবর্তী ট্রিপ এখান থেকেই শুরু",
  "Ready to plan your next journey?": "আপনার পরবর্তী যাত্রার পরিকল্পনা করতে প্রস্তুত?",
  "About StayOra": "স্টেঅরা সম্পর্কে",
  "One platform for every kind of stay and journey":
    "সব ধরনের থাকা ও যাত্রার জন্য এক প্ল্যাটফর্ম",
  "Members save more": "সদস্যরা বেশি সাশ্রয় করেন",
  "Get 10% off your first booking": "প্রথম বুকিংয়ে ১০% ছাড় পান",
  "Stay in the loop": "আপডেট থাকুন",
  "Get the best travel deals in your inbox": "সেরা ভ্রমণ অফার আপনার ইনবক্সে পান",
};

/**
 * Per-language dictionaries. A language absent here (e.g. "fr") simply renders
 * the English source for every key — the switcher still works, copy stays
 * English until a dictionary is added.
 */
export const DICTIONARIES: Record<string, Dictionary> = { bn };
