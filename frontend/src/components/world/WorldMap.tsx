import Phaser from 'phaser';
import React, { useEffect, useMemo, useState } from 'react';
import BoundingBox from '../../classes/BoundingBox';
import ConversationArea from '../../classes/ConversationArea';
import Player, { ServerPlayer, UserLocation, TrainerName } from '../../classes/Player';
import Pokemon, { ServerPokemon, PokemonName } from '../../classes/Pokemon';
import Video from '../../classes/Video/Video';
import useConversationAreas from '../../hooks/useConversationAreas';
import useCoveyAppState from '../../hooks/useCoveyAppState';
import usePlayerMovement from '../../hooks/usePlayerMovement';
import usePlayersInTown from '../../hooks/usePlayersInTown';
import usePokemonInTown from '../../hooks/usePokemonInTown';
import AchievementList from '../AchievementList';
import { Callback } from '../VideoCall/VideoFrontend/types';
import NewConversationModal from './NewCoversationModal';

// Original inspiration and code from:
// https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6

type ConversationGameObjects = {
  labelText: Phaser.GameObjects.Text;
  topicText: Phaser.GameObjects.Text;
  sprite: Phaser.GameObjects.Sprite;
  label: string;
  conversationArea?: ConversationArea;
};

type PokemonKeys = keyof typeof PokemonName;
type PokemonGroup = { [key in PokemonKeys]? : Phaser.GameObjects.Group };

const directions = ['front', 'back', 'left', 'right'];
const followDistance = 17;

type PokemonState = 'unknown' | 'seen' | 'caught';
type PokedexEntry = {
  pokemonSprite?: Phaser.GameObjects.Sprite,
  label?: Phaser.GameObjects.Text,
  state: PokemonState,
}
type Pokedex = { [key in PokemonKeys] : PokedexEntry };

const pokemonNames = Object.values(PokemonName).sort((a, b) => (a.localeCompare(b, 'en')));
// The number of pokedex rows to display
const POKEDEX_SIZE = 10

class CoveyGameScene extends Phaser.Scene {
  private player?: {
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    label: Phaser.GameObjects.Text;
  };

  private pokedex: {
    pokedex: Pokedex,
    container?: Phaser.GameObjects.Container,
    labels: Phaser.GameObjects.Text[],
    labelBgs: Phaser.GameObjects.Sprite[],
    labelCovers: Phaser.GameObjects.Sprite[],
    labelBalls: Phaser.GameObjects.Sprite[],
    pokemonBg?: Phaser.GameObjects.Sprite,
    pokemonBgUnknown?: Phaser.GameObjects.Sprite,
    scrollOffset: integer,
    previouslySelectedPokemon?: PokemonName,
  }

  private myPlayerID: string;

  private myTrainerName: TrainerName;

  private players: Player[] = [];

  private pokemon: Pokemon[] = [];

  private conversationAreas: ConversationGameObjects[] = [];

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys[] = [];

  /*
   * A "captured" key doesn't send events to the browser - they are trapped by Phaser
   * When pausing the game, we uncapture all keys, and when resuming, we re-capture them.
   * This is the list of keys that are currently captured by Phaser.
   */
  private previouslyCapturedKeys: number[] = [];

  private lastLocation?: UserLocation;

  private previousLocations: UserLocation[];

  private ready = false;

  private paused = false;

  private video: Video;

  private emitMovement: (loc: UserLocation) => void;

  private emitCatch: (pokemon: ServerPokemon, userID: string) => void;

  private currentConversationArea?: ConversationGameObjects;

  private infoTextBox?: Phaser.GameObjects.Text;

  private setNewConversation: (conv: ConversationArea) => void;

  private _onGameReadyListeners: Callback[] = [];

  private pokemonGroups: PokemonGroup = {};

  private helpLabel?: Phaser.GameObjects.Text;

  constructor(
    video: Video,
    emitMovement: (loc: UserLocation) => void,
    emitCatch: (pokemon: ServerPokemon, userID: string) => void,
    setNewConversation: (conv: ConversationArea) => void,
    myPlayerID: string,
    myTrainerName: TrainerName,
  ) {
    super('PlayGame');
    this.video = video;
    this.emitMovement = emitMovement;
    this.emitCatch = emitCatch;
    this.myPlayerID = myPlayerID;
    this.setNewConversation = setNewConversation;
    this.previousLocations = [];
    this.myTrainerName = myTrainerName;

    const emptyDex : { [key in PokemonKeys]? : PokedexEntry } = {};
    pokemonNames.forEach(name => {
      emptyDex[name] = {
        state: 'unknown',
      }
    });

    this.pokedex = {
      pokedex: emptyDex as Pokedex,
      container: undefined,
      labels: [],
      labelBgs: [],
      labelCovers: [],
      labelBalls: [],
      pokemonBg: undefined,
      pokemonBgUnknown: undefined, 
      scrollOffset: 0,
    };
  }

  pokedexAddCaught(name: PokemonName) : boolean {
    if (this.pokedex.pokedex[name].state === 'caught') {
      return false;
    }

    this.pokedex.pokedex[name].state = 'caught';
    this.updatePokedex();
    return true;
  }

  pokedexAddSeen(name: PokemonName) {
    if (this.pokedex.pokedex[name].state === 'unknown') {
      this.pokedex.pokedex[name].state = 'seen';
      this.updatePokedex();
    }
  }

  isPokemonCaught(name: PokemonName) : boolean {
    if (this.pokedex.pokedex[name].state === 'caught' ) {
      return true;
    }
    return false;
  }
  

  isVisible(x: number, y: number): boolean {
    const camera = this.cameras.main;
    const halfWidth = camera.displayWidth / 2;
    const halfHeight = camera.displayHeight / 2;
    let leftBound = 0;
    let rightBound = 0;
    let upperBound = 0;
    let lowerBound = 0;
    if (this.lastLocation) {
      leftBound = this.lastLocation.x - halfWidth;
      rightBound = this.lastLocation.x + halfWidth;
      upperBound = this.lastLocation.y - halfHeight;
      lowerBound = this.lastLocation.y + halfHeight;
    } else {
      return false;
    }

    return (x > leftBound) && (x < rightBound) && (y > upperBound) && (y < lowerBound);
  }

