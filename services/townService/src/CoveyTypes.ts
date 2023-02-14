export type Direction = 'front' | 'back' | 'left' | 'right';
export type UserLocation = {
  x: number;
  y: number;
  rotation: Direction;
  moving: boolean;
  conversationLabel?: string;
};
export type CoveyTownList = { friendlyName: string; coveyTownID: string; currentOccupancy: number; maximumOccupancy: number }[];

export type ChatMessage = {
  author: string;
  sid: string;
  body: string;
  dateCreated: Date;
};

export type PokemonLocation = {
  x: number,
  y: number,
  isWild: boolean,
  direction: Direction, 
};

export enum PokemonName {
  // starter
  piplup = 'piplup',
  turtwig = 'turtwig',
  chimchar = 'chimchar',
  // achievement unlocked
  magikarp = 'magikarp',
  pikachu = 'pikachu',
  eevee = 'eevee',
  charmander = 'charmander',
  charizard = 'charizard',
  bulbasaur = 'bulbasaur',
  gengar = 'gengar',
  squirtle = 'squirtle',
  snorlax = 'snorlax',
  umbreon = 'umbreon',
  arcanine = 'arcanine',
  jigglypuff = 'jigglypuff',
  dragonite = 'dragonite',
  lucario = 'lucario',
  dialga = 'dialga',
  palkia = 'palkia',
  mewtwo = 'mewtwo',
  // New
  blastoise = 'blastoise',
  ninetales = 'ninetales',
  garchomp = 'garchomp',
  lugia = 'lugia',
  marowak = 'marowak',
  hitmonlee = 'hitmonlee',
  hitmonchan = 'hitmonchan',
  lickitung = 'lickitung',
  koffing = 'koffing',
  weezing = 'weezing',
  rhyhorn = 'rhyhorn',
  rhydon = 'rhydon',
  chansey = 'chansey',
  tangela = 'tangela',
  kangaskhan = 'kangaskhan',
  horsea = 'horsea',
  goldeen = 'goldeen',
  seaking = 'seaking',

  beautifly = 'beautifly',
  psyduck = 'psyduck',
  alakazam = 'alakazam',
  rapidash = 'rapidash',
  krabby = 'krabby',
  vaporeon = 'vaporeon',
  chikorita = 'chikorita',
  totodile = 'totodile',
  bonsly = 'bonsly',
  munchlax = 'munchlax',
  finneon = 'finneon',
  cleffa = 'cleffa',
  pichu = 'pichu',
  octillery = 'octillery',
  buizel = 'buizel',
  hoppip = 'hoppip',
  sceptile = 'sceptile',

  venomoth = 'venomoth',
  meowth = 'meowth',
  vulpix = 'vulpix',
  rattata = 'rattata',
  clefairy = 'clefairy',
  diglett = 'diglett',
  togepi = 'togepi',
  marill = 'marill',
  sandshrew = 'sandshrew',
  slowpoke = 'slowpoke',
}

// pokemon that spawn without the completion of an achievement
export const DEFAULT_POKEMON: PokemonName[] = [
  PokemonName.piplup,
  PokemonName.turtwig,
  PokemonName.chimchar,
];

export type PokemonKeys = keyof typeof PokemonName;
type PokemonSpawnRates = { [key in PokemonKeys] : number };

// a lower number means that it is more rare and does not spawn as often
// a higher number means that it is more common and spawns more often
// Scale of 1 < 10 (never 10 so it doesnt spawn 100% of the time)
export const POKEMON_SPAWN_RATES: PokemonSpawnRates = {
  // Starters are usually rare
  piplup: 1,
  turtwig: 1,
  chimchar: 1,

  // Rare ones
  magikarp: 4,
  pikachu: 2,
  eevee: 3,
  charmander: 3,
  charizard: 3,
  bulbasaur: 3,
  gengar: 5,
  squirtle: 3,
  snorlax: 2,
  umbreon: 5,
  arcanine: 5,
  jigglypuff: 5,
  dragonite: 5,
  lucario: 2,
  blastoise: 3,
  ninetales: 3,
  garchomp: 3,
  lugia: 1,
  // Rarest in general
  dialga: 1,
  palkia: 1,
  mewtwo: 1,

  // More common
  marowak: 6,
  hitmonlee: 6,
  hitmonchan: 6,
  lickitung: 5,
  koffing: 5,
  weezing: 5,
  rhyhorn: 5,
  rhydon: 5,
  chansey: 6,
  tangela: 6,
  kangaskhan: 6,
  horsea: 5,
  goldeen: 5,
  seaking: 7,
  beautifly: 9,
  psyduck: 9,
  alakazam: 6,
  rapidash: 5,
  krabby: 9,
  vaporeon: 6,
  chikorita: 8,
  totodile: 9,
  bonsly: 7,
  munchlax: 8,
  finneon: 9,
  cleffa: 5,
  pichu: 6,
  octillery: 5,
  buizel: 7,
  hoppip: 8,
  sceptile: 5,

  venomoth: 5, 
  meowth: 6,
  vulpix: 7,
  rattata: 5,
  clefairy: 6,
  diglett: 7,
  togepi: 7,
  marill: 6,
  sandshrew: 8, 
  slowpoke: 8,

};

export type PokemonType = 'shadow' | 'unknown' | 'fairy' | 'dark' | 'dragon' | 'ice' | 'psychic' 
| 'electric' | 'grass' | 'water' | 'fire' | 'steel' | 'ghost' 
| 'bug' | 'rock' | 'ground' | 'poison' | 'flying' | 'fighting' | 'normal';

export type PokemonSpecies = {
  name: PokemonName,
  spriteURL: string,
  type1: PokemonType,
  type2: PokemonType | undefined,
  moves: string[],
};

export type AchievementKey = '2players' | '5players' | '10players' | '25players' | '50players'
| '10moves' | '25moves' | '50moves' | '100moves' | '1000moves'
| '1conversationAreas' | '3conversateionAreas' | '5conversationAreas'
| '1chats' | '5chats' | '25chats' | '100chats' | '10pokemonCaught' | '25pokemonCaught' 
| '50pokemonCaught' | '100pokemonCaught';

export enum TrainerName {
  lucas = 'lucas',
  dawn = 'dawn',
  barry = 'barry',
  cynthia = 'cynthia',
  cyrus = 'cyrus',
  rowan = 'rowan',
  oak = 'oak',
  misty = 'misty',
  cheryl = 'cheryl',
  wake = 'wake',
  byron = 'byron',
  candice = 'candice',
  gardenia = 'gardenia',
  flint = 'flint',
  bertha = 'bertha',
  palmer = 'palmer',
  hatboy = 'hatboy',
  farmgirl = 'farmgirl',
  grunt = 'grunt',
  karate = 'karate',
  mom = 'mom',
  katie = 'katie',
  karen = 'karen',
  tubegirl = 'tubegirl',
}
