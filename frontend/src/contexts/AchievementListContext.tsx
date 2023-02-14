import React from 'react';
import { PokemonName } from '../classes/Pokemon';
import { AchievementList } from '../CoveyTypes';

export const DEFAULT_ACHIEVEMENT_LIST: AchievementList = {
  '2players': {
    type: 'players',
    completed: false,
    pokemonName: [PokemonName.magikarp, PokemonName.clefairy],
    threshold: 2,
  },
  '5players': {
    type: 'players',
    completed: false,
    pokemonName: [PokemonName.squirtle, PokemonName.weezing],
    threshold: 5,
  },
  '10players': {
    type: 'players',
    completed: false,
    pokemonName: [PokemonName.bulbasaur, PokemonName.rhyhorn, PokemonName.venomoth],
    threshold: 10,
  },
  '25players': {
    type: 'players',
    completed: false,
    pokemonName: [PokemonName.charmander, PokemonName.rhydon, PokemonName.meowth],

    threshold: 25,
  },
  '50players': {
    type: 'players',
    completed: false,
    pokemonName: [PokemonName.jigglypuff, PokemonName.chansey, PokemonName.beautifly],
    threshold: 50,
  },
  '10moves': {
    type: 'moves',
    completed: false,
    pokemonName: [PokemonName.eevee, PokemonName.krabby, PokemonName.vulpix],
    threshold: 10,
  },
  '25moves': {
    type: 'moves',
    completed: false,
    pokemonName: [PokemonName.umbreon, PokemonName.kangaskhan, PokemonName.chikorita],
    threshold: 25,
  },
  '50moves': {
    type: 'moves',
    completed: false,
    pokemonName: [PokemonName.gengar, PokemonName.horsea, PokemonName.totodile],
    threshold: 50,
  },
  '100moves': {
    type: 'moves',
    completed: false,
    pokemonName: [PokemonName.dragonite, PokemonName.tangela, PokemonName.bonsly],
    threshold: 100,
  },
  '1000moves': {
    type: 'moves',
    completed: false,
    pokemonName: [PokemonName.mewtwo,  PokemonName.rattata],
    threshold: 1000,
  },
  '1conversationAreas': {
    type: 'conversationAreas',
    completed: false,
    pokemonName: [PokemonName.arcanine, PokemonName.goldeen],
    threshold: 1,
  },
  '3conversateionAreas': {
    type: 'conversationAreas',
    completed: false,
    pokemonName: [PokemonName.lucario, PokemonName.seaking, PokemonName.munchlax],
    threshold: 3,
  },
  '5conversationAreas': {
    type: 'conversationAreas',
    completed: false,
    pokemonName: [PokemonName.dialga, PokemonName.psyduck, PokemonName.diglett],
    threshold: 5,
  },
  '1chats': {
    type: 'chats',
    completed: false,
    pokemonName: [PokemonName.pikachu],
    threshold: 1,
  },
  '5chats': {
    type: 'chats',
    completed: false,
    pokemonName: [PokemonName.snorlax, PokemonName.togepi],
    threshold: 5,
  },
  '25chats': {
    type: 'chats',
    completed: false,
    pokemonName: [PokemonName.charizard, PokemonName.pichu],
    threshold: 25,
  },
  '100chats': {
    type: 'chats',
    completed: false,
    pokemonName: [PokemonName.palkia, PokemonName.octillery, PokemonName.marill],
    threshold: 100,
  },
  '10pokemonCaught': {
    type: 'pokemon',
    completed: false,
    pokemonName: [PokemonName.blastoise],
    threshold: 10,
  },
  '25pokemonCaught': {
    type: 'pokemon',
    completed: false,
    pokemonName: [PokemonName.ninetales, PokemonName.sandshrew],
    threshold: 25,
  },
  '50pokemonCaught': {
    type: 'pokemon',
    completed: false,
    pokemonName: [PokemonName.garchomp, PokemonName.vaporeon],
    threshold: 50,
  },
  '100pokemonCaught': {
    type: 'pokemon',
    completed: false,
    pokemonName: [PokemonName.lugia, PokemonName.sceptile, PokemonName.slowpoke], 
    threshold: 100,
  },
};

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useConversationAreas` hook.
 */
const Context = React.createContext<AchievementList>(DEFAULT_ACHIEVEMENT_LIST);

export default Context;
