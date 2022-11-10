import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import { Answer } from './Answer';
import { GameStatus } from './GameStatus';
import PlayerController from './PlayerController';

const DRAW = 'draw';

export type RPSEvents = {
  statusChange: (newStatus: GameStatus) => void;
  playerWon: (player: PlayerController) => void;
  playerLost: (player: PlayerController) => void;
  playersDrawed: (draw: string) => void;
};

/**
 * Represents the functionality of a two-player RPS game.
 */
export default class RPS extends (EventEmitter as new () => TypedEmitter<RPSEvents>) {
  private _status: GameStatus;

  private readonly _playerOne: PlayerController;

  private readonly _playerTwo: PlayerController;

  /**
   * Creates a new RPS game.
   */
  constructor(playerOne: PlayerController, playerTwo: PlayerController) {
    super();
    this._playerOne = playerOne;
    this._playerTwo = playerTwo;
    this._status = GameStatus.NEW;
  }

  get status(): GameStatus {
    return this._status;
  }

  set status(newStatus: GameStatus) {
    if (this.status !== newStatus) {
      this.emit('statusChange', newStatus);
    }
    this._status = newStatus;
  }

  get playerOne(): PlayerController {
    return this._playerOne;
  }

  get playerTwo(): PlayerController {
    return this._playerTwo;
  }

  public startGame() {
    this.status = GameStatus.STARTED;
    this.emit('statusChange', GameStatus.STARTED);
  }

  /**
   * Determines the winner of a game of RPS.
   * @param playerOneAnswer player one's choice of RPS.
   * @param playerTwoAnswer player two's choice of RPS.
   * @returns the winner of the game.
   */
  public calculateWinner(
    playerOneAnswer: Answer,
    playerTwoAnswer: Answer,
  ): PlayerController | undefined {
    let playerWon: PlayerController | undefined;
    if (playerOneAnswer === Answer.ROCK) {
      if (playerTwoAnswer === Answer.ROCK) {
        playerWon = undefined;
        // TODO - todo note drawing with undefined?
      } else if (playerTwoAnswer === Answer.PAPER) {
        playerWon = this.playerTwo;
      } else {
        playerWon = this.playerOne;
      }
    } else if (playerOneAnswer === Answer.PAPER) {
      if (playerTwoAnswer === Answer.ROCK) {
        playerWon = this.playerOne;
      } else if (playerTwoAnswer === Answer.PAPER) {
        playerWon = undefined;
      } else {
        playerWon = this.playerTwo;
      }
    } else {
      if (playerTwoAnswer === Answer.ROCK) {
        playerWon = this.playerTwo;
      } else if (playerTwoAnswer === Answer.PAPER) {
        playerWon = this.playerOne;
      } else {
        playerWon = undefined;
      }
    }
    if (playerWon) {
      this.emit('playerWon', playerWon);
    } else {
      this.emit('playersDrawed', DRAW);
    }
    this.status = GameStatus.FINISHED;
    return playerWon;
  }

  /**
   * Determines the loser of a game of RPS.
   * @param playerOneAnswer player one's choice of RPS.
   * @param playerTwoAnswer player two's choice of RPS.
   * @returns the loser of the game.
   */
  public calculateLoser(
    playerOneAnswer: Answer,
    playerTwoAnswer: Answer,
  ): PlayerController | undefined {
    const winner = this.calculateWinner(playerOneAnswer, playerTwoAnswer);
    if (winner) {
      if (winner === this.playerOne) {
        this.emit('playerLost', this.playerTwo);
      } else {
        this.emit('playerLost', this.playerOne);
      }
      this.status = GameStatus.FINISHED;
    }
    return winner;
  }
}
