import { nanoid } from 'nanoid';
import { ServerConversationArea } from '../client/TownsServiceClient';
import { TrainerName, UserLocation } from '../CoveyTypes';
import Pokemon from './Pokemon';

/**
 * Each user who is connected to a town is represented by a Player object
 */
export default class Player {
  /** The current location of this user in the world map * */
  public location: UserLocation;

  /** The unique identifier for this player * */
  private readonly _id: string;

  /** The player's username, which is not guaranteed to be unique within the town * */
  private readonly _userName: string;

  /** The current ConversationArea that the player is in, or undefined if they are not located within one */
  private _activeConversationArea?: ServerConversationArea;

  /** The list of pokemon this player has caught, index 0 is currently selected */
  public pokemon: Pokemon[];

  public trainerName: TrainerName;

  constructor(userName: string, trainerName: TrainerName = TrainerName.lucas, pokemon: Pokemon[] = []) {
    this.location = {
      x: 0,
      y: 0,
      moving: false,
      rotation: 'front',
    };
    this._userName = userName;
    this._id = nanoid();
    this.pokemon = pokemon;
    this.trainerName = trainerName;
  }

  get userName(): string {
    return this._userName;
  }

  get id(): string {
    return this._id;
  }

  get activeConversationArea(): ServerConversationArea | undefined {
    return this._activeConversationArea;
  }

  set activeConversationArea(conversationArea: ServerConversationArea | undefined) {
    this._activeConversationArea = conversationArea;
  }

  /**
   * Checks to see if a player's location is within the specified conversation area
   * 
   * This method is resilient to floating point errors that could arise if any of the coordinates of
   * `this.location` are dramatically smaller than those of the conversation area's bounding box.
   * @param conversation 
   * @returns 
   */
  isWithin(conversation: ServerConversationArea) : boolean {
    return (
      this.location.x > conversation.boundingBox.x - conversation.boundingBox.width / 2 &&
      this.location.x < conversation.boundingBox.x + conversation.boundingBox.width / 2 &&
      this.location.y > conversation.boundingBox.y - conversation.boundingBox.height / 2 &&
      this.location.y < conversation.boundingBox.y + conversation.boundingBox.height / 2
    );
  }


  /**
   * helper function for when a player catches a pokemon
   * @param pokemon this may need to be a new type ServerPokemon like the method above
   */
  public addPokemon(pokemon: Pokemon) : void {
    this.pokemon.unshift(pokemon);
  }

  /**
   * Helper function to remove a pokemon from a player
   * @param pokemon this may need to be a new type ServerPokemon like the method above
   */
  public removePokemon(pokemon: Pokemon) : void {
    this.pokemon = this.pokemon.filter(p => p.id !== pokemon.id);
  }

  /**
   * Move a pokemon to index 0 (selected pokemon is at index 0)
   * @param pokemonID the id of the pokemon to select
   */
  public selectPokemon(pokemonID: string) : void {
    const targetPokemon = this.pokemon.find(p => p.id === pokemonID);

    if (targetPokemon !== undefined) {
      this.removePokemon(targetPokemon);
      this.pokemon.unshift(targetPokemon);
    }
  }
}
