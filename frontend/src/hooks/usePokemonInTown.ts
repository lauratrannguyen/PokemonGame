import assert from 'assert';
import { useContext } from 'react';
import Pokemon from '../classes/Pokemon';
import PokemonInTownContext from '../contexts/PokemonInTownContext';

/**
 * This hook provides access to the list of all player objects in the town.
 * 
 * Components that use this hook will be re-rendered each time that the list of pokemon in the town
 * changes (e.g. as pokemon come and go).
 * 
 * Components that use this hook will NOT be re-rendered each time that a pokemon moves,
 * see usePokemonMovement if that is necessary
 */
export default function usePokemonInTown(): Pokemon[] {
  const ctx = useContext(PokemonInTownContext);
  assert(ctx, 'PokemonInTownContext context should be defined.');
  return ctx;
}
