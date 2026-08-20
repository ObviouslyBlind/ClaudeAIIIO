/**
 * Road classes. One table, shared by the graph builder (src/roadGraph.ts),
 * the renderer (roads.js) and the taxi (roadnet.js).
 *
 * Widths are chosen so the hierarchy reads from the play camera, which sits
 * ~30 m up and looks a kilometre inland. A 2 m difference is invisible there;
 * these steps are not.
 */

/** @typedef {"highway"|"avenue"|"street"|"lane"|"track"} RoadClass */

export const ROAD_CLASSES = {
  /** Dual carriageway. One filled tarmac deck; paint marks the median. */
  highway: { carriageM: 8, dual: true, medianM: 10, sidewalkM: 0, dirt: false, rank: 5 },
  /** Town arterial. Wide single carriageway with walks both sides. */
  avenue: { carriageM: 9, dual: false, medianM: 0, sidewalkM: 2.6, dirt: false, rank: 4 },
  /** Ordinary two-way street with narrow walks. */
  street: { carriageM: 6.6, dual: false, medianM: 0, sidewalkM: 2, dirt: false, rank: 3 },
  /** Single-track paved lane. No walks, passing places only. */
  lane: { carriageM: 4.6, dual: false, medianM: 0, sidewalkM: 0, dirt: false, rank: 2 },
  /** Packed earth field track. */
  track: { carriageM: 3, dual: false, medianM: 0, sidewalkM: 0, dirt: true, rank: 1 },
};

export const ROAD_CLASS_IDS = Object.keys(ROAD_CLASSES);

export function roadClassSpec(cls) {
  return ROAD_CLASSES[cls] || ROAD_CLASSES.street;
}

/** Tarmac only, across both carriageways and the median. */
export function carriagewayWidthM(cls) {
  const s = roadClassSpec(cls);
  return s.dual ? s.carriageM * 2 + s.medianM : s.carriageM;
}

/** Tarmac plus sidewalks — the whole built footprint. */
export function roadWidthM(cls) {
  return carriagewayWidthM(cls) + roadClassSpec(cls).sidewalkM * 2;
}

/**
 * Metres from the edge centreline to the middle of a driving lane.
 * Zero on a single carriageway; half a median plus half a carriageway on a dual.
 */
export function laneOffsetM(cls) {
  const s = roadClassSpec(cls);
  return s.dual ? s.medianM / 2 + s.carriageM / 2 : 0;
}

export function isDirtClass(cls) {
  return roadClassSpec(cls).dirt === true;
}