  preload() {
    // this.load.image("logo", logoImg);
    this.load.image('Room_Builder_32x32', '/assets/tilesets/Room_Builder_32x32.png');
    this.load.image('22_Museum_32x32', '/assets/tilesets/22_Museum_32x32.png');
    this.load.image(
      '5_Classroom_and_library_32x32',
      '/assets/tilesets/5_Classroom_and_library_32x32.png',
    );
    this.load.image('12_Kitchen_32x32', '/assets/tilesets/12_Kitchen_32x32.png');
    this.load.image('1_Generic_32x32', '/assets/tilesets/1_Generic_32x32.png');
    this.load.image('13_Conference_Hall_32x32', '/assets/tilesets/13_Conference_Hall_32x32.png');
    this.load.image('14_Basement_32x32', '/assets/tilesets/14_Basement_32x32.png');
    this.load.image('16_Grocery_store_32x32', '/assets/tilesets/16_Grocery_store_32x32.png');
    this.load.tilemapTiledJSON('map', '/assets/tilemaps/indoors.json');
    this.load.atlas('atlas', '/assets/atlas/atlas.png', '/assets/atlas/atlas.json');

    // load pokedex assets
    this.load.image('ball', '/assets/pokedex/ball.png');
    this.load.image('ballgrey', '/assets/pokedex/ballgrey.png');
    this.load.image('label', '/assets/pokedex/label.png');
    this.load.image('labelcover', '/assets/pokedex/labelcover.png');
    this.load.image('pokemonbg', '/assets/pokedex/pokemonbg.png');
    this.load.image('pokemonbgunknown', '/assets/pokedex/pokemonbgunknown.png');

    Object.values(TrainerName).forEach(trainer => {
      directions.forEach(dStr => {
        this.load.image(`${trainer}-${dStr}`, `/assets/avatars/${trainer}/${trainer}-${dStr}.png`);
        this.load.image(`${trainer}-${dStr}-walk-1`, `/assets/avatars/${trainer}/${trainer}-${dStr}-walk-1.png`);
        this.load.image(`${trainer}-${dStr}-walk-2`, `/assets/avatars/${trainer}/${trainer}-${dStr}-walk-2.png`);
      });
    });

    pokemonNames.forEach(pokemon => {
      this.load.image(pokemon, `/assets/pokemon/${pokemon}.png`);
    });

    pokemonNames.forEach(pokemon => {
      this.load.image(`${pokemon}_back`, `/assets/backPokemon/${pokemon}_back.png`);
    });

    // SERVER ERROR 429 FIX, loading too many assets too fast
    // We need to switch to sprite sheets...

    const start = new Date().getTime();
    while (new Date().getTime() < start + 1000);

    for (let i = 1; i<7; i += 1) {
      pokemonNames.forEach(pokemon => {
        this.load.image(`${pokemon}-${i}`, `/assets/pokemonGif/${pokemon}-${i}.png`);
      });
    }
  }

  /**
   * Update the WorldMap's view of the current conversation areas, updating their topics and
   * participants, as necessary
   *
   * @param conversationAreas
   * @returns
   */
  updateConversationAreas(conversationAreas: ConversationArea[]) {
    if (!this.ready) {
      /*
       * Due to the asynchronous nature of setting up a Phaser game scene (it requires gathering
       * some resources using asynchronous operations), it is possible that this could be called
       * in the period between when the player logs in and when the game is ready. Hence, we
       * register a callback to complete the initialization once the game is ready
       */
      this._onGameReadyListeners.push(() => {
        this.updateConversationAreas(conversationAreas);
      });
      return;
    }
    conversationAreas.forEach(eachNewArea => {
      const existingArea = this.conversationAreas.find(area => area.label === eachNewArea.label);
      // TODO - if it becomes necessary to support new conversation areas (dynamically created), need to create sprites here to enable rendering on phaser
      // assert(existingArea);
      if (existingArea) {
        // assert(!existingArea.conversationArea);
        existingArea.conversationArea = eachNewArea;
        const updateListener = {
          onTopicChange: (newTopic: string | undefined) => {
            if (newTopic) {
              existingArea.topicText.text = newTopic;
            } else {
              existingArea.topicText.text = '(No topic)';
            }
          },
        };
        eachNewArea.addListener(updateListener);
        updateListener.onTopicChange(eachNewArea.topic);
      }
    });
    this.conversationAreas.forEach(eachArea => {
      const serverArea = conversationAreas?.find(a => a.label === eachArea.label);
      if (!serverArea) {
        eachArea.conversationArea = undefined;
      }
    });
  }

  updatePlayersLocations(players: Player[]) {
    if (!this.ready) {
      this.players = players;
      return;
    }
    players.forEach(p => {
      this.updatePlayerLocation(p);
    });
    // Remove disconnected players from board
    const disconnectedPlayers = this.players.filter(
      player => !players.find(p => p.id === player.id),
    );
    disconnectedPlayers.forEach(disconnectedPlayer => {
      if (disconnectedPlayer.sprite) {
        disconnectedPlayer.sprite.destroy();
        disconnectedPlayer.label?.destroy();
      }
      disconnectedPlayer.pokemon.forEach(p => {
        p.sprite?.destroy();
        p.label?.destroy();
      });
    });
    // Remove disconnected players from list
    if (disconnectedPlayers.length) {
      this.players = this.players.filter(
        player => !disconnectedPlayers.find(p => p.id === player.id),
      );
    }
  }

