
export default class Pokemon {
  public location: PokemonLocation;

  public sprite?: Phaser.GameObjects.Sprite;

  public label?: Phaser.GameObjects.Text;

	public species: PokemonSpecies;

  public _id: string;

  public offset: PokemonOffset;

  constructor(id: string, species: PokemonSpecies, location: PokemonLocation) {
		this.species = species;
    this.location = location;
    this._id = id;
    this.offset = {
      x: 0,
      y: 0,
    }
  }

  get name(): string {
    return this.species.name;
  }

  static fromServerPokemon(pokemonFromServer: ServerPokemon): Pokemon {
    return new Pokemon(pokemonFromServer._id, pokemonFromServer.species, pokemonFromServer.location);
  }
}
export type ServerPokemon = { species: PokemonSpecies, location: PokemonLocation, _id: string };

export type PokemonDirection = 'front'|'back'|'left'|'right';

export type PokemonSpecies = {
  name: PokemonName,
  spriteURL: string,
  type1: PokemonType,
  type2: PokemonType | undefined,
  moves: string[],
};

export type PokemonType = 'shadow' | 'unknown' | 'fairy' | 'dark' | 'dragon' | 'ice' | 'psychic' 
| 'electric' | 'grass' | 'water' | 'fire' | 'steel' | 'ghost' 
| 'bug' | 'rock' | 'ground' | 'poison' | 'flying' | 'fighting' | 'normal';

export type PokemonLocation = {
  x: number,
  y: number,
  isWild: boolean,
};

export type PokemonOffset = {
  x: number,
  y: number,
}

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
  slowpoke = 'slowpoke'
}