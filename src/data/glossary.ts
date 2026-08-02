import { webUIText } from '../localization/WebUITextContext';
/**
 * Glossary definitions extracted from the base game's Glossary data.
 * Used to power tooltips across the UI, matching the game's in-built glossary system.
 */

export interface GlossaryEntry {
  title: string;
  body: string;
}

function normaliseGlossaryKey(term: string): string {
  return term
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

/** Resolve a `<def id="...">` / glossary term to its entry, case-insensitively. */
export function getGlossaryEntry(term: string | null | undefined): GlossaryEntry | undefined {
  if (!term) return undefined;

  let decoded = term.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep the raw term when it is not URI-encoded.
  }

  const normalised = normaliseGlossaryKey(decoded);
  if (!normalised) return undefined;

  const direct = glossary[decoded as keyof typeof glossary]
    ?? glossary[normalised as keyof typeof glossary];
  if (direct) return direct;

  const lower = normalised.toLowerCase();
  const key = Object.keys(glossary).find((candidate) => candidate.toLowerCase() === lower);
  return key ? glossary[key as keyof typeof glossary] : undefined;
}

const glossary: Record<string, GlossaryEntry> = {
  Food: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.13.1'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.14.2'); },
  },
  Economy: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.17.3'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.18.4'); },
  },
  Governor: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.21.5'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.22.6'); },
  },
  Unrest: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.25.7'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.26.8'); },
  },
  Army: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.29.9'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.30.10'); },
  },
  Navy: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.33.11'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.34.12'); },
  },
  Commander: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.37.13'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.38.14'); },
  },
  Garrison: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.41.15'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.42.16'); },
  },
  Siege: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.45.17'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.46.18'); },
  },
  'Siege Power': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.49.19'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.50.20'); },
  },
  Attrition: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.53.21'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.54.22'); },
  },
  Supply: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.57.23'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.58.24'); },
  },
  Morale: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.61.25'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.62.26'); },
  },
  Manpower: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.65.27'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.66.28'); },
  },
  Recruitment: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.69.29'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.70.30'); },
  },
  Upkeep: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.73.31'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.74.32'); },
  },
  Stockpile: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.77.33'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.78.34'); },
  },
  Trade: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.81.35'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.82.36'); },
  },
  Taxation: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.85.37'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.86.38'); },
  },
  Population: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.89.39'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.90.40'); },
  },
  Settlement: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.93.41'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.94.42'); },
  },
  Province: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.97.43'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.98.44'); },
  },
  Overlord: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.101.45'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.102.46'); },
  },
  Subject: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.105.47'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.106.48'); },
  },
  Diplomacy: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.109.49'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.110.50'); },
  },
  Treaty: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.113.51'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.114.52'); },
  },
  Truce: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.117.53'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.118.54'); },
  },
  Foederati: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.121.55'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.122.56'); },
  },
  Resource: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.125.57'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.126.58'); },
  },
  Production: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.129.59'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.130.60'); },
  },
  Construction: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.133.61'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.134.62'); },
  },
  'Building Queue': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.137.63'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.138.64'); },
  },
  Treasury: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.141.65'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.142.66'); },
  },
  Culture: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.145.67'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.146.68'); },
  },
  Religion: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.149.69'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.150.70'); },
  },
  Trait: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.153.71'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.154.72'); },
  },
  Authority: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.157.73'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.158.74'); },
  },
  Tactics: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.161.75'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.162.76'); },
  },
  Cunning: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.165.77'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.166.78'); },
  },
  Governance: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.169.79'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.170.80'); },
  },
  Loyalty: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.173.81'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.174.82'); },
  },
  Constitution: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.177.83'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.178.84'); },
  },
  Opinion: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.181.85'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.182.86'); },
  },
  Patronage: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.185.87'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.186.88'); },
  },
  Client: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.189.89'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.190.90'); },
  },
  Pact: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.193.91'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.194.92'); },
  },
  Spy: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.197.93'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.198.94'); },
  },
  Diplomat: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.201.95'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.202.96'); },
  },
  'Family Tree': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.205.97'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.206.98'); },
  },
  Seasons: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.209.99'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.210.100'); },
  },
  Blockade: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.213.101'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.214.102'); },
  },
  'Transport Network': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.217.103'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.218.104'); },
  },
  Convoy: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.221.105'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.222.106'); },
  },
  Dependencies: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.225.107'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.226.108'); },
  },
  Faction: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.229.109'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.230.110'); },
  },
  Ruler: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.233.111'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.234.112'); },
  },
  'War Score': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.237.113'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.238.114'); },
  },
  'War Goal': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.241.115'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.242.116'); },
  },
  Concession: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.245.117'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.246.118'); },
  },
  Tribute: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.249.119'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.250.120'); },
  },
  Command: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.253.121'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.254.122'); },
  },
  Fleet: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.257.123'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.258.124'); },
  },
  Strength: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.261.125'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.262.126'); },
  },
  Formation: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.265.127'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.266.128'); },
  },
  Unit: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.269.129'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.270.130'); },
  },
  'Power Bloc': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.273.131'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.274.132'); },
  },
  'Pierce Damage': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.277.133'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.278.134'); },
  },
  'Crush Damage': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.281.135'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.282.136'); },
  },
  'Slash Damage': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.285.137'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.286.138'); },
  },
  'Pierce Armour': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.289.139'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.290.140'); },
  },
  'Crush Armour': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.293.141'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.294.142'); },
  },
  'Slash Armour': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.297.143'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.298.144'); },
  },
  'Damage Types': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.301.145'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.302.146'); },
  },
  Armour: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.305.147'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.306.148'); },
  },
  Veterancy: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.309.149'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.310.150'); },
  },
  Speed: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.313.151'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.314.152'); },
  },
  'Military Alliance': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.317.153'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.318.154'); },
  },
  'Defensive Alliance': {
    get title() { return webUIText('Auto.TopProp.DataGlossary.321.155'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.322.156'); },
  },
  Protectorate: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.325.157'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.326.158'); },
  },
  Compliance: {
    get title() { return webUIText('Auto.TopProp.DataGlossary.329.159'); },
    get body() { return webUIText('Auto.TopProp.DataGlossary.330.160'); },
  },
  Corruption: {
    get title() { return webUIText('Glossary.Corruption.Title'); },
    get body() { return webUIText('Glossary.Corruption.Body'); },
  },
  Disease: {
    get title() { return webUIText('Glossary.Disease.Title'); },
    get body() { return webUIText('Glossary.Disease.Body'); },
  },
  Dynasty: {
    get title() { return webUIText('Glossary.Dynasty.Title'); },
    get body() { return webUIText('Glossary.Dynasty.Body'); },
  },
  Heir: {
    get title() { return webUIText('Glossary.Heir.Title'); },
    get body() { return webUIText('Glossary.Heir.Body'); },
  },
  Rebellion: {
    get title() { return webUIText('Glossary.Rebellion.Title'); },
    get body() { return webUIText('Glossary.Rebellion.Body'); },
  },
  Succession: {
    get title() { return webUIText('Glossary.Succession.Title'); },
    get body() { return webUIText('Glossary.Succession.Body'); },
  },
};

export default glossary;
