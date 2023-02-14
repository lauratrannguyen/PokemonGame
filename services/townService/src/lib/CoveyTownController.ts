import { customAlphabet, nanoid } from 'nanoid';
import { BoundingBox, ServerConversationArea, ServerPokemon } from '../client/TownsServiceClient';
import { ChatMessage, PokemonLocation, UserLocation } from '../CoveyTypes';
import CoveyTownListener from '../types/CoveyTownListener';
import Player from '../types/Player';
import PlayerSession from '../types/PlayerSession';
import Pokemon from '../types/Pokemon';
import IVideoClient from './IVideoClient';
import TownAchievementManager from './TownAchievementManager';
import TwilioVideo from './TwilioVideo';

const friendlyNanoID = customAlphabet('1234567890ABCDEF', 8);

// how long a pokemon stays in the wild (seconds)
const PokemonLifespan = 20;

// a new pokemon is spawned every PokemonSpawnTickSpeed seconds
const PokemonSpawnTickSpeed = 2.5;

/**
 * The CoveyTownController implements the logic for each town: managing the various events that
 * can occur (e.g. joining a town, moving, leaving a town)
 */
export default class CoveyTownController {
  get capacity(): number {
    return this._capacity;
  }

  set isPubliclyListed(value: boolean) {
    this._isPubliclyListed = value;
  }

  get isPubliclyListed(): boolean {
    return this._isPubliclyListed;
  }

  get townUpdatePassword(): string {
    return this._townUpdatePassword;
  }

  get players(): Player[] {
    return this._players;
  }

  get pokemon(): Pokemon[] {
    return this._pokemon;
  }


  get occupancy(): number {
    return this._listeners.length;
  }

  get friendlyName(): string {
    return this._friendlyName;
  }

  set friendlyName(value: string) {
    this._friendlyName = value;
  }

  get coveyTownID(): string {
    return this._coveyTownID;
  }

  get conversationAreas(): ServerConversationArea[] {
    return this._conversationAreas;
  }

  get townAchievementManager(): TownAchievementManager {
    return this._townAchievementManager;
  }

  /** The list of players currently in the town * */
  private _players: Player[] = [];

  /** the list of pokemon currently in the town */
  private _pokemon: Pokemon[] = [];

  /** The list of valid sessions for this town * */
  private _sessions: PlayerSession[] = [];

  /** The videoClient that this CoveyTown will use to provision video resources * */
  private _videoClient: IVideoClient = TwilioVideo.getInstance();

  /** The list of CoveyTownListeners that are subscribed to events in this town * */
  private _listeners: CoveyTownListener[] = [];

  /** The list of currently active ConversationAreas in this town */
  private _conversationAreas: ServerConversationArea[] = [];

  private readonly _coveyTownID: string;

  private _friendlyName: string;

  private readonly _townUpdatePassword: string;

  private _isPubliclyListed: boolean;

  private _capacity: number;

  private _townAchievementManager: TownAchievementManager;

  constructor(friendlyName: string, isPubliclyListed: boolean) {
    this._coveyTownID = process.env.DEMO_TOWN_ID === friendlyName ? friendlyName : friendlyNanoID();
    this._capacity = 50;
    this._townUpdatePassword = nanoid(24);
    this._isPubliclyListed = isPubliclyListed;
    this._friendlyName = friendlyName;
    this._townAchievementManager = new TownAchievementManager();

    setInterval(() => this.spawnPokemon(), PokemonSpawnTickSpeed * 1000);
  }