  updatePlayerLocation(player: Player) {
    let myPlayer = this.players.find(p => p.id === player.id);
    let moved = false;
    if (!myPlayer) {
      let { location } = player;
      if (!location) {
        location = {
          rotation: 'back',
          moving: false,
          x: 0,
          y: 0,
        };
      }
      myPlayer = new Player(player.id, player.userName, location, player.pokemon, player.trainerName);
      this.players.push(myPlayer);
    }
    if (this.myPlayerID !== myPlayer.id && this.physics && player.location) {
      let { sprite } = myPlayer;
      if (!sprite) {
        sprite = this.physics.add
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - JB todo
          .sprite(0, 0, `${player.trainerName}-front`)
          .setScale(2)
          .setOffset(0, 0);
        const label = this.add.text(0, 0, myPlayer.userName, {
          font: '18px monospace',
          color: '#000000',
          backgroundColor: '#ffffff',
        });
        myPlayer.label = label;
        myPlayer.sprite = sprite;
      }
      if (!sprite.anims) return;
      sprite.setX(player.location.x);
      sprite.setY(player.location.y);
      myPlayer.label?.setX(player.location.x - 20);
      myPlayer.label?.setY(player.location.y - 45);
      if (player.location.moving) {
        sprite.anims.play(`${player.trainerName}-${player.location.rotation}-walk`, true);
      } else {
        sprite.anims.stop();
        sprite.setTexture(`${player.trainerName}-${player.location.rotation}`);
      }

      const previousLocation = myPlayer.previousLocations.length ? myPlayer.previousLocations[myPlayer.previousLocations.length - 1] : player.location;
      moved = (previousLocation.x !== player.location.x) || (previousLocation.y !== player.location.y);

      myPlayer.previousLocations.push({
        x: player.location.x,
        y: player.location.y,
        rotation: player.location.rotation,
        moving: player.location.moving,
      });

      const combinedList: Pokemon[] = [];
      // ServerPlayer input does not have sprites, use the old list to maintain sprites
      player.pokemon.forEach(newP => {
        const oldP = myPlayer?.pokemon.find(p => p._id === newP._id);
        if (oldP) {
          combinedList.push(oldP);
          oldP.sprite?.setVisible(false);
        } else {
          combinedList.push(newP);
        }
      });

      myPlayer.pokemon = combinedList;

      if (myPlayer.pokemon.length) {
        const selectedPokemon = myPlayer.pokemon[0];
        let pokemonSprite = selectedPokemon.sprite;
        const { name } = selectedPokemon.species;

        if (!pokemonSprite || pokemonSprite.displayList === null) {
          pokemonSprite = this.pokemonGroups[name]?.get(selectedPokemon.location.x, selectedPokemon.location.y, name);
          
          if (pokemonSprite) {
            pokemonSprite.setActive(true);
            selectedPokemon.sprite = pokemonSprite;
          }
        }
        
        let location: UserLocation | undefined;

        if (myPlayer.previousLocations.length > followDistance) {
          location = myPlayer.previousLocations.shift();
        } else {
          [location] = myPlayer.previousLocations;
        }

        const playAnim = () => {
          if (myPlayer && pokemonSprite) {
            if (moved) {
              if (!pokemonSprite.anims.isPlaying) {
                pokemonSprite.anims.play({key: `${name}_anim`, repeat: 1,}, true);
              }
            } else {
              pokemonSprite.anims.stop();
              pokemonSprite.setTexture(name);
            }
          }
        }

        if (pokemonSprite && location) {
          pokemonSprite.setVisible(true);
          switch (location.rotation) {
            case 'left':
              pokemonSprite.setFlipX(false);
              playAnim();
              break;
            case 'right':
              pokemonSprite.setFlipX(true);
              playAnim();
              break;
            case 'front':
              playAnim();
              break;
            case 'back':
              pokemonSprite.setTexture(`${name}_back`);
              pokemonSprite.anims.stop();
              break;
            default:
              break;
          }

          pokemonSprite.setX((location.x));
          pokemonSprite.setY((location.y));

          if (this.isVisible(pokemonSprite.x, pokemonSprite.y) && pokemonSprite.visible) {
            this.pokedexAddSeen(name);
          }
        }
      } else if (myPlayer.previousLocations.length > followDistance) {
        myPlayer.previousLocations.shift();
      }
    }
  }

  updatePokemonLocations(pokemon: Pokemon[]) {
    if (!this.ready) {
      this.pokemon = pokemon;
      return;
    }

    pokemon.forEach(p => {
      this.updatePokemonLocation(p);
    });

    // Remove pokemon from the board
    const removedPokemon = this.pokemon.filter(
      checkForPokemon => !pokemon.find(p => p._id === checkForPokemon._id),
    );
    removedPokemon.forEach(p => {
      if (p.sprite) {
        this.pokemonGroups[p.species.name]?.killAndHide(p.sprite);
        p.label?.destroy();
      }
    });

    // Remove removed pokemon from list
    if (removedPokemon.length) {
      this.pokemon = this.pokemon.filter(
        targetPokemon => !removedPokemon.find(p => p._id === targetPokemon._id),
      );
    }
  }

  updatePokemonLocation(pokemon: Pokemon) {
    let myPokemon = this.pokemon.find(p => p._id === pokemon._id);
    if (!myPokemon) {
      let { location } = pokemon;
      if (!location) {
        location = {
          x: 0,
          y: 0,
          isWild: true,
        };
      }
      myPokemon = new Pokemon(pokemon._id, pokemon.species, location);
      this.pokemon.push(myPokemon);
    }

    if (pokemon.location && this.physics) {
      let { sprite } = myPokemon;
      if (!sprite) {
        const { name } = myPokemon.species;

        sprite = this.pokemonGroups[name]?.get(pokemon.location.x, pokemon.location.y, name);
        if (sprite) {
          this.sys.displayList.add(sprite);
          
          sprite.setVisible(true);
          sprite.setActive(true);
          myPokemon.sprite = sprite;
        }
      }
    }
  }

