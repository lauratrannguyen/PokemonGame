import PokemonFactory from './PokemonFactory';
import { PokemonLocation, PokemonName } from '../CoveyTypes';

jest.useFakeTimers();

const mockPokemonListenerOnTimeout = jest.fn();
const mockPokemonListenerOnCatch = jest.fn();

describe('PokemonFactory', () => {
  beforeEach(() => {
    mockPokemonListenerOnTimeout.mockClear();
    mockPokemonListenerOnCatch.mockClear();
  });

  it('should properly fetch pokemon data from PokeAPI', () => {
    const factory = PokemonFactory.getInstance();
    const testingLocation: PokemonLocation = PokemonFactory.createPokemonLocation(0, 0, true, 'front');

    return factory.spawnPokemon(PokemonName.piplup, testingLocation, mockPokemonListenerOnTimeout, 1).then(p => {
      expect(p.species.name).toEqual(PokemonName.piplup);
      expect(p.species.type1).toEqual('water');
      expect(p.species.type2).toBeUndefined();
      expect(p.species.spriteURL).toEqual('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/393.png');

      // expect(mockPokemonListenerOnTimeout.mock.calls.length).toBe(1);
    });
  });
});