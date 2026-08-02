/**
 * Itinerary generator — turns a search query into believable, priced offers.
 *
 * Everything here is **deterministic**: the same query always produces the same
 * offers, in the same order, at the same prices. That is not a nicety, it is
 * what makes the module work at all — the results page, the details page and
 * the booking flow each regenerate the offer independently from its id, with no
 * shared server state, exactly as they would each call `GET /offers/:id` against
 * a real API. It also keeps SSR and client renders in agreement (see
 * {@link "@/lib/random"}), so nothing hydrates mismatched.
 *
 * Offer ids therefore *encode* their query (see {@link encodeOfferId}). A hard
 * refresh on `/flights/<id>` rebuilds the exact itinerary — no dead links.
 */

import type {
  Aircraft,
  Airline,
  Airport,
  CabinClass,
  FareBrand,
  FlightBadge,
  FlightLeg,
  FlightOffer,
  FlightSearchQuery,
  FlightSegment,
  FlightSlice,
  Layover,
  TripType,
} from "@/types/flight";
import { SeededRandom, hashString } from "@/lib/random";
import {
  addMinutesLocal,
  arrivalLocal,
  dayOffset,
  durationBetweenLocal,
  parseLocal,
} from "@/lib/flight-time";
import { AIRPORTS_BY_CODE, distanceKm, nearbyCodes } from "./airports";
import { AIRCRAFT_BY_CODE, AIRLINES_BY_CODE, carriersFor, fleetFor } from "./airlines";
import {
  baggageFor,
  baseFareForDistance,
  brandsFor,
  buildFare,
  cancellationFeeFor,
  changeFeeFor,
  co2ForDistance,
  FARE_BRAND_RULES,
} from "./fares";

/* -------------------------------------------------------------------------- */
/* Offer id encoding                                                           */
/* -------------------------------------------------------------------------- */

const CABIN_CODE: Record<CabinClass, string> = {
  economy: "e",
  "premium-economy": "p",
  business: "b",
  first: "f",
};
const CABIN_FROM_CODE: Record<string, CabinClass> = {
  e: "economy",
  p: "premium-economy",
  b: "business",
  f: "first",
};
const TRIP_CODE: Record<TripType, string> = {
  "one-way": "ow",
  "round-trip": "rt",
  "multi-city": "mc",
};
const TRIP_FROM_CODE: Record<string, TripType> = {
  ow: "one-way",
  rt: "round-trip",
  mc: "multi-city",
};

const bit = (value: boolean) => (value ? "1" : "0");

/**
 * Encode a query + result index into a URL-safe, self-describing offer id.
 *
 * Deliberately readable (`v1.rt.DAC-DXB-20260812_DXB-DAC-20260820.200.e.00000.-.3`)
 * so a malformed link is diagnosable at a glance rather than an opaque hash.
 */
export function encodeOfferId(query: FlightSearchQuery, index: number): string {
  const legs = query.legs
    .map((l) => `${l.from}-${l.to}-${l.date.replace(/-/g, "")}`)
    .join("_");
  const pax = `${query.passengers.adults}${query.passengers.children}${query.passengers.infants}`;
  const flags = [
    bit(query.directOnly),
    bit(query.flexibleDates),
    bit(query.nearbyAirports),
    bit(query.refundableOnly),
    bit(query.baggageIncluded),
  ].join("");
  const airlines = query.preferredAirlines.length
    ? query.preferredAirlines.join("-")
    : "_";
  return [
    "v1",
    TRIP_CODE[query.tripType],
    legs,
    pax,
    CABIN_CODE[query.cabin],
    flags,
    airlines,
    String(index),
  ].join(".");
}

/** Decoded offer id: the originating query plus which result it was. */
export interface DecodedOfferId {
  query: FlightSearchQuery;
  index: number;
}

