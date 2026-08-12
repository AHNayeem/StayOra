/**
 * Destination resolution — turns free text ("dubai", "cox's bazar", "DXB",
 * "thailand") into a structured place the tools can filter and search on.
 *
 * The vocabulary is *derived*, not authored: cities and countries come from the
 * catalog's own listings and from the airport reference dataset, so the
 * assistant can only ever recognise destinations Otithee actually sells. Add a
 * listing or an airport and the assistant understands it for free.
 */

import type { Airport } from "@/types/flight";
import { AIRPORTS } from "@/lib/mock/airports";
import {
  ACTIVITIES,
  APARTMENTS,
  CONVENTION_HALLS,
  HOTELS,
  RESORTS,
  SHARED_ROOMS,
  TOURS,
  TRANSPORT,
  VISAS,
} from "@/constants/listings";
import { hasPhrase, normalize } from "./text";

/** A destination the assistant recognises. */
export interface AIPlace {
  /** Display label, e.g. "Dubai" or "Thailand". */
  label: string;
  city?: string;
  country?: string;
  /** ISO 3166-1 alpha-2, when known. */
  countryCode?: string;
  /** Primary airport IATA serving the place, when one exists. */
  airportCode?: string;
  /** Whether the match was a country rather than a city. */
  scope: "city" | "country" | "airport";
}

interface PlaceEntry extends AIPlace {
  /** Normalized key used for matching. */
  key: string;
}

/** Every catalog listing, flattened once — the source of catalog destinations. */
const CATALOG = [
  ...HOTELS,
  ...APARTMENTS,
  ...RESORTS,
  ...SHARED_ROOMS,
  ...CONVENTION_HALLS,
  ...TRANSPORT,
  ...TOURS,
  ...ACTIVITIES,
  ...VISAS,
];

/**
 * Every name an airport's city goes by.
 *
 * Reference datasets qualify ambiguous cities — "Denpasar (Bali)", "New York
 * (JFK)" — but travellers type the popular half. Indexing the parenthetical
 * alias as well as the full string is what lets "Bali" resolve to DPS, and
 * therefore what lets a Bali trip plan include a real flight.
 */
function cityAliases(city: string): string[] {
  const aliases = [normalize(city)];
  const bracketed = city.match(/\(([^)]+)\)/);
  if (bracketed) aliases.push(normalize(bracketed[1]));
  const withoutBrackets = normalize(city.replace(/\([^)]*\)/g, ""));
  if (withoutBrackets) aliases.push(withoutBrackets);
  return [...new Set(aliases.filter((a) => a.length >= 3))];
}

/** City (and alias) → the most "important" airport serving it (popular ones win). */
const AIRPORT_BY_CITY = new Map<string, Airport>();
const AIRPORT_BY_COUNTRY = new Map<string, Airport>();
for (const airport of AIRPORTS) {
  for (const cityKey of cityAliases(airport.city)) {
    const existing = AIRPORT_BY_CITY.get(cityKey);
    if (!existing || (airport.popular && !existing.popular)) {
      AIRPORT_BY_CITY.set(cityKey, airport);
    }
  }
  const countryKey = normalize(airport.country);
  const existingCountry = AIRPORT_BY_COUNTRY.get(countryKey);
  if (!existingCountry || (airport.popular && !existingCountry.popular)) {
    AIRPORT_BY_COUNTRY.set(countryKey, airport);
  }
}

/** The recognisable place vocabulary, longest key first so "new york" beats "york". */
const PLACES: PlaceEntry[] = (() => {
  const byKey = new Map<string, PlaceEntry>();

  const put = (entry: PlaceEntry) => {
    if (!entry.key || entry.key.length < 3) return;
    const existing = byKey.get(entry.key);
    // Cities are more specific than countries; keep the more specific match.
    if (existing && !(existing.scope === "country" && entry.scope === "city")) return;
    byKey.set(entry.key, entry);
  };

  for (const listing of CATALOG) {
    const { city, country, countryCode } = listing.location;
    if (city) {
      const airport = AIRPORT_BY_CITY.get(normalize(city));
      put({
        key: normalize(city),
        label: city,
        city,
        country,
        countryCode: countryCode ?? airport?.countryCode,
        airportCode: airport?.code,
        scope: "city",
      });
    }
    if (country) {
      const airport = AIRPORT_BY_COUNTRY.get(normalize(country));
      put({
        key: normalize(country),
        label: country,
        country,
        countryCode: countryCode ?? airport?.countryCode,
        airportCode: airport?.code,
        scope: "country",
      });
    }
  }

  for (const airport of AIRPORTS) {
    for (const alias of cityAliases(airport.city)) {
      put({
        key: alias,
        label: airport.city,
        city: airport.city,
        country: airport.country,
        countryCode: airport.countryCode,
        airportCode: airport.code,
        scope: "city",
      });
    }
    put({
      key: normalize(airport.country),
      label: airport.country,
      country: airport.country,
      countryCode: airport.countryCode,
      airportCode: airport.code,
      scope: "country",
    });
  }

  return [...byKey.values()].sort((a, b) => b.key.length - a.key.length);
})();

