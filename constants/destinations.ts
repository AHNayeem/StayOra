/**
 * The destination seed — the dataset the prototype ships with.
 *
 * This is the *only* place destination content is written by hand. Every
 * reader — the home page rails, `/destinations`, `/destinations/[slug]`, the
 * dashboard list, the sitemap — goes through
 * `features/destinations/repository.ts`, which starts from this array and layers
 * the editor's changes on top. When a backend arrives, this file becomes the
 * database seed and nothing else moves.
 *
 * Rules the data must keep:
 *
 *  - `id` and `slug` are unique. Ids are `dst_*` and never appear in a URL.
 *  - The six slugs the storefront shipped with (`paris`, `bali`, `santorini`,
 *    `tokyo`, `dubai`, `new-york`) are preserved — links to them exist in the
 *    wild and in the home rails.
 *  - Every status is represented, so the lifecycle is testable out of the box:
 *    Cappadocia is a draft and Phuket is archived, and neither may appear on the
 *    public site.
 *  - Coordinates match `features/discovery/geo.ts`, so a destination and the
 *    listings pinned near it agree on where they are.
 *
 * Imagery reuses the shared Unsplash pool the rest of the mock content draws
 * from, at the platform's standard transform.
 */

import type { Destination } from "@/types/destination";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

/** Seeded content is dated relative to a fixed day so SSR stays deterministic. */
const SEED_EPOCH = Date.UTC(2026, 0, 12);

const iso = (dayOffset: number): string =>
  new Date(SEED_EPOCH + dayOffset * 86_400_000).toISOString();

/**
 * One seed row. Written positionally because thirteen destinations of full
 * object literals is unreadable; the field order is fixed by the tuple type
 * below and never guessed at a call site.
 */
