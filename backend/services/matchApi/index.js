import dotenv from 'dotenv';

import { createProviderA } from './providerA.js';
import { createProviderB } from './providerB.js';
import { createProviderC } from './providerC.js';
import { createProviderD } from './providerD.js';
import { createProviderDiamond } from './providerDiamond.js';

dotenv.config();

function resolveProviderName(raw, fallback = 'providerA') {
  const name = String(raw || fallback).toLowerCase().trim();
  if (name === 'providerb' || name === 'provider_b') return 'providerB';
  if (name === 'providerc' || name === 'provider_c') return 'providerC';
  if (name === 'providerd' || name === 'provider_d') return 'providerD';
  if (
    name === 'providerdiamond' ||
    name === 'provider_diamond' ||
    name === 'diamond'
  ) {
    return 'providerDiamond';
  }
  if (name === 'providera' || name === 'provider_a') return 'providerA';
  return 'providerA';
}

function createProviderByName(name) {
  switch (name) {
    case 'providerB':
      return createProviderB();
    case 'providerC':
      return createProviderC();
    case 'providerD':
      return createProviderD();
    case 'providerDiamond':
      return createProviderDiamond();
    case 'providerA':
    default:
      return createProviderA();
  }
}

/** Sports / exchange markets (cricket, soccer, tennis, results, bets) */
const SPORT_PROVIDER = resolveProviderName(process.env.API_PROVIDER);
const sportProvider = createProviderByName(SPORT_PROVIDER);

/**
 * Traditional casino tables (Lucky7, etc. via /casino/* endpoints).
 * CASINO_API_PROVIDER — providerA | providerB | providerC | providerD | providerDiamond.
 * If unset, casino uses the same provider as sports.
 * providerDiamond is casino-only (Diamond demo API: gtype + nested payload).
 * GGR live/slot casino is separate (CASINO_API_URL / TOKEN / SECRET).
 */
const CASINO_PROVIDER = resolveProviderName(
  process.env.CASINO_API_PROVIDER,
  SPORT_PROVIDER
);
const casinoProvider =
  CASINO_PROVIDER === SPORT_PROVIDER
    ? sportProvider
    : createProviderByName(CASINO_PROVIDER);

console.log(
  `[API PROVIDER] Sport: ${SPORT_PROVIDER} | Casino: ${CASINO_PROVIDER}` +
    (CASINO_PROVIDER === SPORT_PROVIDER ? ' (same)' : ' (separate)')
);

export const fetchMatchList = (sportId) =>
  sportProvider.fetchMatchList(sportId);
export const fetchMatchData = (gameId, sportId) =>
  sportProvider.fetchMatchData(gameId, sportId);

export const getResult = (payload) => sportProvider.getResult(payload);
export const sendBetIncoming = (payload) =>
  sportProvider.sendBetIncoming(payload);

export const fetchCasinoTables = () => casinoProvider.fetchCasinoTables();
export const fetchCasinoData = (gameId) =>
  casinoProvider.fetchCasinoData(gameId);
export const fetchCasinoResult = (gameId) =>
  casinoProvider.fetchCasinoResult(gameId);
export const fetchCasinoDetailResult = (gameId, mid) =>
  casinoProvider.fetchCasinoDetailResult(gameId, mid);
export const fetchCasinoStream = (gameId) =>
  casinoProvider.fetchCasinoStream(gameId);

export const fetchCricketFancyResult = (eventId, fancyId) =>
  sportProvider.fetchCricketFancyResult(eventId, fancyId);
export const fetchCricketFancyByEvent = (eventId) =>
  sportProvider.fetchCricketFancyByEvent(eventId);
export const fetchStFancyByEvent = (eventId) =>
  sportProvider.fetchStFancyByEvent(eventId);

export const fetchScore = (gmid, sid) => sportProvider.fetchScore(gmid, sid);
export const fetchAllIframes = (gmid, sid) =>
  sportProvider.fetchAllIframes(gmid, sid);

export const getProviderName = () => SPORT_PROVIDER;
export const getCasinoProviderName = () => CASINO_PROVIDER;

export default sportProvider;
