import { Socket } from 'socket.io-client';
import { TrainerName, UserLocation } from './classes/Player';
import { PokemonName, ServerPokemon } from './classes/Pokemon';
import TownsServiceClient from './classes/TownsServiceClient';

export type CoveyEvent = 'playerMoved' | 'playerAdded' | 'playerRemoved';

export type VideoRoom = {
  twilioID: string,
  id: string
};
export type UserProfile = {
  displayName: string,
  id: string
};
export type CoveyAppState = {
  sessionToken: string,
  userName: string,
  currentTownFriendlyName: string,
  currentTownID: string,
  currentTownIsPubliclyListed: boolean,
  myPlayerID: string,
  myTrainerName: TrainerName,
  emitMovement: (location: UserLocation) => void,
  emitCatch: (pokemon: ServerPokemon, userID: string) => void,
  socket: Socket | null,
  apiClient: TownsServiceClient
};


export type AchievementType = 'players' | 'moves' | 'conversationAreas' | 'chats' | 'pokemon';


export type Achievement = {
  type: AchievementType,
  completed: boolean,
  pokemonName: PokemonName[],
  threshold: number,
};


type AchievementKey = '2players' | '5players' | '10players' | '25players' | '50players'
| '10moves' | '25moves' | '50moves' | '100moves' | '1000moves'
| '1conversationAreas' | '3conversateionAreas' | '5conversationAreas'
| '1chats' | '5chats' | '25chats' | '100chats' | '10pokemonCaught' | '25pokemonCaught' 
| '50pokemonCaught' | '100pokemonCaught';


export type AchievementList = { [key in AchievementKey] : Achievement };

export type FormattedAchievementList = { [key in AchievementType] : Achievement | undefined };

export type AchievementTypeCount = { [key in AchievementType] : number };