interface SeedRow {
  slug: string;
  name: string;
  country: string;
  region?: string;
  short: string;
  description: string;
  image: string;
  gallery: string[];
  highlights: string[];
  attractions: string[];
  activities: string[];
  coords: [number, number];
  propertyCount: number;
  from: number;
  status?: Destination["status"];
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

const ROWS: SeedRow[] = [
  {
    slug: "bali",
    name: "Bali",
    country: "Indonesia",
    region: "Lesser Sunda Islands",
    short: "Rice terraces, temple mornings and surf breaks, all within an hour of each other.",
    description:
      "Bali packs a startling amount into one island: volcanic ridges and terraced rice fields inland, reef breaks and black-sand coves on the coast, and a temple culture that shapes the rhythm of every village day.\n\nUbud is the base for jungle walks, art markets and long lunches; Canggu and Uluwatu are where the surf and the sunset bars are; Sanur and Nusa Dua suit families who want calm water. Distances look short and take longer than you expect — pick two bases rather than four.\n\nThe dry season runs April to October. Come in the shoulder months and you get the same weather at noticeably lower rates.",
    image: img("photo-1537996194471-e657df975ab4"),
    gallery: [
      img("photo-1518684079-3c830dcef090"),
      img("photo-1555854877-bab0e564b8d5"),
      img("photo-1520250497591-112f2f40a3f4"),
    ],
    highlights: [
      "Temple ceremonies year-round",
      "World-class surf on the west coast",
      "Villa stays at a fraction of resort prices",
    ],
    attractions: ["Tegallalang Rice Terraces", "Uluwatu Temple", "Mount Batur", "Tirta Empul", "Sacred Monkey Forest"],
    activities: ["Sunrise volcano trek", "Surf lessons in Canggu", "Balinese cooking class", "Nusa Penida day trip"],
    coords: [-8.4095, 115.1889],
    propertyCount: 940,
    from: 42,
    featured: true,
    seoTitle: "Bali Travel Guide & Stays",
    seoDescription:
      "Where to stay in Bali, what to do and when to go — plus villas, resorts and tours you can book in minutes.",
  },
  {
    slug: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    region: "Emirate of Dubai",
    short: "A stopover city that became the destination — desert, skyline and beach in one trip.",
    description:
      "Dubai is built for short trips. The airport is an hour from almost everything, the metro works, and a three-night stay comfortably covers a desert safari, an observation deck and two days on the beach.\n\nDowntown puts you next to the Burj Khalifa and the mall; Jumeirah and Marina are for the shoreline; Deira and Al Fahidi are where the older city and the gold and spice souks are. Rates swing hard with the calendar — winter is peak, summer is half price and 40°C.",
    image: img("photo-1512453979798-5ea266f8880c"),
    gallery: [
      img("photo-1582719508461-905c673771fd"),
      img("photo-1526772662000-3f88f10405ff"),
      img("photo-1582719478250-c89cae4dc85b"),
    ],
    highlights: ["Direct flights from almost everywhere", "Desert and beach in one day", "Tax-free shopping"],
    attractions: ["Burj Khalifa", "Dubai Mall & Fountain", "Palm Jumeirah", "Gold Souk", "Dubai Frame"],
    activities: ["Evening desert safari", "Dhow dinner cruise", "Marina yacht tour", "Old Dubai walking tour"],
    coords: [25.2048, 55.2708],
    propertyCount: 830,
    from: 96,
    featured: true,
  },
  {
    slug: "maldives",
    name: "Maldives",
    country: "Maldives",
    region: "Kaafu Atoll",
    short: "Overwater villas, house reefs and nothing on the horizon but water.",
    description:
      "The Maldives is a thousand-odd islands, and the one you pick is the holiday. Resort islands are self-contained — one island, one hotel, a house reef off the beach — while guesthouses on local islands cost a quarter as much and put you next to a working community.\n\nTransfers matter more than star ratings: a seaplane island is spectacular and adds a chunk to the bill, while a speedboat island 30 minutes from Malé gets you into the water the same afternoon. Snorkelling is good all year; manta and whale-shark season peaks between May and November on the western atolls.",
    image: img("photo-1540202404-a2f29016b523"),
    gallery: [
      img("photo-1590490360182-c33d57733427"),
      img("photo-1514282401047-d79a71a590e8"),
      img("photo-1507525428034-b723cf961d3e"),
    ],
    highlights: ["House reefs steps from the room", "Adults-only and family islands", "Seaplane and speedboat transfers"],
    attractions: ["Malé Old Friday Mosque", "Hulhumalé Beach", "Banana Reef", "Vaadhoo bioluminescence"],
    activities: ["Manta ray snorkelling", "Sunset dolphin cruise", "PADI open-water course", "Sandbank picnic"],
    coords: [3.2028, 73.2207],
    propertyCount: 410,
    from: 260,
    featured: true,
    seoTitle: "Maldives Resorts, Villas & Travel Guide",
    seoDescription:
      "Choosing an atoll, transfer types and the best months to snorkel — with overwater villas and guesthouses to book.",
  },
  {
    slug: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    short: "Street food, river temples and the best-value big-city hotels in Asia.",
    description:
      "Bangkok rewards a plan built around the river and the heat. Temples and the Grand Palace in the morning, the air-conditioned interior of a mall or a museum in the afternoon, and street food after dark when Yaowarat and Bang Rak come alive.\n\nThe Skytrain and river ferries between them cover most of what you want and skip the traffic entirely. Sukhumvit is convenient and modern, Riverside is the scenic splurge, and the old town around Rattanakosin puts the sights on your doorstep.",
    image: img("photo-1528181304800-259b08848526"),
    gallery: [
      img("photo-1508009603885-50cf7c579365"),
      img("photo-1530866495561-507c9faab2ed"),
      img("photo-1549194388-f61be84a6e9e"),
    ],
    highlights: ["Michelin-listed street food", "Rooftop bars at reasonable prices", "Gateway to the islands"],
    attractions: ["Grand Palace", "Wat Arun", "Wat Pho", "Chatuchak Weekend Market", "Jim Thompson House"],
    activities: ["Longtail canal tour", "Chinatown food crawl", "Thai cooking class", "Ayutthaya day trip"],
    coords: [13.7563, 100.5018],
    propertyCount: 1180,
    from: 34,
  },
  {
    slug: "singapore",
    name: "Singapore",
    country: "Singapore",
    short: "A city you can cross in an hour, with the food scene of a country ten times its size.",
    description:
      "Singapore is the easiest introduction to Southeast Asia: everything works, everything is close, and the hawker centres serve some of the best cheap food anywhere.\n\nThree days is plenty for Gardens by the Bay, an afternoon in the shophouses of Kampong Glam and Chinatown, a walk through the botanic gardens and one long evening eating your way through Maxwell or Old Airport Road. Marina Bay is the postcard; stay in Bugis or Tiong Bahru for better value and a better neighbourhood.",
    image: img("photo-1525625293386-3f8f99389edd"),
    gallery: [
      img("photo-1566073771259-6a8506099945"),
      img("photo-1533105079780-92b9be482077"),
      img("photo-1496442226666-8d4d0e62e6e9"),
    ],
    highlights: ["Hawker food at street prices", "Walkable, cool and green", "Perfect long-stopover city"],
    attractions: ["Gardens by the Bay", "Marina Bay Sands", "Sentosa Island", "Botanic Gardens", "Kampong Glam"],
    activities: ["Hawker centre food tour", "Night safari", "Singapore River cruise", "Southern Ridges walk"],
    coords: [1.3521, 103.8198],
    propertyCount: 620,
    from: 88,
  },
  {
    slug: "paris",
    name: "Paris",
    country: "France",
    region: "Île-de-France",
    short: "Museums, markets and the kind of walking that turns into the whole afternoon.",
    description:
      "Paris is best taken a neighbourhood at a time. The Marais for galleries and falafel, Saint-Germain for bookshops and cafés, Montmartre for the hill and the view, Canal Saint-Martin for where Parisians actually spend Sunday.\n\nBook the Louvre and the Eiffel Tower ahead and leave the rest loose — the city's pleasures are mostly incidental. Spring and early autumn are the sweet spot; August empties the city of locals and fills it with queues.",
    image: img("photo-1502602898657-3e91760cbb34"),
    gallery: [
      img("photo-1502680390469-be75c86b636f"),
      img("photo-1522199755839-a2bacb67c546"),
      img("photo-1524562979-3226f2d16f5c"),
    ],
    highlights: ["Museum pass covers 50+ sites", "Walkable, with a metro for the rest", "Day trips to Versailles and Giverny"],
    attractions: ["Eiffel Tower", "Louvre Museum", "Notre-Dame", "Musée d'Orsay", "Sacré-Cœur"],
    activities: ["Seine dinner cruise", "Marais food walk", "Versailles day trip", "Louvre skip-the-line tour"],
    coords: [48.8566, 2.3522],
    propertyCount: 1280,
    from: 89,
    featured: true,
  },
  {
    slug: "istanbul",
    name: "Istanbul",
    country: "Türkiye",
    short: "Two continents, three empires and a ferry ride between all of them.",
    description:
      "Istanbul is layered rather than laid out. Sultanahmet holds the Hagia Sophia, the Blue Mosque and the cisterns within a few streets of each other; across the Golden Horn, Beyoğlu and Karaköy are where the city eats, drinks and stays out.\n\nTake the ferry at least twice — to Kadıköy on the Asian side for the market and the meyhanes, and up the Bosphorus for the villages and the fortresses. Shoulder seasons are mild and far less crowded than summer.",
    image: img("photo-1541432901042-2d8bd64b4a9b"),
    gallery: [
      img("photo-1571896349842-33c89424de2d"),
      img("photo-1570125909232-eb263c188f7e"),
      img("photo-1519677100203-a0e668c92439"),
    ],
    highlights: ["Byzantine and Ottoman sites side by side", "Ferries instead of taxis", "Excellent value for a European city"],
    attractions: ["Hagia Sophia", "Blue Mosque", "Grand Bazaar", "Topkapı Palace", "Basilica Cistern"],
    activities: ["Bosphorus ferry cruise", "Kadıköy food tour", "Turkish bath (hammam)", "Princes' Islands day trip"],
    coords: [41.0082, 28.9784],
    propertyCount: 890,
    from: 52,
  },
  {
    slug: "santorini",
    name: "Santorini",
    country: "Greece",
    region: "South Aegean",
    short: "A drowned volcano with towns balanced on the rim and sunsets people applaud.",
    description:
      "Santorini's caldera does the heavy lifting: whitewashed Oia and Fira sit on the cliff edge, and almost every hotel terrace looks out over the water where the volcano collapsed.\n\nThe beaches are black and red volcanic sand rather than white — Perissa and Kamari for long stretches, Red Beach for the photograph. Rent nothing in August unless you booked in March; May, June and September are calmer, cheaper and just as warm.",
    image: img("photo-1533105079780-92b9be482077"),
    gallery: [
      img("photo-1533929736458-ca588d08c8be"),
      img("photo-1512918728675-ed5a9ecdebfd"),
      img("photo-1507525428034-b723cf961d3e"),
    ],
    highlights: ["Caldera-view terraces", "Volcanic beaches", "Assyrtiko wineries inland"],
    attractions: ["Oia sunset point", "Ancient Akrotiri", "Red Beach", "Fira to Oia cliff path", "Nea Kameni volcano"],
    activities: ["Caldera catamaran cruise", "Wine tasting tour", "Cliff-path hike", "Volcano and hot springs trip"],
    coords: [36.3932, 25.4615],
    propertyCount: 512,
    from: 120,
    featured: true,
  },
  {
    slug: "tokyo",
    name: "Tokyo",
    country: "Japan",
    region: "Kantō",
    short: "Thirteen cities in a trench coat, connected by the most reliable trains on earth.",
    description:
      "Tokyo is a collection of centres rather than one. Shinjuku and Shibuya for neon and scale, Yanaka and Kagurazaka for the low-rise older city, Ginza for the department-store basements, Shimokitazawa for records and secondhand.\n\nGet a transit card on arrival and let the trains decide your day. Cherry blossom in late March and the autumn colour in November are worth planning around; both are also the busiest and priciest weeks of the year.",
    image: img("photo-1540959733332-eab4deabeeaf"),
    gallery: [
      img("photo-1513635269975-59663e0ac1ad"),
      img("photo-1540339832862-474599807836"),
      img("photo-1493976040374-85c8e12f0c0e"),
    ],
    highlights: ["World-leading rail network", "Michelin stars at counter prices", "Day trips to Hakone and Nikkō"],
    attractions: ["Sensō-ji", "Shibuya Crossing", "Meiji Jingū", "TeamLab Planets", "Tsukiji Outer Market"],
    activities: ["Sushi-making class", "Golden Gai bar crawl", "Mount Fuji day trip", "Sumo practice visit"],
    coords: [35.6762, 139.6503],
    propertyCount: 1670,
    from: 78,
  },
  {
    slug: "new-york",
    name: "New York",
    country: "United States",
    region: "New York State",
    short: "Walk it, ride it, eat it — the city that fits a week into three days.",
    description:
      "Manhattan is the headline and Brooklyn and Queens are where a lot of the good eating is. Build days by neighbourhood: the High Line and Chelsea market together, the Village and Soho together, Museum Mile with the park.\n\nThe subway runs all night and beats every taxi below 59th Street. Autumn is the best weather; January hotel rates are the lowest of the year if you can take the cold.",
    image: img("photo-1496442226666-8d4d0e62e6e9"),
    gallery: [
      img("photo-1543429776-2782fc8e1acd"),
      img("photo-1505373877841-8d25f7d46678"),
      img("photo-1517457373958-b7bdd4587205"),
    ],
    highlights: ["24-hour subway", "Museums open late one night a week", "Broadway rush tickets"],
    attractions: ["Central Park", "Statue of Liberty", "Metropolitan Museum", "Brooklyn Bridge", "The High Line"],
    activities: ["Harbour sightseeing cruise", "Broadway show", "Brooklyn food tour", "Empire State observatory"],
    coords: [40.7128, -74.006],
    propertyCount: 2040,
    from: 145,
  },
  {
    slug: "coxs-bazar",
    name: "Cox's Bazar",
    country: "Bangladesh",
    region: "Chattogram",
    short: "The world's longest natural sea beach — 120 kilometres of unbroken sand.",
    description:
      "Cox's Bazar is a single, extraordinary fact: 120 unbroken kilometres of beach, with the busy stretch at Laboni and progressively emptier sand the further south you drive.\n\nInani and Himchari are the day trips, Saint Martin's Island the overnight one, and the fish market at dawn is the local highlight. Winter, November to February, is dry and mild; the monsoon closes much of it down between June and September.",
    image: img("photo-1519817650390-64a93db51149"),
    gallery: [
      img("photo-1544620347-c4fd4a3d5957"),
      img("photo-1507525428034-b723cf961d3e"),
      img("photo-1471039497385-b6d6ba609f9c"),
    ],
    highlights: ["Longest natural beach in the world", "Domestic flights from Dhaka", "Very low season rates"],
    attractions: ["Laboni Beach", "Himchari National Park", "Inani Beach", "Saint Martin's Island", "Ramu Buddhist village"],
    activities: ["Sunset beach ride", "Saint Martin's day trip", "Fish market walk", "Marine drive road trip"],
    coords: [21.4272, 92.0058],
    propertyCount: 320,
    from: 28,
  },
  {
    slug: "cappadocia",
    name: "Cappadocia",
    country: "Türkiye",
    region: "Central Anatolia",
    short: "Balloons over rock valleys and hotels carved into the cliffs.",
    description:
      "Cappadocia's fairy chimneys and cave-cut churches make it the most photographed landscape in Türkiye, and the balloon flights at dawn are the reason most people come.\n\nGöreme is the base; Uçhisar is quieter with better views. The valleys — Rose, Red, Pigeon, Ihlara — are all walkable, and the underground cities at Derinkuyu and Kaymaklı go down eight levels. Flights are weather-dependent, so allow two mornings rather than one.",
    image: img("photo-1570125909232-eb263c188f7e"),
    gallery: [
      img("photo-1541432901042-2d8bd64b4a9b"),
      img("photo-1571896349842-33c89424de2d"),
      img("photo-1464822759023-fed622ff2c3b"),
    ],
    highlights: ["Sunrise balloon flights", "Cave hotels", "Byzantine rock churches"],
    attractions: ["Göreme Open Air Museum", "Uçhisar Castle", "Derinkuyu Underground City", "Rose Valley", "Devrent Valley"],
    activities: ["Hot-air balloon flight", "Valley hiking tour", "ATV sunset ride", "Pottery workshop in Avanos"],
    coords: [38.6431, 34.8289],
    propertyCount: 260,
    from: 64,
    status: "draft",
  },
  {
    slug: "phuket",
    name: "Phuket",
    country: "Thailand",
    region: "Phuket Province",
    short: "Thailand's biggest island, and the launch point for the Andaman bays.",
    description:
      "Phuket is where the Andaman trips start: Phang Nga Bay, the Phi Phi islands and the Similans are all day trips from the west coast.\n\nPatong is the loud one; Kata, Karon and Nai Harn are calmer; Old Phuket Town has the Sino-Portuguese shophouses and the best food. High season runs November to April — outside it, the west-coast surf makes some beaches unswimmable.",
    image: img("photo-1544620347-c4fd4a3d5957"),
    gallery: [
      img("photo-1528181304800-259b08848526"),
      img("photo-1549194388-f61be84a6e9e"),
      img("photo-1507525428034-b723cf961d3e"),
    ],
    highlights: ["Andaman island hopping", "Long high season", "Beach resorts at every price"],
    attractions: ["Big Buddha", "Old Phuket Town", "Phang Nga Bay", "Promthep Cape", "Wat Chalong"],
    activities: ["Phi Phi speedboat tour", "James Bond Island canoeing", "Thai boxing night", "Old Town food walk"],
    coords: [7.8804, 98.3923],
    propertyCount: 740,
    from: 46,
    status: "archived",
  },
];

/**
 * The seeded destinations, in the order the storefront shows them.
 *
 * Do not import this to render a page — read through
 * `features/destinations/service.ts` so editor changes and status filtering are
 * applied. It is exported for the repository, the tests and future DB seeding.
 */
export const DESTINATIONS_SEED: Destination[] = ROWS.map((row, index) => ({
  id: `dst_${1000 + index}`,
  slug: row.slug,
  name: row.name,
  country: row.country,
  region: row.region,
  description: row.description,
  shortDescription: row.short,
  image: row.image,
  gallery: row.gallery,
  status: row.status ?? "published",
  featured: row.featured ?? false,
  attractions: row.attractions,
  activities: row.activities,
  highlights: row.highlights,
  latitude: row.coords[0],
  longitude: row.coords[1],
  propertyCount: row.propertyCount,
  startingPrice: { amount: row.from, unit: "per night" },
  metadata:
    row.seoTitle || row.seoDescription
      ? { seoTitle: row.seoTitle, seoDescription: row.seoDescription }
      : undefined,
  createdAt: iso(-index * 9),
  updatedAt: iso(index % 5),
}));