/** IATA code → airport, for three-letter mentions like "DXB". */
const BY_IATA = new Map(AIRPORTS.map((a) => [a.code.toUpperCase(), a]));

/** Resolve an exact place name (already isolated from the sentence). */
export function resolvePlace(name: string): AIPlace | undefined {
  const key = normalize(name);
  if (!key) return undefined;

  const iata = BY_IATA.get(name.trim().toUpperCase());
  if (iata && name.trim().length === 3) {
    return {
      label: iata.city,
      city: iata.city,
      country: iata.country,
      countryCode: iata.countryCode,
      airportCode: iata.code,
      scope: "airport",
    };
  }

  const exact = PLACES.find((p) => p.key === key);
  if (exact) return toPlace(exact);
  return undefined;
}

/**
 * Find the first place mentioned anywhere in a sentence. Longest names are
 * tested first so "new york" isn't shadowed by "york", and matches must fall on
 * word boundaries so "malaysia" doesn't match inside "malaysian".
 */
export function findPlace(text: string, skip?: string[]): AIPlace | undefined {
  const haystack = ` ${normalize(text)} `;
  const skipKeys = new Set((skip ?? []).map(normalize));

  for (const place of PLACES) {
    if (skipKeys.has(place.key)) continue;
    if (haystack.includes(` ${place.key} `) || haystack.includes(` ${place.key},`)) {
      return toPlace(place);
    }
  }

  // Fall back to a bare IATA code in the sentence, e.g. "DAC to DXB".
  const iataMatch = text.match(/\b([A-Z]{3})\b/g);
  if (iataMatch) {
    for (const code of iataMatch) {
      const airport = BY_IATA.get(code);
      if (airport && !skipKeys.has(normalize(airport.city))) {
        return {
          label: airport.city,
          city: airport.city,
          country: airport.country,
          countryCode: airport.countryCode,
          airportCode: airport.code,
          scope: "airport",
        };
      }
    }
  }
  return undefined;
}

function toPlace(entry: PlaceEntry): AIPlace {
  return {
    label: entry.label,
    city: entry.city,
    country: entry.country,
    countryCode: entry.countryCode,
    airportCode: entry.airportCode,
    scope: entry.scope,
  };
}

/**
 * The airport a traveller most likely departs from, given their country
 * preference. Used only as a *default* the traveller can override — the
 * assistant always states which origin it assumed, and never hardcodes one
 * market.
 */
export function defaultOriginCode(countryCode?: string): string | undefined {
  if (!countryCode) return undefined;
  const code = countryCode.toUpperCase();
  const inCountry = AIRPORTS.filter((a) => a.countryCode === code);
  if (inCountry.length === 0) return undefined;
  return (inCountry.find((a) => a.popular) ?? inCountry[0]).code;
}

/**
 * Does a listing sit in this place?
 *
 * Matching is on **word boundaries**, not substrings. A naive `includes` makes
 * "Nice" match "Venice" and "Oslo" match "Bratislava" — the assistant then
 * confidently offers a Venice hotel to somebody asking about the Côte d'Azur,
 * which is worse than returning nothing.
 */
export function listingMatchesPlace(
  location: { label: string; city?: string; country?: string },
  place: AIPlace,
): boolean {
  const haystack = normalize(
    [location.label, location.city, location.country].filter(Boolean).join(" | "),
  );
  const target =
    place.scope === "country" && place.country ? place.country : (place.city ?? place.country);
  if (!target) return false;
  return hasPhrase(haystack, normalize(target));
}

/**
 * The country a city sits in, as a searchable place.
 *
 * Used to widen a search one step — "no activities in Dubai itself, here's what
 * the UAE has" — which is a real, checkable answer, unlike silently returning
 * results from the other side of the world.
 */
export function countryOf(place: AIPlace): AIPlace | undefined {
  if (!place.country || place.scope === "country") return undefined;
  return {
    label: place.country,
    country: place.country,
    countryCode: place.countryCode,
    airportCode: AIRPORT_BY_COUNTRY.get(normalize(place.country))?.code,
    scope: "country",
  };
}
