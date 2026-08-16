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
 *
 * Resolution order for every lookup ({@link translate}):
 *
 *   1. an operator's edit in Localization → Translations  (`locale-settings`)
 *   2. the shipped dictionary for that language           (this file)
 *   3. the English source string
 *
 * Shipped dictionaries are Bangla and Arabic. Arabic also drives RTL, so it is
 * the language to switch to when checking direction-sensitive layout.
 */

import { localeSettings } from "./locale-settings";

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
  "About Otithee": "স্টেঅরা সম্পর্কে",
  "One platform for every kind of stay and journey":
    "সব ধরনের থাকা ও যাত্রার জন্য এক প্ল্যাটফর্ম",
  "Members save more": "সদস্যরা বেশি সাশ্রয় করেন",
  "Get 10% off your first booking": "প্রথম বুকিংয়ে ১০% ছাড় পান",
  "Stay in the loop": "আপডেট থাকুন",
  "Get the best travel deals in your inbox": "সেরা ভ্রমণ অফার আপনার ইনবক্সে পান",
};

/** Arabic (العربية) — the RTL reference translation. */
const ar: Dictionary = {
  // — Primary navigation —
  Home: "الرئيسية",
  Tours: "الجولات",
  Destinations: "الوجهات",
  "About Us": "من نحن",
  Pages: "الصفحات",
  Blog: "المدونة",
  "Contact Us": "اتصل بنا",
  Contact: "اتصل",

  // — Mega-menu / footer column headings —
  Stays: "أماكن الإقامة",
  "Book & Go": "احجز وانطلق",
  Company: "الشركة",
  Explore: "استكشف",
  "Get in touch": "تواصل معنا",

  // — Verticals —
  Hotels: "الفنادق",
  Apartments: "الشقق",
  Resorts: "المنتجعات",
  "Shared Rooms": "الغرف المشتركة",
  "Convention Halls": "قاعات المؤتمرات",
  Transport: "المواصلات",
  Activities: "الأنشطة",
  "All Visa": "جميع التأشيرات",

  // — Company links —
  FAQs: "الأسئلة الشائعة",
  "Terms & Conditions": "الشروط والأحكام",

  // — Header actions —
  "Sign In": "تسجيل الدخول",
  "Sign Up": "إنشاء حساب",
  "Open menu": "فتح القائمة",
  Search: "بحث",

  // — Hero search: field labels —
  Where: "أين",
  "Check in": "تاريخ الوصول",
  "Check out": "تاريخ المغادرة",
  Guests: "الضيوف",
  Beds: "الأسرّة",
  "Event date": "تاريخ الفعالية",
  "End date": "تاريخ الانتهاء",
  Attendees: "الحضور",
  "From / To": "من / إلى",
  Departure: "المغادرة",
  Return: "العودة",
  Passengers: "الركاب",
  Destination: "الوجهة",
  From: "من",
  To: "إلى",
  Date: "التاريخ",
  Travellers: "المسافرون",
  "Destination country": "بلد الوجهة",
  Applicants: "مقدمو الطلبات",

  // — Hero search: placeholders & prompts —
  "Search destinations": "ابحث عن وجهة",
  "City, area or apartment": "المدينة أو المنطقة أو الشقة",
  "City or venue": "المدينة أو المكان",
  "Pickup or route": "مكان الانطلاق أو المسار",
  "Where to?": "إلى أين؟",
  "City or activity": "المدينة أو النشاط",
  "Where are you travelling?": "إلى أين تسافر؟",
  "Add dates": "أضف التواريخ",
  "Add date": "أضف التاريخ",
  "Add guests": "أضف الضيوف",
  night: "ليلة",
  nights: "ليالٍ",

  // — Footer —
  "Subscribe to our newsletter": "اشترك في نشرتنا البريدية",
  "Your email": "بريدك الإلكتروني",
  Subscribe: "اشترك",
  "All rights reserved.": "جميع الحقوق محفوظة.",

  // — Homepage section eyebrows & titles —
  "Top destinations": "أفضل الوجهات",
  "Explore popular places to stay": "استكشف أماكن الإقامة الأكثر شهرة",
  "Popular tours": "الجولات الشائعة",
  "Trips worth taking": "رحلات تستحق التجربة",
  "Popular hotels": "الفنادق الشائعة",
  "Stays our guests rate highest": "أماكن الإقامة الأعلى تقييمًا من ضيوفنا",
  "Things to do": "أشياء يمكن فعلها",
  "Experiences to remember": "تجارب لا تُنسى",
  "Getting around": "التنقل",
  "Transport for every route": "مواصلات لكل مسار",
  "Why book with us": "لماذا تحجز معنا",
  "Travel with total confidence": "سافر بثقة تامة",
  "Phenomenal deals": "عروض استثنائية",
  "Limited-time offers": "عروض لفترة محدودة",
  "From the blog": "من المدونة",
  "Travel inspiration & tips": "إلهام ونصائح للسفر",
  "Loved by travellers": "محبوب من المسافرين",
  "What our guests say": "ماذا يقول ضيوفنا",
  "Travel documents": "وثائق السفر",
  "Visa services made simple": "خدمات التأشيرات ببساطة",
  "Fun facts": "حقائق ممتعة",
  "Trusted by travellers worldwide": "موثوق من المسافرين حول العالم",
  "Featured resorts": "منتجعات مختارة",
  "Escapes worth every mile": "وجهات تستحق كل ميل",
  "Featured apartments": "شقق مختارة",
  "Feel at home, anywhere": "اشعر وكأنك في بيتك أينما كنت",
  "Where to next": "إلى أين بعد ذلك",
  "Trending destinations": "وجهات رائجة",
  "Go global": "انطلق عالميًا",
  "Browse by country": "تصفح حسب الدولة",
  "All-in-one trips": "رحلات متكاملة",
  "Trending packages": "باقات رائجة",
  "Ends soon": "ينتهي قريبًا",
  "Flash deals": "عروض خاطفة",
  "Find your vibe": "اعثر على ما يناسبك",
  "Travel inspiration": "إلهام السفر",
  "Recognised worldwide": "معترف بها عالميًا",
  "Award-winning service": "خدمة حائزة على جوائز",
  "Good to know": "معلومات مفيدة",
  "Frequently asked questions": "الأسئلة الشائعة",
  "Trusted by leading travel brands worldwide": "موثوق من كبرى علامات السفر حول العالم",
  "Your next trip starts here": "رحلتك القادمة تبدأ من هنا",
  "Ready to plan your next journey?": "هل أنت مستعد لتخطيط رحلتك القادمة؟",
  "About Otithee": "عن أوتيثي",
  "One platform for every kind of stay and journey":
    "منصة واحدة لكل أنواع الإقامة والسفر",
  "Members save more": "الأعضاء يوفرون أكثر",
  "Get 10% off your first booking": "احصل على خصم 10% على أول حجز",
  "Stay in the loop": "ابقَ على اطلاع",
  "Get the best travel deals in your inbox": "أفضل عروض السفر في بريدك",
};

