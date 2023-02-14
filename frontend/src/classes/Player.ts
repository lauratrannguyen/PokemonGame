import Pokemon from "./Pokemon";

export default class Player {
  public location?: UserLocation;

  public previousLocations: UserLocation[];

  private readonly _id: string;

  private readonly _userName: string;

  public sprite?: Phaser.GameObjects.Sprite;

  public label?: Phaser.GameObjects.Text;

  public pokemon: Pokemon[];

  public trainerName: TrainerName;

  constructor(id: string, userName: string, location: UserLocation, pokemon: Pokemon[], trainerName: TrainerName) {
    this._id = id;
    this._userName = userName;
    this.location = location;
    this.pokemon = pokemon;
    this.previousLocations = [];
    this.trainerName = trainerName;
  }

  get userName(): string {
    return this._userName;
  }

  get id(): string {
    return this._id;
  }

  static fromServerPlayer(playerFromServer: ServerPlayer): Player {
    return new Player(playerFromServer._id, playerFromServer._userName, playerFromServer.location, playerFromServer.pokemon, playerFromServer.trainerName);
  }
}
export type ServerPlayer = { _id: string, _userName: string, location: UserLocation, pokemon: Pokemon[], trainerName: TrainerName };

export type Direction = 'front'|'back'|'left'|'right';

export type UserLocation = {
  x: number,
  y: number,
  rotation: Direction,
  moving: boolean,
  conversationLabel?: string
};

export enum TrainerName {
  lucas = 'lucas',
  dawn = 'dawn',
  barry = 'barry',
  cynthia = 'cynthia',
  cyrus = 'cyrus',
  rowan = 'rowan',
  oak = 'oak',
  misty = 'misty',
  cheryl = 'cheryl',
  wake = 'wake',
  byron = 'byron',
  candice = 'candice',
  gardenia = 'gardenia',
  flint = 'flint',
  bertha = 'bertha',
  palmer = 'palmer',
  hatboy = 'hatboy',
  farmgirl = 'farmgirl',
  grunt = 'grunt',
  karate = 'karate',
  mom = 'mom',
  katie = 'katie',
  karen = 'karen',
  tubegirl = 'tubegirl',
}
