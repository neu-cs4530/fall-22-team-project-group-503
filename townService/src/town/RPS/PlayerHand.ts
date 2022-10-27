import Player from '../../lib/Player';

export default class PlayerHand {
  private _player: Player;

  private _answer: Answer;

  /**
   * Creates a new PlayerHand.
   * @param player player who's hand is being represented
   * @param answer the RPS choice the player has chosen
   */
  public constructor(player: Player, answer: Answer) {
    this._player = player;
    this._answer = answer;
  }

  get player(): Player {
    return this._player;
  }

  get answer(): Answer {
    return this._answer;
  }
}
