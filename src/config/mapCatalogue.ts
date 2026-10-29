/**
 * OpenFront maps with their English names and map picker categories.
 * Mirrors OpenFront's GameMapType enum, resources/lang/en.json and map info; refresh it by hand.
 */

export interface MapCatalogueEntry {
  /** The `gameConfig.gameMap` wire value. */
  gameMap: string;
  name: string;
  categories: readonly MapCategory[];
  /**
   * Mirrors OpenFront's map id, lowercased: the name of the map asset directory.
   * Set only when it differs from the name without spaces, dots and parentheses.
   */
  assetKey?: string;
}

export type MapCategory =
  | 'world'
  | 'continental'
  | 'europe'
  | 'asia'
  | 'north_america'
  | 'africa'
  | 'south_america'
  | 'oceania'
  | 'antarctica'
  | 'countries'
  | 'cosmic'
  | 'fictional'
  | 'arcade'
  | 'tournament'
  | 'other';

export const MAP_CATEGORY_LABELS: Record<MapCategory, string> = {
  world: 'World',
  continental: 'Continental',
  europe: 'Europe',
  asia: 'Asia',
  north_america: 'North America',
  africa: 'Africa',
  south_america: 'South America',
  oceania: 'Oceania',
  antarctica: 'Antarctica',
  countries: 'Countries',
  cosmic: 'Cosmic',
  fictional: 'Fictional',
  arcade: 'Arcade',
  tournament: 'Tournament',
  other: 'Other',
};

export const MAP_CATEGORY_ORDER: readonly MapCategory[] = [
  'world',
  'continental',
  'europe',
  'asia',
  'north_america',
  'africa',
  'south_america',
  'oceania',
  'antarctica',
  'countries',
  'cosmic',
  'fictional',
  'arcade',
  'tournament',
  'other',
];