  updatePokedex(): void {
    const totalPokemon = pokemonNames.length
    let selectedIdx = 0;
    let startIdx = 0;

    if (this.pokedex.scrollOffset < 2) {
      selectedIdx = this.pokedex.scrollOffset;
      startIdx = 0
    } else if (this.pokedex.scrollOffset + 1 >= (totalPokemon - (POKEDEX_SIZE - 3))) {
      selectedIdx = POKEDEX_SIZE - (totalPokemon - this.pokedex.scrollOffset);
      startIdx = totalPokemon - POKEDEX_SIZE
    } else {
      selectedIdx = 2
      startIdx = this.pokedex.scrollOffset - 2
    }

    const visiblePokemon = pokemonNames.slice(startIdx, startIdx + POKEDEX_SIZE);

    visiblePokemon.forEach((name, i) => {
      const { state } = this.pokedex.pokedex[name];

      if (i === selectedIdx) {
        this.pokedex.labelBgs[i].setTintFill();
        this.pokedex.pokedex[name].pokemonSprite?.setVisible(true);
        this.pokedex.pokemonBgUnknown?.setVisible(state === 'unknown');
        this.pokedex.previouslySelectedPokemon = name;
      } else {
        this.pokedex.labelBgs[i].clearTint();
        this.pokedex.pokedex[name].pokemonSprite?.setVisible(false);
      }

      const num = (`00${i + startIdx + 1}`).slice(-3);

      switch(state) {
        case 'caught':
          this.pokedex.labels[i].text = `${num}\t${name.charAt(0).toUpperCase() + name.slice(1)}`;
          this.pokedex.labelBalls[i].setTexture('ball');
          this.pokedex.labelBalls[i].setVisible(true);
          this.pokedex.pokedex[name].pokemonSprite?.clearTint();
          break;
        case 'seen':
          this.pokedex.labels[i].text = `${num}\t${name.charAt(0).toUpperCase() + name.slice(1)}`;
          this.pokedex.labelBalls[i].setVisible(false);
          this.pokedex.labelBalls[i].setTexture('ballgrey');
          this.pokedex.labelBalls[i].setVisible(true);
          break;
        case 'unknown':
          this.pokedex.labels[i].text = `${num}\t-----`;
          this.pokedex.labelBalls[i].setVisible(false);
          break;
        default:
          break;
      }
    });
  }

  nearestPokemon(): Pokemon | undefined {
    const withinRadius = this.pokemon.filter(p => this.isWithinCatchRadius(p));

    withinRadius.sort((p1, p2) => {
      if (p1.location && p2.location && this.lastLocation) {
        const dx1 = p1.location.x - this.lastLocation.x;
        const dy1 = p1.location.y - this.lastLocation.y;
        const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

        const dx2 = p2.location.x - this.lastLocation.x;
        const dy2 = p2.location.y - this.lastLocation.y;
        const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        return d1 - d2;
      }

      return 0;
    });

    return withinRadius.pop();
  }


  /**
   * Enter was pressed, catch the nearset pokemon within radius
   */
  enterPressed(): void {
    const nearbyPokemon = this.nearestPokemon();
    if (nearbyPokemon ) {
      this.emitCatch({
        species: nearbyPokemon.species,
        location: nearbyPokemon.location,
        _id: nearbyPokemon._id,
      }, this.myPlayerID);
    }
  }

  togglePokedex(): void {
    if (this.pokedex.container) {
      this.pokedex.container.setVisible(!this.pokedex.container.visible);
      this.pokedex.container.setActive(!this.pokedex.container.active);
    }
  }

  toggleHelp(): void {
    if (this.helpLabel) {
      this.helpLabel.setVisible(!this.helpLabel.visible);
    }
  }

  scrollPokedexUp(): void {
    this.pokedex.scrollOffset = Math.max(0, this.pokedex.scrollOffset - 1);
    this.updatePokedex();
  }

  scrollPokedexDown(): void {
    this.pokedex.scrollOffset = Math.min(pokemonNames.length - 1, this.pokedex.scrollOffset + 1);
    this.updatePokedex();
  }

  switchPokemonPet(): void {
    const target = this.pokedex.previouslySelectedPokemon;
    if (this.pokedex.container?.visible && target) {
      if (this.pokedex.pokedex[target].state === 'caught') {
        const myPlayer = this.players.find(p => p.id === this.myPlayerID);
        
        if (myPlayer) {
          const newPokemon = myPlayer.pokemon.find(p => p.species.name === target);
          if (newPokemon) {
            myPlayer.pokemon[0].sprite?.setVisible(false);
            myPlayer.pokemon[0].sprite?.setActive(false);
            myPlayer.pokemon = myPlayer.pokemon.filter(p => p._id !== newPokemon._id);
            myPlayer.pokemon.unshift(newPokemon);
            this.update();
          }
        }
      }
    }
  }


  /**
   * is a pokemon close enough to this.player to catch?
   * @param p the pokemon
   * @returns is the pokemon within the catch radius
   */
  isWithinCatchRadius(p: Pokemon): boolean {
    if (p.location && this.lastLocation && p.sprite) {
      const dx = p.location.x - this.lastLocation.x;
      const dy = p.location.y - this.lastLocation.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      return d < 50; // CHANGE THIS TO MODIFY THE CATCH RADIUS
    }
    return false;
  }


  getNewMovementDirection() {
    if (this.cursors.find(keySet => keySet.left?.isDown)) {
      return 'left';
    }
    if (this.cursors.find(keySet => keySet.right?.isDown)) {
      return 'right';
    }
    if (this.cursors.find(keySet => keySet.down?.isDown)) {
      return 'front';
    }
    if (this.cursors.find(keySet => keySet.up?.isDown)) {
      return 'back';
    }
    return undefined;
  }

