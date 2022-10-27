import Player from '../../lib/Player';
import PlayerHand from './playerHand';

/**
 * Represents the functionality of a two-player RPS game.
 */
export default class Game {
  private _status: GameStatus;
  // do we want to have the two players be class variables instead of using static methods?

  /**
   * Creates a new RPS game.
   */
  constructor() {
    this._status = GameStatus.NEW;
  }

  get status(): GameStatus {
    return this._status;
  }

  set status(newStatus: GameStatus) {
    this._status = newStatus;
  }

  /**
   * Calculates the winner of a game of RPS.
   * @param hand1 player one's hand.
   * @param hand2 player two's hand.
   * @returns the winner of the game or undefined if it was a draw.
   */
  public static calculateWinner(hand1: PlayerHand, hand2: PlayerHand): Player | undefined {
    if (hand1.answer === Answer.ROCK) {
      if (hand2.answer === Answer.ROCK) {
        return undefined;
      }
      if (hand2.answer === Answer.PAPER) {
        return hand2.player;
      }
      return hand1.player;
    }
    if (hand1.answer === Answer.PAPER) {
      if (hand2.answer === Answer.ROCK) {
        return hand1.player;
      }
      if (hand2.answer === Answer.PAPER) {
        return undefined;
      }
      return hand2.player;
    }
    if (hand2.answer === Answer.ROCK) {
      return hand2.player;
    }
    if (hand2.answer === Answer.PAPER) {
      return hand1.player;
    }
    return undefined;
  }

  /**
   * Determines the loser of a game of RPS.
   * @param hand1 player one's hand.
   * @param hand2 player two's hand.
   * @returns the loser of the game or undefined if it was a draw.
   */
  public static calculateLoser(hand1: PlayerHand, hand2: PlayerHand): Player | undefined {
    const winner = this.calculateWinner(hand1, hand2);
    if (!winner) {
      return winner;
    }
    return winner === hand1.player ? hand2.player : hand1.player;
  }
}