export const MAP_CATALOGUE: readonly MapCatalogueEntry[] = [
  { gameMap: 'Achiran', name: 'Achiran', categories: ['europe', 'fictional'] },
  { gameMap: 'Aegean', name: 'Aegean', categories: ['europe', 'asia'] },
  { gameMap: 'Africa', name: 'Africa', categories: ['continental', 'africa'] },
  { gameMap: 'Alps', name: 'Alps', categories: ['europe'] },
  { gameMap: 'Amazon River', name: 'Amazon River', categories: ['south_america'] },
  { gameMap: 'Antarctica', name: 'Antarctica', categories: ['continental', 'antarctica'] },
  { gameMap: 'ArchipelagoSea', name: 'Archipelago Sea', categories: ['europe'] },
  { gameMap: 'Arctic', name: 'Arctic', categories: ['europe', 'asia', 'north_america'] },
  { gameMap: 'Asia', name: 'Asia', categories: ['continental', 'asia'] },
  { gameMap: 'Australia', name: 'Australia', categories: ['oceania'] },
  {
    gameMap: 'Bab el-Mandeb Strait',
    name: 'Bab el-Mandeb Strait',
    categories: ['asia', 'africa'],
    assetKey: 'babelmandebstrait',
  },
  { gameMap: 'Baikal', name: 'Baikal', categories: ['asia'] },
  { gameMap: 'Baikal Nuke Wars', name: 'Baikal (Nuke Wars)', categories: ['fictional'] },
  { gameMap: 'Baja California', name: 'Baja California', categories: ['north_america'] },
  { gameMap: 'Balkans', name: 'Balkans', categories: ['europe'] },
  { gameMap: 'Balkhash', name: 'Balkhash', categories: ['asia'] },
  { gameMap: 'Baltics', name: 'Baltics', categories: ['europe'] },
  { gameMap: 'Benelux', name: 'Benelux', categories: ['europe', 'countries'] },
  { gameMap: 'Bering Sea', name: 'Bering Sea', categories: ['asia', 'north_america'] },
  { gameMap: 'Bering Strait', name: 'Bering Strait', categories: ['asia', 'north_america'] },
  { gameMap: 'Between Two Seas', name: 'Between Two Seas', categories: ['europe', 'asia'] },
  { gameMap: 'Black Sea', name: 'Black Sea', categories: ['europe', 'asia'] },
  { gameMap: 'Bosphorus Straits', name: 'Bosphorus Straits', categories: ['europe', 'asia'] },
  { gameMap: 'Brain Rot', name: 'Brain Rot', categories: ['arcade'] },
  { gameMap: 'Branching Paths', name: 'Branching Paths', categories: ['arcade'] },
  { gameMap: 'Britannia', name: 'Britannia', categories: ['europe'] },
  { gameMap: 'Britannia Classic', name: 'Britannia (Classic)', categories: ['europe'] },
  { gameMap: 'Canary Islands', name: 'Canary Islands', categories: ['africa'] },
  { gameMap: 'Cape Cod', name: 'Cape Cod', categories: ['north_america'] },
  { gameMap: 'Cape Of Good Hope', name: 'Cape Of Good Hope', categories: ['africa'] },
  { gameMap: 'Caribbean', name: 'Caribbean', categories: ['north_america'] },
  { gameMap: 'Caspian Sea', name: 'Caspian Sea', categories: ['asia'] },
  { gameMap: 'Caucasus', name: 'Caucasus', categories: ['europe', 'asia'] },
  { gameMap: 'Central America', name: 'Central America', categories: ['north_america'] },
  { gameMap: 'Channel Islands', name: 'Channel Islands', categories: ['north_america'] },
  { gameMap: 'China', name: 'China', categories: ['asia', 'countries'] },
  { gameMap: 'Chopping Block', name: 'Chopping Block', categories: ['arcade'] },
  { gameMap: 'Clearwater Lakes', name: 'Clearwater Lakes', categories: ['north_america'] },
  { gameMap: 'Conakry', name: 'Conakry', categories: ['africa'] },
  { gameMap: 'Crimea', name: 'Crimea', categories: ['europe'] },
  { gameMap: 'Danish Straits', name: 'Danish Straits', categories: ['europe'] },
  { gameMap: 'Deglaciated Antarctica', name: 'Deglaciated Antarctica', categories: ['antarctica', 'fictional'] },
  { gameMap: 'Didier', name: 'Didier', categories: ['arcade'] },
  { gameMap: 'Didier France', name: 'Didier (France)', categories: ['arcade'] },
  { gameMap: 'Dyslexdria', name: 'Dyslexdria', categories: ['world', 'fictional'] },
  { gameMap: 'East Asia', name: 'East Asia', categories: ['asia'] },
  { gameMap: 'Europe', name: 'Europe', categories: ['continental', 'europe'] },
  { gameMap: 'Europe Classic', name: 'Europe (Classic)', categories: ['continental', 'europe'] },
  { gameMap: 'Falkland Islands', name: 'Falkland Islands', categories: ['south_america'] },
  { gameMap: 'Faroe Islands', name: 'Faroe Islands', categories: ['europe'] },
  { gameMap: 'Finger Lakes', name: 'Finger Lakes', categories: ['north_america'] },
  { gameMap: 'Four Islands', name: 'Four Islands', categories: ['fictional'] },
  { gameMap: 'France', name: 'France', categories: ['europe', 'countries'] },
  { gameMap: 'Gateway to the Atlantic', name: 'Gateway to the Atlantic', categories: ['europe'] },
  { gameMap: 'Germany', name: 'Germany', categories: ['europe', 'countries'] },
  { gameMap: 'Giant World Map', name: 'Giant World Map', categories: ['world'] },
  { gameMap: 'Great Lakes', name: 'Great Lakes', categories: ['north_america'] },
  { gameMap: 'Gulf Of Guinea', name: 'Gulf Of Guinea', categories: ['africa'] },
  { gameMap: 'Gulf Of Mexico', name: 'Gulf Of Mexico', categories: ['north_america'] },
  { gameMap: 'Gulf of St. Lawrence', name: 'Gulf of St. Lawrence', categories: ['north_america'] },
  { gameMap: 'Halkidiki', name: 'Halkidiki', categories: ['europe'] },
  { gameMap: 'Hawaii', name: 'Hawaii', categories: ['oceania'] },
  { gameMap: 'Hecate Strait', name: 'Hecate Strait', categories: ['north_america'] },
  { gameMap: 'Hong Kong', name: 'Hong Kong', categories: ['asia'] },
  { gameMap: 'Horn Of Africa', name: 'Horn Of Africa', categories: ['africa'] },
  { gameMap: 'Iceland', name: 'Iceland', categories: ['europe'] },
  { gameMap: 'Indian Subcontinent', name: 'Indian Subcontinent', categories: ['asia'] },
  { gameMap: 'Irish Sea', name: 'Irish Sea', categories: ['europe'] },
  { gameMap: 'Italia', name: 'Italia', categories: ['europe'] },
  { gameMap: 'Japan', name: 'Japan', categories: ['asia', 'countries'] },
  { gameMap: 'Juan De Fuca Strait', name: 'Juan De Fuca Strait', categories: ['north_america'] },
  { gameMap: 'Korea', name: 'Korea', categories: ['asia', 'countries'] },
  { gameMap: 'Labyrinth', name: 'Labyrinth', categories: ['arcade'] },
  { gameMap: 'Las Vegas Strip', name: 'Las Vegas Strip', categories: ['north_america'] },
  { gameMap: 'Lemnos', name: 'Lemnos', categories: ['europe'] },
  { gameMap: 'Levant', name: 'Levant', categories: ['asia'] },
  { gameMap: 'Lisbon', name: 'Lisbon', categories: ['europe'] },
  { gameMap: 'Los Angeles', name: 'Los Angeles', categories: ['north_america'] },
  { gameMap: 'Luna', name: 'Luna', categories: ['cosmic'] },
  { gameMap: 'Madagascar', name: 'Madagascar', categories: ['africa'] },
  { gameMap: 'Manicouagan', name: 'Manicouagan', categories: ['north_america'] },
  { gameMap: 'Mare Nostrum', name: 'Mare Nostrum', categories: ['europe', 'asia', 'africa'] },
  { gameMap: 'Mars', name: 'Mars', categories: ['cosmic'] },
  { gameMap: 'Mena', name: 'MENA', categories: ['asia', 'africa'] },
  { gameMap: 'Middle East', name: 'Middle East', categories: ['asia'] },
  { gameMap: 'MilkyWay', name: 'Milky Way', categories: ['cosmic'] },
  { gameMap: 'Mississippi River', name: 'Mississippi River', categories: ['north_america'] },
  { gameMap: 'Montreal', name: 'Montreal', categories: ['north_america'] },
  { gameMap: 'More Than Luck', name: 'More Than Luck', categories: ['arcade'] },
  { gameMap: 'New York City', name: 'New York City', categories: ['north_america'] },
  { gameMap: 'New Zealand', name: 'New Zealand', categories: ['oceania'] },
  { gameMap: 'Nile Delta', name: 'Nile Delta', categories: ['africa'] },
  { gameMap: 'North America', name: 'North America', categories: ['continental', 'north_america'] },
  { gameMap: 'Northwest Passage', name: 'Northwest Passage', categories: ['north_america'] },
  { gameMap: 'Oceania', name: 'Oceania', categories: ['continental', 'oceania'] },
  { gameMap: 'Ommatrypta', name: 'Ommatrypta', categories: ['arcade'] },
  { gameMap: 'Onion', name: 'Onion', categories: ['arcade'] },
  { gameMap: 'Pangaea', name: 'Pangaea', categories: ['fictional'] },
  { gameMap: 'Passage', name: 'Passage', categories: ['fictional'] },
  { gameMap: 'Pluto', name: 'Pluto', categories: ['cosmic'] },
  { gameMap: 'Pulicat Lake', name: 'Pulicat Lake', categories: ['asia'] },
  { gameMap: 'Qing China', name: 'Qing China', categories: ['asia', 'countries'] },
  { gameMap: 'Rio de Janeiro', name: 'Rio de Janeiro', categories: ['south_america'] },
  { gameMap: 'Russia', name: 'Russia', categories: ['europe', 'asia', 'countries'] },
  { gameMap: 'San Francisco', name: 'San Francisco', categories: ['north_america'] },
  { gameMap: 'Scandinavia', name: 'Scandinavia', categories: ['europe'] },
  { gameMap: 'Sierpinski', name: 'Sierpinski', categories: ['arcade'] },
  { gameMap: 'Sol', name: 'Sol', categories: ['cosmic'] },
  { gameMap: 'South America', name: 'South America', categories: ['continental', 'south_america'] },
  { gameMap: 'SoutheastAsia', name: 'Southeast Asia', categories: ['asia'] },
  { gameMap: 'Strait of Gibraltar', name: 'Strait of Gibraltar', categories: ['europe', 'africa'] },
  { gameMap: 'Strait of Hormuz', name: 'Strait of Hormuz', categories: ['asia'] },
  { gameMap: 'Strait Of Malacca', name: 'Strait Of Malacca', categories: ['asia'] },
  { gameMap: 'Surrounded', name: 'Surrounded', categories: ['fictional'] },
  { gameMap: 'Svalmel', name: 'Svalmel', categories: ['europe', 'north_america', 'fictional'] },
  { gameMap: 'Taiwan Strait', name: 'Taiwan Strait', categories: ['asia'] },
  { gameMap: 'The Box', name: 'The Box', categories: ['arcade'] },
  { gameMap: 'Tierra Del Fuego', name: 'Tierra Del Fuego', categories: ['south_america'] },
  { gameMap: 'Titan', name: 'Titan', categories: ['cosmic'] },
  { gameMap: 'Tourney 2 Teams', name: 'Tourney 2 Teams', categories: ['tournament'], assetKey: 'tourney1' },
  { gameMap: 'Tourney 3 Teams', name: 'Tourney 3 Teams', categories: ['tournament'], assetKey: 'tourney2' },
  { gameMap: 'Tourney 4 Teams', name: 'Tourney 4 Teams', categories: ['tournament'], assetKey: 'tourney3' },
  { gameMap: 'Tourney 8 Teams', name: 'Tourney 8 Teams', categories: ['tournament'], assetKey: 'tourney4' },
  { gameMap: 'Traders Dream', name: 'Traders Dream', categories: ['fictional'] },
  { gameMap: 'Two Lakes', name: 'Two Lakes', categories: ['europe'] },
  { gameMap: 'United States', name: 'United States', categories: ['north_america', 'countries'] },
  { gameMap: 'Vancouver Island', name: 'Vancouver Island', categories: ['north_america'] },
  { gameMap: 'Venice', name: 'Venice', categories: ['europe'] },
  { gameMap: 'Vietnam', name: 'Vietnam', categories: ['asia', 'countries'] },
  { gameMap: 'Warship Warship', name: 'Warship Warship', categories: ['arcade'] },
  { gameMap: 'World', name: 'World', categories: ['world'] },
  { gameMap: 'World Inverted', name: 'World Inverted', categories: ['world', 'fictional'] },
  { gameMap: 'Yangtze River', name: 'Yangtze River', categories: ['asia'] },
  { gameMap: 'Yellow Sea', name: 'Yellow Sea', categories: ['asia'] },
  { gameMap: 'Yenisei', name: 'Yenisei', categories: ['asia'] },
];