  /**
   * spawn a new pokemon from the town achievement manager
   */
  public spawnPokemon(): void {

    const XMIN = [300, 300, 752, 1940, 659, 1010, 1547, 1998, 1581, 1581, 591, 330, 330, 1997, 2645, 2645, 3130];
    const XMAX = [649, 2383, 938, 2445, 981, 1513, 1862, 2352, 1750, 1770, 1591, 525, 525, 2378, 3298, 2736, 3209];
    const YMIN = [876, 1217, 432, 851, 867, 867, 867, 1076, 556, 276, 228, 243, 584, 257, 437, 571, 1089];
    const YMAX = [1070, 1283, 681, 916, 962, 1087, 962, 1100, 701, 414, 260, 384, 737, 673, 525, 952, 1250];

    const randInt = Math.floor(Math.random() * YMAX.length);

    const location: PokemonLocation = {
      x: Math.random() * (XMAX[randInt] - XMIN[randInt]) + XMIN[randInt],
      y: Math.random() * (YMAX[randInt] - YMIN[randInt]) + YMIN[randInt],
      isWild: true,
      direction: 'front',
    };

    const destructor = (id: string) => { // remove the pokemon
      const target = this._pokemon.find(p => p.id === id);

      if (target) {
        this._pokemon = this._pokemon.filter(p => p.id !== id);
        this._listeners.forEach(l => l.onPokemonRemoved(target));
      }
    };

    // TODO: add this as a listener to the pokemon in order to handle timeouts
    // TODO: specify a timeout duration for pokemon 
    //       (this can also be pushed up a level so that different species have different timeouts)
    this._townAchievementManager.spawnRandomPokemon(location, destructor, PokemonLifespan).then(pokemon => {
      this._pokemon.push(pokemon);
      // notify listeners
      this._listeners.forEach(l => l.onPokemonSpawned(pokemon));
    });
  }

  /**
   * Adds a player to this Covey Town, provisioning the necessary credentials for the
   * player, and returning them
   *
   * @param newPlayer The new player to add to the town
   */
  async addPlayer(newPlayer: Player): Promise<PlayerSession> {
    const theSession = new PlayerSession(newPlayer);

    this._sessions.push(theSession);
    this._players.push(newPlayer);

    // Create a video token for this user to join this town
    theSession.videoToken = await this._videoClient.getTokenForTown(
      this._coveyTownID,
      newPlayer.id,
    );

    // Notify other players that this player has joined
    this._listeners.forEach(listener => listener.onPlayerJoined(newPlayer));

    // Notify the achievement manager
    this._townAchievementManager.playerJoined();

    return theSession;
  }

  /**
   * Destroys all data related to a player in this town.
   *
   * @param session PlayerSession to destroy
   */
  destroySession(session: PlayerSession): void {
    this._players = this._players.filter(p => p.id !== session.player.id);
    this._sessions = this._sessions.filter(s => s.sessionToken !== session.sessionToken);
    this._listeners.forEach(listener => listener.onPlayerDisconnected(session.player));
    const conversation = session.player.activeConversationArea;
    if (conversation) {
      this.removePlayerFromConversationArea(session.player, conversation);
    }
  }

  /**
   * Updates the location of a player within the town
   * 
   * If the player has changed conversation areas, this method also updates the
   * corresponding ConversationArea objects tracked by the town controller, and dispatches
   * any onConversationUpdated events as appropriate
   * 
   * @param player Player to update location for
   * @param location New location for this player
   */
  updatePlayerLocation(player: Player, location: UserLocation): void {
    const conversation = this.conversationAreas.find(conv => conv.label === location.conversationLabel);
    const prevConversation = player.activeConversationArea;

    player.location = location;
    player.activeConversationArea = conversation;

    if (conversation !== prevConversation) {
      if (prevConversation) {
        this.removePlayerFromConversationArea(player, prevConversation);
      }
      if (conversation) {
        conversation.occupantsByID.push(player.id);
        this._listeners.forEach(listener => listener.onConversationAreaUpdated(conversation));
      }
    }

    this._listeners.forEach(listener => listener.onPlayerMoved(player));

    // Notify the achievement manager
    this._townAchievementManager.playerMoved();
  }

  /**
   * Removes a player from a conversation area, updating the conversation area's occupants list, 
   * and emitting the appropriate message (area updated or area destroyed)
   * 
   * Does not update the player's activeConversationArea property.
   * 
   * @param player Player to remove from conversation area
   * @param conversation Conversation area to remove player from
   */
  removePlayerFromConversationArea(player: Player, conversation: ServerConversationArea) : void {
    conversation.occupantsByID.splice(conversation.occupantsByID.findIndex(p=>p === player.id), 1);
    if (conversation.occupantsByID.length === 0) {
      this._conversationAreas.splice(this._conversationAreas.findIndex(conv => conv === conversation), 1);
      this._listeners.forEach(listener => listener.onConversationAreaDestroyed(conversation));
    } else {
      this._listeners.forEach(listener => listener.onConversationAreaUpdated(conversation));
    }
  }