/**
 * Per-language dictionaries. A language absent here (e.g. "fr") renders the
 * English source for every key until translations are added — which an operator
 * can now do from Localization → Translations without a deploy.
 */
export const DICTIONARIES: Record<string, Dictionary> = { bn, ar };

/**
 * Every source string the site can translate — the working set the dashboard
 * translation editor lists. Derived from the shipped dictionaries so adding a
 * key to one language automatically offers it in every other.
 */
export function translationKeys(): string[] {
  const keys = new Set<string>();
  for (const dictionary of Object.values(DICTIONARIES)) {
    for (const key of Object.keys(dictionary)) keys.add(key);
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

/**
 * Resolve one string: operator override → shipped dictionary → English source.
 */
export function translate(language: string, source: string): string {
  if (language === "en") return source;
  const override = localeSettings().overrides[language]?.[source];
  if (override) return override;
  return DICTIONARIES[language]?.[source] ?? source;
}

/** Share of the working set a language has copy for, 0–1. */
export function translationCoverage(language: string): number {
  if (language === "en") return 1;
  const keys = translationKeys();
  if (keys.length === 0) return 0;
  const covered = keys.filter((key) => {
    const override = localeSettings().overrides[language]?.[key];
    return Boolean(override ?? DICTIONARIES[language]?.[key]);
  }).length;
  return covered / keys.length;
}