/** Reverse {@link encodeOfferId}. Returns `null` for anything malformed. */
export function decodeOfferId(id: string): DecodedOfferId | null {
  const parts = id.split(".");
  if (parts.length !== 8 || parts[0] !== "v1") return null;
  const [, tripCode, legsPart, pax, cabinCode, flags, airlines, indexPart] = parts;

  const tripType = TRIP_FROM_CODE[tripCode];
  const cabin = CABIN_FROM_CODE[cabinCode];
  if (!tripType || !cabin || flags.length !== 5) return null;

  const legs: FlightLeg[] = [];
  for (const raw of legsPart.split("_")) {
    const [from, to, compact] = raw.split("-");
    if (!from || !to || compact?.length !== 8) return null;
    if (!AIRPORTS_BY_CODE[from] || !AIRPORTS_BY_CODE[to]) return null;
    legs.push({
      from,
      to,
      date: `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`,
    });
  }
  if (legs.length === 0) return null;

  const index = Number(indexPart);
  if (!Number.isInteger(index) || index < 0) return null;

  return {
    index,
    query: {
      tripType,
      legs,
      passengers: {
        adults: Number(pax[0]) || 1,
        children: Number(pax[1]) || 0,
        infants: Number(pax[2]) || 0,
      },
      cabin,
      directOnly: flags[0] === "1",
      flexibleDates: flags[1] === "1",
      nearbyAirports: flags[2] === "1",
      refundableOnly: flags[3] === "1",
      baggageIncluded: flags[4] === "1",
      preferredAirlines: airlines === "_" ? [] : airlines.split("-").filter(Boolean),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Segment construction                                                        */
/* -------------------------------------------------------------------------- */

/** Minutes of taxi, climb and descent on top of pure cruise time. */
const GROUND_OVERHEAD_MINUTES = 25;

/** Minutes before departure that boarding opens. */
const BOARDING_LEAD_MINUTES = 40;

/** Plausible departure slots (minutes after local midnight). */
const DEPARTURE_SLOTS = [
  5 * 60, 6 * 60 + 15, 7 * 60 + 40, 8 * 60 + 50, 10 * 60 + 5, 11 * 60 + 30,
  13 * 60, 14 * 60 + 20, 15 * 60 + 45, 17 * 60 + 10, 18 * 60 + 35, 20 * 60,
  21 * 60 + 25, 22 * 60 + 50, 23 * 60 + 55,
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYY-MM-DDTHH:mm` from a date and minutes-after-midnight. */
function localAt(date: string, minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${date}T${pad(h)}:${pad(m)}`;
}

/** Flight time for a distance on a given aircraft, minutes. */
function cruiseMinutes(km: number, aircraft: Aircraft): number {
  return Math.round((km / aircraft.cruiseKph) * 60) + GROUND_OVERHEAD_MINUTES;
}

interface SegmentOptions {
  airline: Airline;
  aircraft: Aircraft;
  from: Airport;
  to: Airport;
  departLocal: string;
  cabin: CabinClass;
  rng: SeededRandom;
  /** Sequence within the slice, for a stable id. */
  index: number;
  sliceId: string;
}

function buildSegment(options: SegmentOptions): FlightSegment {
  const { airline, aircraft, from, to, departLocal, cabin, rng, index, sliceId } = options;
  const km = distanceKm(from.code, to.code);
  const duration = cruiseMinutes(km, aircraft);
  const arrive = arrivalLocal(
    departLocal,
    from.utcOffsetMinutes,
    to.utcOffsetMinutes,
    duration,
  );

  // Flight numbers cluster by carrier: short-haul in the low hundreds, long-haul
  // higher — the same convention real airlines use.
  const flightNo = km > 3500 ? rng.int(100, 399) : rng.int(400, 899);

  return {
    id: `${sliceId}-s${index}`,
    airlineCode: airline.code,
    operatedByCode: airline.code,
    flightNumber: `${airline.code} ${flightNo}`,
    aircraftCode: aircraft.code,
    fromCode: from.code,
    toCode: to.code,
    departTerminal: rng.pick(from.terminals),
    arriveTerminal: rng.pick(to.terminals),
    gate: `${rng.pick(["A", "B", "C", "D", "E"])}${rng.int(1, 24)}`,
    boardingLocal: addMinutesLocal(departLocal, -BOARDING_LEAD_MINUTES),
    departLocal,
    arriveLocal: arrive,
    durationMinutes: duration,
    cabin,
    distanceKm: km,
    co2Kg: co2ForDistance(km, cabin),
    seatsAvailable: rng.int(2, 42),
  };
}

/** Assemble a slice from its segments, deriving layovers and totals. */
function assembleSlice(id: string, segments: FlightSegment[]): FlightSlice {
  const first = segments[0];
  const last = segments[segments.length - 1];
  const fromAirport = AIRPORTS_BY_CODE[first.fromCode];
  const toAirport = AIRPORTS_BY_CODE[last.toCode];

  const layovers: Layover[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const inbound = segments[i];
    const outbound = segments[i + 1];
    const stopAirport = AIRPORTS_BY_CODE[inbound.toCode];
    const minutes = durationBetweenLocal(
      inbound.arriveLocal,
      stopAirport.utcOffsetMinutes,
      outbound.departLocal,
      stopAirport.utcOffsetMinutes,
    );
    const arriveHour = Number(inbound.arriveLocal.slice(11, 13));
    layovers.push({
      airportCode: inbound.toCode,
      durationMinutes: minutes,
      changeOfAirport: inbound.toCode !== outbound.fromCode,
      overnight: arriveHour >= 22 || arriveHour < 5,
    });
  }

  return {
    id,
    segments,
    layovers,
    fromCode: first.fromCode,
    toCode: last.toCode,
    departLocal: first.departLocal,
    arriveLocal: last.arriveLocal,
    durationMinutes: durationBetweenLocal(
      first.departLocal,
      fromAirport.utcOffsetMinutes,
      last.arriveLocal,
      toAirport.utcOffsetMinutes,
    ),
    stops: segments.length - 1,
    dayOffset: dayOffset(first.departLocal, last.arriveLocal),
  };
}

/* -------------------------------------------------------------------------- */
/* Slice generation                                                            */
/* -------------------------------------------------------------------------- */

/** A slice plus the adult base fare its routing implies. */
interface PricedSlice {
  slice: FlightSlice;
  airline: Airline;
  adultBaseUsd: number;
}

/**
 * Pick the connection hub for a one-stop routing: the carrier's own hub, as long
 * as it's a *useful* intermediate point.
 *
 * "Useful" is doing real work here. A hub next door to the *origin* isn't a
 * connection, it's a repositioning hop — routing Dhaka → New York via
 * Chattogram sits inside any detour budget and is complete nonsense. So the
 * first leg has to be a real leg: at least a fifth of the total journey.
 *
 * The constraint is deliberately one-sided. A short *final* hop off a hub is
 * entirely normal — Dhaka → Doha → Dubai, Dhaka → Amsterdam → London — and
 * applying the same minimum to the destination side would wrongly rule out most
 * Gulf and European connections. The detour cap handles the far end.
 */
function connectionHub(
  airline: Airline,
  from: string,
  to: string,
  rng: SeededRandom,
): string | null {
  const direct = distanceKm(from, to);
  const candidates = airline.hubs.filter((hub) => {
    if (hub === from || hub === to) return false;
    if (!AIRPORTS_BY_CODE[hub]) return false;
    const legA = distanceKm(from, hub);
    const legB = distanceKm(hub, to);
    if (legA < direct * 0.2) return false;
    return legA + legB < direct * 1.7;
  });
  return candidates.length ? rng.pick(candidates) : null;
}

/**
 * Candidate slices for one leg — the raw pool the offer builder ranks and
 * trims. Generates a non-stop and a one-stop variant per plausible carrier,
 * skipping combinations that don't make geographic sense.
 */
function generateSlices(
  leg: FlightLeg,
  cabin: CabinClass,
  query: FlightSearchQuery,
  legIndex: number,
): PricedSlice[] {
  const origins = query.nearbyAirports ? nearbyCodes(leg.from) : [leg.from];
  const destinations = query.nearbyAirports ? nearbyCodes(leg.to) : [leg.to];
  const out: PricedSlice[] = [];

  for (const fromCode of origins) {
    for (const toCode of destinations) {
      const from = AIRPORTS_BY_CODE[fromCode];
      const to = AIRPORTS_BY_CODE[toCode];
      if (!from || !to || from.code === to.code) continue;

      const direct = distanceKm(from.code, to.code);
      let carriers = carriersFor(from.code, to.code, direct);
      if (query.preferredAirlines.length) {
        const preferred = new Set(query.preferredAirlines);
        const filtered = carriers.filter((c) => preferred.has(c.code));
        // Never return nothing just because a preference is unserviceable.
        if (filtered.length) carriers = filtered;
      }

      for (const airline of carriers) {
        const hubbed = airline.hubs.includes(from.code) || airline.hubs.includes(to.code);
        const seedBase = `${fromCode}${toCode}${leg.date}${airline.code}${cabin}${legIndex}`;

        // ---- Non-stop -------------------------------------------------------
        // Only carriers touching an endpoint fly it non-stop; everyone else has
        // to connect through their own hub.
        if (hubbed) {
          const rng = new SeededRandom(`${seedBase}:direct`);
          // Empty fleet ⇒ nothing they operate has the range for this sector.
          const types = fleetFor(airline.code, direct);
          const aircraft = types.length ? AIRCRAFT_BY_CODE[rng.pick(types)] : undefined;
          if (aircraft) {
            const departLocal = localAt(leg.date, rng.pick(DEPARTURE_SLOTS));
            const sliceId = `l${legIndex}-${airline.code}-d${hashString(seedBase) % 997}`;
            const segment = buildSegment({
              airline,
              aircraft,
              from,
              to,
              departLocal,
              cabin,
              rng,
              index: 0,
              sliceId,
            });
            out.push({
              slice: assembleSlice(sliceId, [segment]),
              airline,
              adultBaseUsd: baseFareForDistance(direct, cabin) * 1.12, // non-stop premium
            });
          }
        }

        // ---- One-stop -------------------------------------------------------
        if (!query.directOnly) {
          const rng = new SeededRandom(`${seedBase}:hub`);
          const hub = connectionHub(airline, from.code, to.code, rng);
          const hubAirport = hub ? AIRPORTS_BY_CODE[hub] : undefined;
          if (hubAirport) {
            const legA = distanceKm(from.code, hub!);
            const legB = distanceKm(hub!, to.code);
            const typesA = fleetFor(airline.code, legA);
            const typesB = fleetFor(airline.code, legB);
            const aircraftA = typesA.length ? AIRCRAFT_BY_CODE[rng.pick(typesA)] : undefined;
            const aircraftB = typesB.length ? AIRCRAFT_BY_CODE[rng.pick(typesB)] : undefined;
            if (aircraftA && aircraftB) {
              const sliceId = `l${legIndex}-${airline.code}-h${hashString(`${seedBase}${hub}`) % 997}`;
              const departLocal = localAt(leg.date, rng.pick(DEPARTURE_SLOTS));
              const first = buildSegment({
                airline,
                aircraft: aircraftA,
                from,
                to: hubAirport,
                departLocal,
                cabin,
                rng,
                index: 0,
                sliceId,
              });
              // Connections cluster around 1h20–4h; long-hauls sit at the top.
              const layover = rng.int(80, legB > 4000 ? 300 : 200);
              const second = buildSegment({
                airline,
                aircraft: aircraftB,
                from: hubAirport,
                to,
                departLocal: addMinutesLocal(first.arriveLocal, layover),
                cabin,
                rng,
                index: 1,
                sliceId,
              });
              out.push({
                slice: assembleSlice(sliceId, [first, second]),
                airline,
                // Connections are cheaper, and the detour distance still costs.
                adultBaseUsd: baseFareForDistance(legA + legB, cabin) * 0.82,
              });
            }
          }
        }
      }
    }
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Offer assembly                                                              */
/* -------------------------------------------------------------------------- */

/** Deterministic ordering key so the pool is stable before ranking. */
function sliceOrderKey(p: PricedSlice): string {
  return `${p.slice.departLocal}${p.airline.code}${p.slice.stops}${p.slice.id}`;
}

/**
 * How many offers a search returns. Enough to make filtering meaningful, capped
 * so the results page stays fast without virtualisation.
 */
const MAX_OFFERS = 42;

/**
 * Build the full offer list for a query.
 *
 * Round-trips pair each outbound with a same-carrier return (the pairing real
 * fare rules require); multi-city chains one slice per leg from the same carrier
 * where possible, since mixed-carrier multi-city fares are rarely bookable as
 * one ticket.
 */
export function generateOffers(query: FlightSearchQuery): FlightOffer[] {
  const legs = query.legs;
  if (legs.length === 0) return [];

  const perLeg = legs.map((leg, i) => {
    const pool = generateSlices(leg, query.cabin, query, i);
    return pool.sort((a, b) => sliceOrderKey(a).localeCompare(sliceOrderKey(b)));
  });

  if (perLeg.some((pool) => pool.length === 0)) return [];

  const combos: PricedSlice[][] = [];

  if (query.tripType === "one-way") {
    for (const priced of perLeg[0]) combos.push([priced]);
  } else {
    // Pair by carrier across every leg — the airline that flies you out flies
    // you back, which is what fare rules require for a single ticket.
    //
    // Each outbound is paired with several returns rather than just the first
    // feasible one: a traveller choosing a round trip is choosing *both* legs,
    // and offering one arbitrary return per outbound makes the return time look
    // fixed when it isn't.
    const RETURNS_PER_OUTBOUND = 3;
    const OUTBOUNDS_PER_CARRIER = 4;

    const carriers = new Set(perLeg[0].map((p) => p.airline.code));
    for (const code of carriers) {
      const outbound = perLeg[0]
        .filter((p) => p.airline.code === code)
        .slice(0, OUTBOUNDS_PER_CARRIER);

      for (const first of outbound) {
        // Build the alternatives for each subsequent leg, then expand.
        let chains: PricedSlice[][] = [[first]];

        for (let i = 1; i < perLeg.length; i++) {
          const sameCarrier = perLeg[i].filter((p) => p.airline.code === code);
          const options = sameCarrier.length ? sameCarrier : perLeg[i];
          const next: PricedSlice[][] = [];

          for (const chain of chains) {
            const previous = chain[chain.length - 1].slice;
            // A later leg can't depart before the previous one lands.
            const feasible = options.filter(
              (p) => parseLocal(p.slice.departLocal) > parseLocal(previous.arriveLocal),
            );
            const pool = feasible.length ? feasible : options;
            // Only the final leg fans out; intermediate multi-city legs take the
            // first feasible option, or the combination count explodes.
            const take = i === perLeg.length - 1 ? RETURNS_PER_OUTBOUND : 1;
            for (const candidate of pool.slice(0, take)) {
              next.push([...chain, candidate]);
            }
          }
          chains = next;
          if (chains.length === 0) break;
        }

        combos.push(...chains.filter((chain) => chain.length === perLeg.length));
      }
    }
  }

  const offers: FlightOffer[] = combos.map((chain, comboIndex) => {
    const rng = new SeededRandom(
      `offer:${chain.map((c) => c.slice.id).join("|")}:${query.cabin}`,
    );
    const airlineCodes = new Set(chain.map((c) => c.airline.code));
    const airline = chain[0].airline;
    const brand: FareBrand = rng.pick(brandsFor(query.cabin));
    const rules = FARE_BRAND_RULES[brand];

    const adultBaseUsd = chain.reduce((sum, c) => sum + c.adultBaseUsd, 0);
    // One offer in six carries a promo, weighted toward low-cost carriers.
    const hasPromo = rng.bool(airline.lowCost ? 0.28 : 0.14);
    const promoRate = hasPromo ? rng.float(0.06, 0.22, 2) : 0;

    const fare = buildFare({
      adultBaseUsd,
      passengers: query.passengers,
      brand,
      airlineCode: airline.code,
      promoRate,
      rng,
    });

    const slices = chain.map((c) => c.slice);
    const co2Kg = slices.reduce(
      (sum, s) => sum + s.segments.reduce((n, seg) => n + seg.co2Kg, 0),
      0,
    );
    const baggage = baggageFor(query.cabin, airline.lowCost);
    const aircraftCodes = slices.flatMap((s) => s.segments.map((seg) => seg.aircraftCode));
    const aircraft = aircraftCodes.map((code) => AIRCRAFT_BY_CODE[code]).filter(Boolean);

    return {
      id: encodeOfferId(query, comboIndex),
      tripType: query.tripType,
      slices,
      airlineCode: airline.code,
      mixedAirlines: airlineCodes.size > 1,
      cabin: query.cabin,
      fareBrand: brand,
      fare,
      passengers: query.passengers,
      baggage,
      refundable: rules.refundable,
      changeable: rules.changeable,
      changeFeeUsd: changeFeeFor(brand, adultBaseUsd),
      cancellationFeeUsd: rules.refundable
        ? cancellationFeeFor(brand, adultBaseUsd)
        : 0,
      mealsIncluded: !airline.lowCost || query.cabin !== "economy",
      wifiAvailable: aircraft.every((a) => a.hasWifi),
      entertainment: aircraft.every((a) => a.hasEntertainment),
      co2Kg,
      co2VsAveragePct: 0, // filled once the whole set is known
      seatsAvailable: Math.min(
        ...slices.flatMap((s) => s.segments.map((seg) => seg.seatsAvailable)),
      ),
      badges: [],
      promoLabel: hasPromo
        ? `${rng.pick(["Flash", "Season", "Weekend", "Member"])} sale · ${Math.round(promoRate * 100)}% off`
        : undefined,
    };
  });

  // Post-process the set as a whole: honour hard filters, dedupe, then rank.
  let filtered = offers;
  if (query.directOnly) {
    filtered = filtered.filter((o) => o.slices.every((s) => s.stops === 0));
  }
  if (query.refundableOnly) {
    filtered = filtered.filter((o) => o.refundable);
  }
  if (query.baggageIncluded) {
    filtered = filtered.filter((o) => o.baggage.checkedKg > 0);
  }

  // Two offers with identical routing, price and brand add nothing.
  const seen = new Set<string>();
  filtered = filtered.filter((o) => {
    const key = `${o.slices.map((s) => `${s.departLocal}${s.toCode}${s.stops}`).join("|")}:${o.fare.totalUsd}:${o.fareBrand}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  filtered.sort((a, b) => a.fare.totalUsd - b.fare.totalUsd);
  const trimmed = filtered.slice(0, MAX_OFFERS);

  return decorate(trimmed);
}

/** Total journey minutes across every slice. */
export function totalDuration(offer: FlightOffer): number {
  return offer.slices.reduce((sum, s) => sum + s.durationMinutes, 0);
}

/** Total connections across every slice. */
export function totalStops(offer: FlightOffer): number {
  return offer.slices.reduce((sum, s) => sum + s.stops, 0);
}

/**
 * The "recommended" score — what a traveller actually optimises for. Price
 * dominates, but a fare that's 10% cheaper and four hours slower shouldn't win,
 * so duration and stops carry real weight and airline quality breaks ties.
 * Lower is better.
 */
function recommendScore(offer: FlightOffer, cheapest: number, fastest: number): number {
  const priceRatio = offer.fare.totalUsd / Math.max(1, cheapest);
  const timeRatio = totalDuration(offer) / Math.max(1, fastest);
  const airline = AIRLINES_BY_CODE[offer.airlineCode];
  const qualityBonus = airline ? (5 - airline.rating) * 0.05 : 0.1;
  return priceRatio * 0.55 + timeRatio * 0.33 + totalStops(offer) * 0.05 + qualityBonus;
}

/** Attach comparative badges and CO₂ deltas once the whole set is known. */
function decorate(offers: FlightOffer[]): FlightOffer[] {
  if (offers.length === 0) return offers;

  const cheapest = Math.min(...offers.map((o) => o.fare.totalUsd));
  const fastest = Math.min(...offers.map(totalDuration));
  const avgCo2 =
    offers.reduce((sum, o) => sum + o.co2Kg, 0) / Math.max(1, offers.length);

  const scored = offers.map((o) => ({ o, score: recommendScore(o, cheapest, fastest) }));
  const bestId = [...scored].sort((a, b) => a.score - b.score)[0]?.o.id;

  // Best value: cheapest offer among those within 25% of the fastest duration.
  const timely = offers.filter((o) => totalDuration(o) <= fastest * 1.25);
  const bestValueId = [...timely].sort(
    (a, b) => a.fare.totalUsd - b.fare.totalUsd,
  )[0]?.id;

  return offers.map((offer) => {
    const badges: FlightBadge[] = [];
    if (offer.id === bestId) badges.push("recommended");
    if (offer.fare.totalUsd === cheapest) badges.push("cheapest");
    if (totalDuration(offer) === fastest) badges.push("fastest");
    if (offer.id === bestValueId && !badges.includes("cheapest")) {
      badges.push("best-value");
    }
    if (offer.promoLabel) badges.push("promo");

    return {
      ...offer,
      badges,
      co2VsAveragePct: Math.round(((offer.co2Kg - avgCo2) / Math.max(1, avgCo2)) * 100),
    };
  });
}

/**
 * Rebuild one offer from its id. This is the seam that lets the details page and
 * the booking flow work on a cold load: a real backend answers `GET /offers/:id`
 * from its fare cache; we answer it by replaying the deterministic generator.
 */
export function offerFromId(id: string): FlightOffer | undefined {
  const decoded = decodeOfferId(id);
  if (!decoded) return undefined;
  const offers = generateOffers(decoded.query);
  // The index is a hint; the id itself is authoritative, since filtering can
  // shift positions between the search that minted it and this replay.
  return offers.find((o) => o.id === id) ?? offers[decoded.index];
}