  update() {
    if (this.paused) {
      return;
    }
    if (this.player && this.cursors) {
      const speed = 175;

      const prevVelocity = this.player.sprite.body.velocity.clone();
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;

      // Stop any previous movement from the last frame
      body.setVelocity(0);

      const primaryDirection = this.getNewMovementDirection();
      switch (primaryDirection) {
        case 'left':
          body.setVelocityX(-speed);
          this.player.sprite.anims.play(`${this.myTrainerName}-left-walk`, true);
          break;
        case 'right':
          body.setVelocityX(speed);
          this.player.sprite.anims.play(`${this.myTrainerName}-right-walk`, true);
          break;
        case 'front':
          body.setVelocityY(speed);
          this.player.sprite.anims.play(`${this.myTrainerName}-front-walk`, true);
          break;
        case 'back':
          body.setVelocityY(-speed);
          this.player.sprite.anims.play(`${this.myTrainerName}-back-walk`, true);
          break;
        default:
          // Not moving
          this.player.sprite.anims.stop();
          // If we were moving, pick and idle frame to use
          if (prevVelocity.x < 0) {
            this.player.sprite.setTexture(`${this.myTrainerName}-left`);
          } else if (prevVelocity.x > 0) {
            this.player.sprite.setTexture(`${this.myTrainerName}-right`);
          } else if (prevVelocity.y < 0) {
            this.player.sprite.setTexture(`${this.myTrainerName}-back`);
          } else if (prevVelocity.y > 0) this.player.sprite.setTexture(`${this.myTrainerName}-front`);
          break;
      }

      // Normalize and scale the velocity so that player can't move faster along a diagonal
      this.player.sprite.body.velocity.normalize().scale(speed);

      const isMoving = primaryDirection !== undefined;
      this.player.label.setX(body.x);
      this.player.label.setY(body.y - 20);
      if (
        !this.lastLocation ||
        this.lastLocation.x !== body.x ||
        this.lastLocation.y !== body.y ||
        (isMoving && this.lastLocation.rotation !== primaryDirection) ||
        this.lastLocation.moving !== isMoving
      ) {
        if (!this.lastLocation) {
          this.lastLocation = {
            x: body.x,
            y: body.y,
            rotation: primaryDirection || 'front',
            moving: isMoving,
          };
        }
        this.lastLocation.x = body.x;
        this.lastLocation.y = body.y;
        this.lastLocation.rotation = primaryDirection || 'front';
        this.lastLocation.moving = isMoving;
        if (this.currentConversationArea) {
          if(this.currentConversationArea.conversationArea){
            this.lastLocation.conversationLabel = this.currentConversationArea.label;
          }
          if (
            !Phaser.Geom.Rectangle.Overlaps(
              this.currentConversationArea.sprite.getBounds(),
              this.player.sprite.getBounds(),
            )
          ) {
            this.infoTextBox?.setVisible(false);
            this.currentConversationArea = undefined;
            this.lastLocation.conversationLabel = undefined;
          }
        }
        this.emitMovement(this.lastLocation);
        
        this.previousLocations.push({
          x: this.lastLocation.x,
          y: this.lastLocation.y,
          rotation: this.lastLocation.rotation,
          moving: this.lastLocation.moving,
        });
      }

      this.pokemon.forEach(p => {
        const { sprite } = p;
        const { name } = p.species;

        if (sprite) {
          if (this.isVisible(sprite.x, sprite.y) && sprite.visible) {
            this.pokedexAddSeen(name);
          }
        }
      });

      const myPlayer = this.players.find(p => p.id === this.myPlayerID);
      if (myPlayer && myPlayer.pokemon.length) { 
        const selectedPokemon = myPlayer.pokemon[0];
        let { sprite } = selectedPokemon;
        const { name } = selectedPokemon.species;

        this.pokedexAddCaught(name);

        if (!sprite || sprite.displayList === null) {
          sprite = this.pokemonGroups[name]?.get(selectedPokemon.location.x, selectedPokemon.location.y, name);
          
          if (sprite) {
            this.sys.displayList.add(sprite);
            selectedPokemon.sprite = sprite;
          }
        }
        
        let location: UserLocation | undefined;

        if (this.previousLocations.length > followDistance) {
          location = this.previousLocations.shift();
        } else {
          [location] = this.previousLocations;
        }

        const playAnim = () => {
          if (sprite) {
            if (this.lastLocation?.moving) {
              sprite.anims.play(`${name}_anim`, true);
            } else {
              sprite.anims.stop();
            }
          }
        };
        
        if (sprite) {
          switch (location?.rotation) {
            case 'left':
              sprite.setFlipX(false);
              playAnim();
              break;
            case 'right':
              sprite.setFlipX(true);
              playAnim();
              break;
            case 'front':
              sprite.setTexture(name);
              playAnim();
              break;
            case 'back':
              sprite.setTexture(`${name}_back`);
              sprite.anims.stop();
              break;
            default:
              break;
          }

          sprite.setX((location?.x ?? this.lastLocation.x) + 15);
          sprite.setY((location?.y ?? this.lastLocation.y) + 20);
          sprite.setVisible(true);
          sprite.setActive(true);
        }
      } else if (this.previousLocations.length > followDistance) {
        this.previousLocations.shift();
      }

      this.pokemon.forEach(p => {
        p.label?.setVisible(false);
      })

      const nearbyPokemon = this.nearestPokemon();
      if (nearbyPokemon) {
        const labelstring = `Catch ${nearbyPokemon.species.name.charAt(0).toUpperCase() + nearbyPokemon.species.name.slice(1)}`

        let { label } = nearbyPokemon;
        if (!label) {
          // Add label at location with some offset
          label = this.add.text(0, 0, labelstring)
          .setOrigin(0.5)
          .setPadding(1)
          .setStyle({ 
            font: '10px monospace',
            color: '#000000',
            backgroundColor: '#ffffff',
          })
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            this.emitCatch({
              species: nearbyPokemon.species,
              location: nearbyPokemon.location,
              _id: nearbyPokemon._id,
            }, this.myPlayerID);
          })
          .on('pointerover', () => nearbyPokemon.label?.setStyle({ fill: '#f39c12' }))
          .on('pointerout', () => nearbyPokemon.label?.setStyle({ color: '#000000' }));
        }

        nearbyPokemon.label = label;
        nearbyPokemon.label?.setX(nearbyPokemon.location.x);
        nearbyPokemon.label?.setY(nearbyPokemon.location.y + 30);
        nearbyPokemon.label?.setVisible(nearbyPokemon.sprite?.visible ?? false);
      }
    }
  }

  create() {
    const map = this.make.tilemap({ key: 'map' });

    /* Parameters are the name you gave the tileset in Tiled and then the key of the
     tileset image in Phaser's cache (i.e. the name you used in preload)
     */
    const tileset = [
      'Room_Builder_32x32',
      '22_Museum_32x32',
      '5_Classroom_and_library_32x32',
      '12_Kitchen_32x32',
      '1_Generic_32x32',
      '13_Conference_Hall_32x32',
      '14_Basement_32x32',
      '16_Grocery_store_32x32',
    ].map(v => map?.addTilesetImage(v));

    // Parameters: layer name (or index) from Tiled, tileset, x, y
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const belowLayer = map.createLayer('Below Player', tileset, 0, 0);
    const wallsLayer = map.createLayer('Walls', tileset, 0, 0);
    const onTheWallsLayer = map.createLayer('On The Walls', tileset, 0, 0);
    wallsLayer.setCollisionByProperty({ collides: true });
    onTheWallsLayer.setCollisionByProperty({ collides: true });

    const worldLayer = map.createLayer('World', tileset, 0, 0);
    worldLayer.setCollisionByProperty({ collides: true });
    const aboveLayer = map.createLayer('Above Player', tileset, 0, 0);
    aboveLayer.setCollisionByProperty({ collides: true });

    const veryAboveLayer = map.createLayer('Very Above Player', tileset, 0, 0);
    /* By default, everything gets depth sorted on the screen in the order we created things.
     Here, we want the "Above Player" layer to sit on top of the player, so we explicitly give
     it a depth. Higher depths will sit on top of lower depth objects.
     */
    worldLayer.setDepth(5);
    aboveLayer.setDepth(10);
    veryAboveLayer.setDepth(15);

    // Object layers in Tiled let you embed extra info into a map - like a spawn point or custom
    // collision shapes. In the tmx file, there's an object layer with a point named "Spawn Point"
    const spawnPoint = (map.findObject(
      'Objects',
      obj => obj.name === 'Spawn Point',
    ) as unknown) as Phaser.GameObjects.Components.Transform;

    // Find all of the transporters, add them to the physics engine
    const transporters = map.createFromObjects('Objects', { name: 'transporter' });
    this.physics.world.enable(transporters);

    // For each of the transporters (rectangle objects), we need to tweak their location on the scene
    // for reasons that are not obvious to me, but this seems to work. We also set them to be invisible
    // but for debugging, you can comment out that line.
    transporters.forEach(transporter => {
      const sprite = transporter as Phaser.GameObjects.Sprite;
      sprite.y += sprite.displayHeight; // Phaser and Tiled seem to disagree on which corner is y
      sprite.setVisible(false); // Comment this out to see the transporter rectangles drawn on
      // the map
    });

    const conversationAreaObjects = map.filterObjects(
      'Objects',
      obj => obj.type === 'conversation',
    );
    const conversationSprites = map.createFromObjects(
      'Objects',
      conversationAreaObjects.map(obj => ({ id: obj.id })),
    );
    this.physics.world.enable(conversationSprites);
    conversationSprites.forEach(conversation => {
      const sprite = conversation as Phaser.GameObjects.Sprite;
      sprite.y += sprite.displayHeight;
      const labelText = this.add.text(
        sprite.x - sprite.displayWidth / 2,
        sprite.y - sprite.displayHeight / 2,
        conversation.name,
        { color: '#FFFFFF', backgroundColor: '#000000' },
      );
      const topicText = this.add.text(
        sprite.x - sprite.displayWidth / 2,
        sprite.y + sprite.displayHeight / 2,
        '(No Topic)',
        { color: '#000000' },
      );
      sprite.setTintFill();
      sprite.setAlpha(0.3);

      this.conversationAreas.push({
        labelText,
        topicText,
        sprite,
        label: conversation.name,
      });
    });

    this.infoTextBox = this.add
      .text(
        this.game.scale.width / 2,
        this.game.scale.height / 2,
        "You've found an empty conversation area!\nTell others what you'd like to talk about here\nby providing a topic label for the conversation.\nSpecify a topic by pressing the spacebar.",
        { color: '#000000', backgroundColor: '#FFFFFF' },
      )
      .setScrollFactor(0)
      .setDepth(30);
    this.infoTextBox.setVisible(false);
    this.infoTextBox.x = this.game.scale.width / 2 - this.infoTextBox.width / 2;

    const labels = map.filterObjects('Objects', obj => obj.name === 'label');
    labels.forEach(label => {
      if (label.x && label.y) {
        this.add.text(label.x, label.y, label.text.text, {
          color: '#FFFFFF',
          backgroundColor: '#000000',
        });
      }
    });

    const cursorKeys = this.input.keyboard.createCursorKeys();
    this.cursors.push(cursorKeys);
    this.cursors.push(
      this.input.keyboard.addKeys(
        {
          up: Phaser.Input.Keyboard.KeyCodes.W,
          down: Phaser.Input.Keyboard.KeyCodes.S,
          left: Phaser.Input.Keyboard.KeyCodes.A,
          right: Phaser.Input.Keyboard.KeyCodes.D,
        },
        false,
      ) as Phaser.Types.Input.Keyboard.CursorKeys,
    );
    this.cursors.push(
      this.input.keyboard.addKeys(
        {
          up: Phaser.Input.Keyboard.KeyCodes.H,
          down: Phaser.Input.Keyboard.KeyCodes.J,
          left: Phaser.Input.Keyboard.KeyCodes.K,
          right: Phaser.Input.Keyboard.KeyCodes.L,
        },
        false,
      ) as Phaser.Types.Input.Keyboard.CursorKeys,
    );

    const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    enterKey.on('up', () => this.enterPressed());
    spaceKey.on('up', () => this.enterPressed());

    const pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    pKey.on('up', () => this.togglePokedex());

    const openBracketKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.OPEN_BRACKET);
    openBracketKey.on('up', () => this.scrollPokedexUp());
    const closedBracketKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CLOSED_BRACKET);
    closedBracketKey.on('up', () => this.scrollPokedexDown());

    const xKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    xKey.on('up', () => this.switchPokemonPet());

    const qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    qKey.on('up', () => this.toggleHelp());


    // Create a sprite with physics enabled via the physics system. The image used for the sprite
    // has a bit of whitespace, so I'm using setSize & setOffset to control the size of the
    // player's body.
    const sprite = this.physics.add
      .sprite(spawnPoint.x, spawnPoint.y, `${this.myTrainerName}-front`)
      .setScale(2);
    const label = this.add.text(spawnPoint.x, spawnPoint.y - 20, '(You)', {
      font: '18px monospace',
      color: '#000000',
      backgroundColor: '#ffffff',
    });
    this.player = {
      sprite,
      label,
    };

    /* Configure physics overlap behavior for when the player steps into
    a transporter area. If you enter a transporter and press 'space', you'll
    transport to the location on the map that is referenced by the 'target' property
    of the transporter.
     */
    this.physics.add.overlap(sprite, transporters, (overlappingObject, transporter) => {
      if (this.player) {
        // In the tiled editor, set the 'target' to be an *object* pointer
        // Here, we'll see just the ID, then find the object by ID
        const transportTargetID = transporter.getData('target') as number;
        const target = map.findObject(
          'Objects',
          obj => ((obj as unknown) as Phaser.Types.Tilemaps.TiledObject).id === transportTargetID,
        );
        if (target && target.x && target.y && this.lastLocation) {
          // Move the player to the target, update lastLocation and send it to other players
          this.player.sprite.x = target.x;
          this.player.sprite.y = target.y;
          this.lastLocation.x = target.x;
          this.lastLocation.y = target.y;
          this.emitMovement(this.lastLocation);
        } else {
          throw new Error(`Unable to find target object ${target}`);
        }
      }
    });
    this.physics.add.overlap(
      sprite,
      conversationSprites,
      (overlappingPlayer, conversationSprite) => {
        const conversationLabel = conversationSprite.name;
        const conv = this.conversationAreas.find(area => area.label === conversationLabel);
        this.currentConversationArea = conv;
        if (conv?.conversationArea) {
          this.infoTextBox?.setVisible(false);
          const localLastLocation = this.lastLocation;
          if(localLastLocation && localLastLocation.conversationLabel !== conv.conversationArea.label){
            localLastLocation.conversationLabel = conv.conversationArea.label;
            this.emitMovement(localLastLocation);
          }
        } else {
          if (cursorKeys.space.isDown) {
            const newConversation = new ConversationArea(
              conversationLabel,
              BoundingBox.fromSprite(conversationSprite as Phaser.GameObjects.Sprite),
            );
            this.setNewConversation(newConversation);
          }
          this.infoTextBox?.setVisible(false);
        }
      },
    );

    this.emitMovement({
      rotation: 'front',
      moving: false,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - JB todo
      x: spawnPoint.x,
      y: spawnPoint.y,
    });

    // Watch the player and worldLayer for collisions, for the duration of the scene:
    this.physics.add.collider(sprite, worldLayer);
    this.physics.add.collider(sprite, wallsLayer);
    this.physics.add.collider(sprite, aboveLayer);
    this.physics.add.collider(sprite, onTheWallsLayer);

    // Create the player's walking animations from the texture atlas. These are stored in the global
    // animation manager so any sprite can access them.
    const { anims } = this;
    anims.create({
      key: 'misa-left-walk',
      frames: anims.generateFrameNames('atlas', {
        prefix: 'misa-left-walk.',
        start: 0,
        end: 3,
        zeroPad: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'misa-right-walk',
      frames: anims.generateFrameNames('atlas', {
        prefix: 'misa-right-walk.',
        start: 0,
        end: 3,
        zeroPad: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'misa-front-walk',
      frames: anims.generateFrameNames('atlas', {
        prefix: 'misa-front-walk.',
        start: 0,
        end: 3,
        zeroPad: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'misa-back-walk',
      frames: anims.generateFrameNames('atlas', {
        prefix: 'misa-back-walk.',
        start: 0,
        end: 3,
        zeroPad: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });

    Object.values(TrainerName).forEach(trainer => {
      directions.forEach(dStr => {
        this.anims.create({
          key: `${trainer}-${dStr}-walk`,
          frames: [
            { key: `${trainer}-${dStr}-walk-1`, frame: 0 },
            { key: `${trainer}-${dStr}`, frame: 0 },
            { key: `${trainer}-${dStr}-walk-2`, frame: 0 },
            { key: `${trainer}-${dStr}`, frame: 0 },
          ],
          frameRate: 10,
          repeat: -1,
        });
      });
    });


    // load animations
    pokemonNames.forEach(pokemonFrame => {
      this.anims.create({
        key: `${pokemonFrame}_anim`,
        frames: [
          { key: `${pokemonFrame}-1`, frame: 0 },
          { key: `${pokemonFrame}-2`, frame: 0 },
          { key: `${pokemonFrame}-3`, frame: 0 },
          { key: `${pokemonFrame}-4`, frame: 0 },
          { key: `${pokemonFrame}-5`, frame: 0 },
          { key: `${pokemonFrame}-6`, frame: 0 }
        ],
        frameRate: 6,
        repeat: -1
      })
    });

    // Pool objects
    pokemonNames.forEach(name => {
      const myGroup = this.add.group({
        defaultKey: name,
        active: false,
      });

      let i;
      for (i = 0 ; i < 15 ; i += 1) {
        myGroup.create(0, 0, name, undefined, false, false);
      }

      myGroup.playAnimation(`${name}_anim`);
      
      this.pokemonGroups[name] = myGroup;
    });



    const pokedexContainer = this.add.container(this.cameras.main.displayWidth - 166, 216)
    .setDepth(30)
    .setScrollFactor(0);

    const graphics = this.add.graphics()
    graphics.fillStyle(0xB71C1C);
    const pkImageBg = graphics.fillRoundedRect(-54, -205, 210, 410, 8);
    pokedexContainer.add(pkImageBg);

    const pokemonBg = this.add.sprite(-136, -100, 'pokemonbg');
    this.pokedex.pokemonBg = pokemonBg;
    pokedexContainer.add(pokemonBg);

    // We probably first want to set the sprite to invisible
    pokemonNames.forEach(name => {
      const dexEntrySprite = this.add.sprite(-136, -100, name);
      this.sys.displayList.add(dexEntrySprite);
      dexEntrySprite.setVisible(false);
      dexEntrySprite.setActive(false);
      dexEntrySprite.setTintFill(0x999999);
      this.pokedex.pokedex[name].pokemonSprite = dexEntrySprite;

      pokedexContainer.add(dexEntrySprite);
    });

    const pokemonBgUnknown = this.add.sprite(-136, -100, 'pokemonbgunknown');
    this.pokedex.pokemonBgUnknown = pokemonBgUnknown;
    pokedexContainer.add(pokemonBgUnknown);

    const visibleNames = pokemonNames.slice(0, POKEDEX_SIZE);

    visibleNames.forEach((name, i) => {
      const dexLabel = this.add.text(-10, (40 * i) - 180, '000\t-----')
      .setOrigin(0, 0.5)
      .setPadding(1)
      .setStyle({ 
        font: '16px monospace',
        color: '#000000',
      });

      const labelBg = this.add.sprite(50, (40 * i) - 180, 'label')
      .setScale(1.5);
      const labelCover = this.add.sprite(-31, (40 * i) - 180, 'labelcover')
      .setScale(1.4)
      .setTintFill(0x307576);

      const labelBall = this.add.sprite(-31, (40 * i) - 180, 'ballgrey')
      .setScale(1.2);


      dexLabel.name = "label"
      pokedexContainer.add(labelBg);
      pokedexContainer.add(dexLabel);
      pokedexContainer.add(labelCover);
      pokedexContainer.add(labelBall);

      this.pokedex.labels.push(dexLabel);
      this.pokedex.labelBgs.push(labelBg);
      this.pokedex.labelCovers.push(labelCover);
      this.pokedex.labelBalls.push(labelBall);
    });

    this.pokedex.container = pokedexContainer;

    this.updatePokedex();

    this.pokedex.container.setVisible(false);
    this.pokedex.container.setActive(false);


    const camera = this.cameras.main;
    camera.startFollow(this.player.sprite);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);


    // Help text that has a "fixed" position on the screen
    this.helpLabel = this.add
      .text(
        16,
        16,
        `Arrow keys to move\nEnter and Space to catch Pokemon\nP to toggle Pokedex\n[ and ] to navigate Pokedex\nX to select Pokemon Pet\nComplete achievements to unlock Pokemon\nQ to toggle help`,
        {
          font: '12px monospace',
          color: '#000000',
          padding: {
            x: 10,
            y: 5,
          },
          backgroundColor: '#ffffff',
        },
      )
      .setScrollFactor(0)
      .setDepth(30);

    this.ready = true;
    if (this.players.length) {
      // Some players got added to the queue before we were ready, make sure that they have
      // sprites....
      this.players.forEach(p => this.updatePlayerLocation(p));
    }

    if (this.pokemon.length) {
      // Some pokemon got added to the queue before we were ready, make sure that they have
      // sprites....
      this.pokemon.forEach(p => this.updatePokemonLocation(p));
    }

    // Call any listeners that are waiting for the game to be initialized
    this._onGameReadyListeners.forEach(listener => listener());
    this._onGameReadyListeners = [];
  }

  pause() {
    if (!this.paused) {
      this.paused = true;
      if(this.player){
        this.player?.sprite.anims.stop();
        const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);
      }
      this.previouslyCapturedKeys = this.input.keyboard.getCaptures();
      this.input.keyboard.clearCaptures();
    }
  }

  resume() {
    if (this.paused) {
      this.paused = false;
      if (Video.instance()) {
        // If the game is also in process of being torn down, the keyboard could be undefined
        this.input.keyboard.addCapture(this.previouslyCapturedKeys);
      }
      this.previouslyCapturedKeys = [];
    }
  }
}

export default function WorldMap(): JSX.Element {
  const video = Video.instance();
  const { emitMovement, emitCatch, myPlayerID, myTrainerName } = useCoveyAppState();
  const conversationAreas = useConversationAreas();
  const [gameScene, setGameScene] = useState<CoveyGameScene>();
  const [newConversation, setNewConversation] = useState<ConversationArea>();
  const playerMovementCallbacks = usePlayerMovement();
  const players = usePlayersInTown();
  const pokemon = usePokemonInTown();

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      backgroundColor: '#000000',
      parent: 'map-container',
      pixelArt: true,
      autoRound: 10,
      minWidth: 800,
      fps: { target: 30 },
      powerPreference: 'high-performance',
      minHeight: 600,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 }, // Top down game, so no gravity
        },
      },
    };

    const game = new Phaser.Game(config);
    if (video) {
      const newGameScene = new CoveyGameScene(video, emitMovement, emitCatch, setNewConversation, myPlayerID, myTrainerName);
      setGameScene(newGameScene);
      game.scene.add('coveyBoard', newGameScene, true);
      video.pauseGame = () => {
        newGameScene.pause();
      };
      video.unPauseGame = () => {
        newGameScene.resume();
      };
    }
    return () => {
      game.destroy(true);
    };
  }, [video, emitMovement, emitCatch, setNewConversation, myPlayerID, myTrainerName]);

  useEffect(() => {
    const movementDispatcher = (player: ServerPlayer) => {
      gameScene?.updatePlayerLocation(Player.fromServerPlayer(player));
    };
    playerMovementCallbacks.push(movementDispatcher);
    return () => {
      playerMovementCallbacks.splice(playerMovementCallbacks.indexOf(movementDispatcher), 1);
    };
  }, [gameScene, playerMovementCallbacks]);

  useEffect(() => {
    gameScene?.updatePlayersLocations(players);
  }, [gameScene, players]);

  useEffect(() => {
    gameScene?.updatePokemonLocations(pokemon);
  }, [gameScene, pokemon]);

  useEffect(() => {
    gameScene?.updateConversationAreas(conversationAreas);
  }, [conversationAreas, gameScene]);

  const newConversationModalOpen = newConversation !== undefined;
  useEffect(() => {
    if (newConversationModalOpen) {
      video?.pauseGame();
    } else {
      video?.unPauseGame();
    }
  }, [video, newConversationModalOpen]);

  const newConversationModal = useMemo(() => {
    if (newConversation) {
      video?.pauseGame();
      return (
        <NewConversationModal
          isOpen={newConversation !== undefined}
          closeModal={() => {
            video?.unPauseGame();
            setNewConversation(undefined);
          }}
          newConversation={newConversation}
        />
      );
    }
    return <></>;
  }, [video, newConversation, setNewConversation]);

  return (
    <div id='app-container'>
      {newConversationModal}
      <div id='map-container' />
      <AchievementList />

    </div>
  );
}
