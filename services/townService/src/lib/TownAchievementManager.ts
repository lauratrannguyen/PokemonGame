import { AchievementKey, DEFAULT_POKEMON, PokemonLocation, PokemonName, POKEMON_SPAWN_RATES } from '../CoveyTypes';
import Pokemon from '../types/Pokemon';
import PokemonFactory from './PokemonFactory';


// types for tracking achievements
type AchievementType = 'players' | 'moves' | 'conversationAreas' | 'chats' | 'pokemon';

// each achievemnt needs a type, completion status, and associated pokemon name
// fn is a function that returns true if the given number n means that the achievement is completed
// for example, if the achievement requires 10 of something, fn(10) => True, and fn(9) => False
type Achievement = {
  type: AchievementType,
  completed: boolean,
  pokemonName: PokemonName[],
  threshold: number,
};

export type AchievementList = { [key in AchievementKey] : Achievement };

export type AchievementTypeCount = { [key in AchievementType] : number };

/**
 * A TownAchievementManager subscribes to a town and tracks the completion of achievements.
 * It also spawns pokemon based on completed achievements.
 */
export default class TownAchievementManager {
  private achievements: AchievementList;

  // keep track of the occurences of each event type
  private counts: AchievementTypeCount = {
    players: 0,
    moves: 0,
    conversationAreas: 0,
    chats: 0,
    pokemon: 0,
  };

  private updateAchievementList?: (achievementList: AchievementList) => void;

  private updateAchievementCounts?: (achievementCounts: AchievementTypeCount) => void;

  constructor(achievementList: AchievementList = TownAchievementManager.defaultAchievementList()) {
    this.achievements = achievementList;
  }

  public setSocketEmitters(list: (achievementList: AchievementList) => void, count: (achievementCounts: AchievementTypeCount) => void): void {
    this.updateAchievementList = list;
    this.updateAchievementList(this.achievements);
    this.updateAchievementCounts = count;
    this.updateAchievementCounts(this.counts);
  }

  /**
   * Spawn a random pokemon from the completed achievements
   * @param location 
   * @param listeners 
   * @param lifespan 
   * @returns 
   */
  public async spawnRandomPokemon(location: PokemonLocation, destructor: (id: string) => void, lifespan: number): Promise<Pokemon> {
    const factory = PokemonFactory.getInstance();

    // get the pokemon that have been unlocked
    const unlockedPokemon: PokemonName[] = Object.entries(this.achievements).reduce((filtered, [, achievement]) => {
      if (achievement.completed) {
        achievement.pokemonName.forEach(pokemon => filtered.push(pokemon));
      }
      return filtered;
    }, Array<PokemonName>());

    // add in pokemon that always appear (not unlocked by achievements)
    DEFAULT_POKEMON.forEach(name => unlockedPokemon.push(name));

    // create an array with many entries for common pokemon and few entries for rare pokemon
    const weightedArray: PokemonName[] = [];
    let i: number;
    unlockedPokemon.forEach(name => {
      for (i = 0; i < POKEMON_SPAWN_RATES[name]; i += 1) weightedArray.push(name);
    });
    // pick a random pokemon from the weighted array
    const randomPokemon: PokemonName = weightedArray[Math.floor(Math.random() * weightedArray.length)];

    // spawn pokemon!
    const pokemon = await factory.spawnPokemon(randomPokemon, location, destructor, lifespan);
    return pokemon;
  }

  // Go through the achievements list and check if they are completed by using the assigned fn
  private updateAchievements(): void {
    let emit = false;
    Object.values(this.achievements).forEach(achievement => {
      if (!achievement.completed) {
        const completed = this.counts[achievement.type] >= achievement.threshold;
        if (completed && !achievement.completed) {
          emit = true;
        }
        achievement.completed = completed;
      }
    });

    if (this.updateAchievementList && emit) {
      this.updateAchievementList(this.achievements);
    }

    if (this.updateAchievementCounts) {
      this.updateAchievementCounts(this.counts);
    }
  }

  /**
   * CoveyTownController notifies a new player joined
   */
  playerJoined(): void {
    this.counts.players += 1;
    this.updateAchievements();
  }

  /**
   * CoveyTownController notifies a player moved
   */
  playerMoved(): void {
    this.counts.moves += 1;
    this.updateAchievements();
  }

  /**
   * CoveyTownController notifies a conversation area was modified
   */
  conversationAreaUpdated(): void {
    this.counts.conversationAreas += 1;
    this.updateAchievements();
  }

  /**
   * CoveyTownController notifies a chat message was sent
   */
  chatMessageSent(): void {
    this.counts.chats += 1;
    this.updateAchievements();
  }

  /** 
   * CoveyTownController notifies a pokemon was caught
  */
  pokemonCaught(): void {
    this.counts.pokemon += 1;
    this.updateAchievements();
  }



  // the default achievement list, modify this list to modify the standard list of achievements for towns
  private static defaultAchievementList(): AchievementList {
    return {
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
        threshold: 500,
      },
      '25moves': {
        type: 'moves',
        completed: false,
        pokemonName: [PokemonName.umbreon, PokemonName.kangaskhan, PokemonName.chikorita],
        threshold: 2500,
      },
      '50moves': {
        type: 'moves',
        completed: false,
        pokemonName: [PokemonName.gengar, PokemonName.horsea, PokemonName.totodile],
        threshold: 5000,
      },
      '100moves': {
        type: 'moves',
        completed: false,
        pokemonName: [PokemonName.dragonite, PokemonName.tangela, PokemonName.bonsly],
        threshold: 10000,
      },
      '1000moves': {
        type: 'moves',
        completed: false,
        pokemonName: [PokemonName.mewtwo,  PokemonName.rattata],
        threshold: 100000,
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
  }
}