  /**
   * Creates a new conversation area in this town if there is not currently an active
   * conversation with the same label.
   *
   * Adds any players who are in the region defined by the conversation area to it.
   *
   * Notifies any CoveyTownListeners that the conversation has been updated
   *
   * @param _conversationArea Information describing the conversation area to create. Ignores any
   *  occupantsById that are set on the conversation area that is passed to this method.
   *
   * @returns true if the conversation is successfully created, or false if not
   */
  addConversationArea(_conversationArea: ServerConversationArea): boolean {
    if (this._conversationAreas.find(
      eachExistingConversation => eachExistingConversation.label === _conversationArea.label,
    ))
      return false;
    if (_conversationArea.topic === ''){
      return false;
    }
    if (this._conversationAreas.find(eachExistingConversation => 
      CoveyTownController.boxesOverlap(eachExistingConversation.boundingBox, _conversationArea.boundingBox)) !== undefined){
      return false;
    }
    const newArea :ServerConversationArea = Object.assign(_conversationArea);
    this._conversationAreas.push(newArea);
    const playersInThisConversation = this.players.filter(player => player.isWithin(newArea));
    playersInThisConversation.forEach(player => {player.activeConversationArea = newArea;});
    newArea.occupantsByID = playersInThisConversation.map(player => player.id);
    this._listeners.forEach(listener => listener.onConversationAreaUpdated(newArea));

    // Notify the achievement manager
    this._townAchievementManager.conversationAreaUpdated();

    return true;
  }

  /**
   * Detects whether two bounding boxes overlap and share any points
   * 
   * @param box1 
   * @param box2 
   * @returns true if the boxes overlap, otherwise false
   */
  static boxesOverlap(box1: BoundingBox, box2: BoundingBox):boolean{
    // Helper function to extract the top left (x1,y1) and bottom right corner (x2,y2) of each bounding box
    const toRectPoints = (box: BoundingBox) => ({ x1: box.x - box.width / 2, x2: box.x + box.width / 2, y1: box.y - box.height / 2, y2: box.y + box.height / 2 });
    const rect1 = toRectPoints(box1);
    const rect2 = toRectPoints(box2);
    const noOverlap = rect1.x1 >= rect2.x2 || rect2.x1 >= rect1.x2 || rect1.y1 >= rect2.y2 || rect2.y1 >= rect1.y2;
    return !noOverlap;
  }

  /**
   * Subscribe to events from this town. Callers should make sure to
   * unsubscribe when they no longer want those events by calling removeTownListener
   *
   * @param listener New listener
   */
  addTownListener(listener: CoveyTownListener): void {
    this._listeners.push(listener);
  }

  /**
   * Unsubscribe from events in this town.
   *
   * @param listener The listener to unsubscribe, must be a listener that was registered
   * with addTownListener, or otherwise will be a no-op
   */
  removeTownListener(listener: CoveyTownListener): void {
    this._listeners = this._listeners.filter(v => v !== listener);
  }

  onChatMessage(message: ChatMessage): void {
    this._listeners.forEach(listener => listener.onChatMessage(message));

    // Notify the achievement manager
    this._townAchievementManager.chatMessageSent();
  }

  /**
   * Fetch a player's session based on the provided session token. Returns undefined if the
   * session token is not valid.
   *
   * @param token
   */
  getSessionByToken(token: string): PlayerSession | undefined {
    return this._sessions.find(p => p.sessionToken === token);
  }

  disconnectAllPlayers(): void {
    this._listeners.forEach(listener => listener.onTownDestroyed());
  }

  onPokemonCaught(pokemon: ServerPokemon, userID: string): void {
    const caughtPokemonList = this.pokemon.filter(p => p.id === pokemon._id);

    if (caughtPokemonList.length > 0) {
      const caughtPokemon = caughtPokemonList[0];
      caughtPokemon.location.isWild = false;
      this._listeners.forEach(listener => caughtPokemonList.forEach(p => listener.onPokemonRemoved(p)));

      const player = this._players.find(p => p.id === userID);

      if (player) {
        player.addPokemon(caughtPokemon);
        this._listeners.forEach(listener => listener.onPlayerUpdatePokemon(player));
        this._townAchievementManager.pokemonCaught();
      }
    }
  }

}
