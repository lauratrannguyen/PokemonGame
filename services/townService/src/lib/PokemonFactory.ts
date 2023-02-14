import axios from 'axios';
import Pokemon from '../types/Pokemon';
import { Direction, PokemonKeys, PokemonLocation, PokemonName, PokemonSpecies, PokemonType } from '../CoveyTypes';

// types definitions for pokemon species cache
type PokemonCache = { [key in PokemonKeys]? : PokemonSpecies };

// type definition for api response
interface PokemonResponse {
  moves: Array<{
    name: string,
    url: string,
  }>,
  sprites: {
    front_default: string,
  },
  types: Array<{
    slot: number,
    type: {
      name: PokemonType,
      url: string,
    },
  }>,
}

/** the pokemon factory spawns new pokemon and fetches species information */
export default class PokemonFactory {
  private static _instance: PokemonFactory;

  private _cache: PokemonCache = {};

  /**
   * Retrieve the singleton PokemonFactory.
   */
  static getInstance(): PokemonFactory {
    if (PokemonFactory._instance === undefined) {
      PokemonFactory._instance = new PokemonFactory();
    }

    return PokemonFactory._instance;
  }

  /**
   * gets the url for a pokemon from pokeapi by name
   * @param name 
   * @returns the url to fetch pokemon json data
   */
  static pokemonURLForName(name: string): string {
    return `https://pokeapi.co/api/v2/pokemon/${name}`;
  }

  /** creates a new pokemon, if the species data is not yet cached, makes a call to PokeAPI
   * @param name the pokemon's name
   * @param location the location for the pokemon
   * @returns the new pokemon
  */
  async spawnPokemon(name: PokemonName, location: PokemonLocation, destructor: (id: string) => void, lifespan: number): Promise<Pokemon> {
    const cachedSpecies = this._cache[name];

    if (cachedSpecies !== undefined) {
      return new Pokemon(location, cachedSpecies, destructor, lifespan);
    }

    const newSpecies = await PokemonFactory.fetchSpeciesData(name);

    this._cache[name] = newSpecies;

    return new Pokemon(location, newSpecies, destructor, lifespan); 
  }

  /**
   * Fetch species data from PokeAPI
   * @param name of the pokemon to collect data on
   * @returns a new PokemonSpecies
   */
  private static async fetchSpeciesData(name: PokemonName): Promise<PokemonSpecies> {
    const species = await axios.get(PokemonFactory.pokemonURLForName(name))
      .then(response => {
        const data: PokemonResponse = response.data as unknown as PokemonResponse;
        
        return {
          name,
          spriteURL: data.sprites.front_default,
          type1: data.types[0].type.name,
          type2: data.types[1]?.type.name,
          moves: data.moves.map(move => move.name),
        };
      })
      .catch(err => { 
        // console.log('Error fetching pokemon data: PokemonFactory')
        throw Error(`failed to fetch ${name}\n${err}`);
      });

    return species;
  }

  /**
   * Helper method to construct pokemon locations
   * @param x 
   * @param y 
   * @param isWild 
   * @param direction 
   * @returns a PokemonDirection with the provided values.
   */
  public static createPokemonLocation(x: number, y: number, isWild: boolean, direction: Direction): PokemonLocation {
    return {
      x,
      y,
      isWild,
      direction,
    };
  }

}
