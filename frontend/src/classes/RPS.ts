import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import { Answer } from './Answer';
import { GameStatus } from './GameStatus';
import { RPSPlayerMove } from '../types/CoveyTownSocket';
import useTownController from '../hooks/useTownController';
import { useEffect, useState } from 'react';

const DRAW = 'draw';

export type RPSResult = {
  winner: string;
  loser: string;
  draw?: boolean;
};

export type RPSEvents = {
  statusChange: (newStatus: GameStatus) => void;
  // playerWon: (player: string) => void;
  // playerLost: (player: string) => void;
  gameEnded: (result: RPSResult) => void;
  playersDrawed: (draw: string) => void;
};

/**
 * Represents the functionality of a two-player RPS game.
 */
export default class RPS extends (EventEmitter as new () => TypedEmitter<RPSEvents>) {
  private _status: GameStatus;

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
    this._status = GameStatus.NEW;
  }

  get winner(): string | undefined {
    return this._winner;
  }

  set winner(newWinner: string | undefined) {
    this._winner = newWinner;
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

  public startGame() {
    this.status = GameStatus.STARTED;
    this.emit('statusChange', GameStatus.STARTED);
  }

  public selectMove(player: string, move: Answer) {
    if (this.playerOne === player) {
      this._playerOneMove = move;
    } else if (this.playerTwo === player) {
      this._playerTwoMove = move;
    }
  }

  /**
   * Determines the winner of a game of RPS.
   * @param playerOneAnswer player one's choice of RPS.
   * @param playerTwoAnswer player two's choice of RPS.
   * @returns the winner of the game.
   */
  public calculateWinnerFromMoves(): RPSResult {
    let playerWon: string;
    if (this._playerOneMove === Answer.ROCK) {
      if (this._playerTwoMove === Answer.ROCK) {
        playerWon = DRAW;
        // TODO - todo note drawing with undefined?
      } else if (this._playerTwoMove === Answer.PAPER) {
        playerWon = this.playerTwo;
      } else {
        playerWon = this.playerOne;
      }
    } else if (this._playerOneMove === Answer.PAPER) {
      if (this._playerTwoMove === Answer.ROCK) {
        playerWon = this.playerOne;
      } else if (this._playerTwoMove === Answer.PAPER) {
        playerWon = DRAW;
      } else {
        playerWon = this.playerTwo;
      }
    } else {
      if (this._playerTwoMove === Answer.ROCK) {
        playerWon = this.playerTwo;
      } else if (this._playerTwoMove === Answer.PAPER) {
        playerWon = this.playerOne;
      } else {
        playerWon = DRAW;
      }
    }
    if (playerWon === DRAW) {
      return {
        winner: this.playerOne,
        loser: this.playerTwo,
        draw: true,
      };
    }
    this.status = GameStatus.FINISHED;
    return {
      winner: playerWon,
      loser: this.playerOne === playerWon ? this.playerTwo : this.playerOne,
    };
  }

  // public async calculateWinner(): Promise<string> {
  //   // await this._playerOneMove;
  //   // await this._playerTwoMove;
  //   const winner = this.calculateWinnerFromMoves();
  //   console.log('a winner is selected');
  //   this.emit('gameEnded')
  //   return winner;
  // }

  // /**
  //  * Determines the loser of a game of RPS.
  //  * @param playerOneAnswer player one's choice of RPS.
  //  * @param playerTwoAnswer player two's choice of RPS.
  //  * @returns the loser of the game.
  //  */
  // public calculateLoser(): string | undefined {
  //   const winner = this.calculateWinnerFromMoves();
  //   if (winner) {
  //     if (winner === this.playerOne) {
  //       this.emit('playerLost', this.playerTwo);
  //     } else {
  //       this.emit('playerLost', this.playerOne);
  //     }
  //     this.status = GameStatus.FINISHED;
  //   }
  //   return winner;
  // }

  // public updateFrom(newRPS: RPS) {
  //   this._status = newRPS.status;
  //   this._playerOneMove = newRPS.playerOneMove;
  //   this._playerTwoMove = newRPS.playerTwoMove;
  // }

  public updateFrom(playerMove: RPSPlayerMove) {
    // how to determine who is player one vs two
    if (playerMove.player === this.playerOne) {
      this.playerOneMove = playerMove.move;
      // emit?
    } else if (playerMove.player === this.playerTwo) {
      this.playerTwoMove = playerMove.move;
    }
    if (this._playerOneMove !== undefined && this._playerTwoMove !== undefined) {
      this.calculateWinnerFromMoves();
    }
  }
}

export function useRPSResult(rps: RPS) {
  const [winner, setWinner] = useState<string>();
  const [loser, setLoser] = useState<string>();

  useEffect(() => {
    const gameHandler = (gameResult: RPSResult) => {
      if (gameResult.winner) {
        setWinner(gameResult.winner);
        setLoser(gameResult.loser);
      }
      rps.addListener('gameEnded', gameHandler);
      return () => {
        rps.removeListener('gameEnded', gameHandler);
      };
    };
  }, [rps]);
  return { winner, loser };
}
