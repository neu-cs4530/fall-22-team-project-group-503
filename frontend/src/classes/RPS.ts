import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import { Answer } from './Answer';
import { RPSPlayerMove } from '../types/CoveyTownSocket';

export type RPSResult = {
  winner: string;
  loser: string;
  draw?: boolean;
};

export type RPSEvents = {
  gameEnded: (result: RPSResult) => void;
};

/**
 * Represents the functionality of a two-player RPS game.
 */
export default class RPS extends (EventEmitter as new () => TypedEmitter<RPSEvents>) {
  private readonly _playerOne: string;

  private readonly _playerTwo: string;

  private _playerOneMove?: Answer;

  private _playerTwoMove?: Answer;

  private _winner?: string;

  /**
   * Creates a new RPS game.
   */
  constructor(playerOne: string, playerTwo: string) {
    super();
    this._playerOne = playerOne;
    this._playerTwo = playerTwo;
  }

  get winner(): string | undefined {
    return this._winner;
  }

  set winner(newWinner: string | undefined) {
    this._winner = newWinner;
  }

  set playerOneMove(answer: Answer) {
    this._playerOneMove = answer;
  }

  set playerTwoMove(answer: Answer) {
    this._playerTwoMove = answer;
  }

  get playerOne(): string {
    return this._playerOne;
  }

  get playerTwo(): string {
    return this._playerTwo;
  }

  /**
   * Determine if each player has made a valid RPS move and the game can be completed
   * @returns true if and only if both players have made their moves in this game
   */
  public readyToComplete(): boolean {
    return this._playerOneMove !== undefined && this._playerTwoMove !== undefined;
  }

  /**
   * Determines the winner of a game of RPS and returns an RPSResult object with the correct winner and loser
   * @returns the winner and loser of this RPS game
   */
  public calculateWinnerFromMoves(): RPSResult {
    let playerWon = '';

    if (this._playerOneMove === this._playerTwoMove) {
      return {
        winner: this.playerOne,
        loser: this.playerTwo,
        draw: true,
      };
    }

    if (this._playerOneMove === Answer.ROCK) {
      if (this._playerTwoMove === Answer.PAPER) {
        playerWon = this.playerTwo;
      } else {
        playerWon = this.playerOne;
      }
    } else if (this._playerOneMove === Answer.PAPER) {
      if (this._playerTwoMove === Answer.ROCK) {
        playerWon = this.playerOne;
      } else {
        playerWon = this.playerTwo;
      }
    } else {
      if (this._playerTwoMove === Answer.ROCK) {
        playerWon = this.playerTwo;
      } else if (this._playerTwoMove === Answer.PAPER) {
        playerWon = this.playerOne;
      }
    }
    return {
      winner: playerWon,
      loser: this.playerOne === playerWon ? this.playerTwo : this.playerOne,
    };
  }

  /**
   * Using an RPSPlayer move object, update this RPS instance accordingly
   * @param playerMove
   */
  public updateFrom(playerMove: RPSPlayerMove) {
    // how to determine who is player one vs two
    if (playerMove.player === this.playerOne) {
      this.playerOneMove = playerMove.move;
    } else if (playerMove.player === this.playerTwo) {
      this.playerTwoMove = playerMove.move;
    }
  }
}
