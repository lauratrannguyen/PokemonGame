import { nanoid } from 'nanoid';
import { PokemonLocation, PokemonSpecies, PokemonType } from '../CoveyTypes';


/**
 * Each pokemon in a town or owned by a player is represented by a Pokemon object
 */
export default class Pokemon {
  /** the current location of the pokemon in the world map (if wild) */
  public location: PokemonLocation;

  /** unique identifier for this pokemon */
  private readonly _id: string;

  /** the species of this pokemon */
  public species: PokemonSpecies;

  /** a pokemon should have up to 4 moves */
  public moves: string[];

  constructor(location: PokemonLocation, species: PokemonSpecies, destructor: (id: string) => void, lifespan: number) {
    this.location = location;
    this.species = species;
    this._id = nanoid();

    // pokemon gets 4 random moves from it's species
    const shuffledMoves = species.moves.sort(() => 0.5 - Math.random());
    this.moves = shuffledMoves.splice(0, 4);

    setTimeout(() => {
      if (this.location.isWild) {
        destructor(this._id);
      }
    }, lifespan * 1000);
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this.species.name;
  }

  get type1(): PokemonType {
    return this.species.type1;
  }

  get type2(): PokemonType | undefined {
    return this.species.type2;
  }

  get spriteURL(): string {
    return this.species.spriteURL;
  }

  get isWild(): boolean {
    return this.location.isWild;
  }
}