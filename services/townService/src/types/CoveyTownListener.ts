import { ServerConversationArea } from '../client/TownsServiceClient';
import { ChatMessage } from '../CoveyTypes';
import Player from './Player';
import Pokemon from './Pokemon';

/**
 * A listener for player-related events in each town
 */
export default interface CoveyTownListener {
  /**
   * Called when a player joins a town
   * @param newPlayer the new player
   */
  onPlayerJoined(newPlayer: Player): void;

  /**
   * Called when a player's location changes
   * @param movedPlayer the player that moved
   */
  onPlayerMoved(movedPlayer: Player): void;

  /**
   * Called when a player disconnects from the town
   * @param removedPlayer the player that disconnected
   */
  onPlayerDisconnected(removedPlayer: Player): void;

  /**
   * Called when a town is destroyed, causing all players to disconnect
   */
  onTownDestroyed(): void;

  /**
   * Called when a conversation area is created or updated
   * @param conversationArea the conversation area that is updated or created
   */
  onConversationAreaUpdated(conversationArea: ServerConversationArea) : void;

  /**
   * Called when a conversation area is destroyed
   * @param conversationArea the conversation area that has been destroyed
   */
  onConversationAreaDestroyed(conversationArea: ServerConversationArea): void;

  /**
   * Called when a chat message is received from a user
   * @param message the new chat message
   */
  onChatMessage(message: ChatMessage): void;

  /**
   * Called when a new pokemon is added to the town
   * @param newPokemon the new pokemon
   */
  onPokemonSpawned(newPokemon: Pokemon): void;

  /**
   * Called when a pokemon times out
   * @param removedPokemon the pokemon that timed out
   */
  onPokemonRemoved(removedPokemon: Pokemon): void;

  /**
   * called when a player modifies their pokemon list
   * @param player the updated player
   */
  onPlayerUpdatePokemon(player: Player): void;
}
