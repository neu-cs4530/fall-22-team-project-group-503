import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { Answer } from './Answer';
import { GameStatus } from './GameStatus';
import PlayerController from './PlayerController';
import RPS, { RPSEvents } from './RPS';

describe('[T2] ConversationAreaController', () => {
  // A valid ConversationAreaController to be reused within the tests
  let player1: PlayerController;
  let player2: PlayerController;
  let rps: RPS;
  const mockListeners = mock<RPSEvents>();
  beforeEach(() => {
    player1 = new PlayerController(nanoid(), nanoid(), {
      x: 0,
      y: 0,
      rotation: 'front',
      moving: false,
    });
    player2 = new PlayerController(nanoid(), nanoid(), {
      x: 1,
      y: 1,
      rotation: 'back',
      moving: true,
    });
    // rps = new RPS(player1.id, player2.id);
    // mockClear(mockListeners.statusChange);
    // mockClear(mockListeners.playerWon);
    // mockClear(mockListeners.playerLost);
    // mockClear(mockListeners.playersDrawed);
    // rps.addListener('statusChange', mockListeners.statusChange);
    // rps.addListener('playerWon', mockListeners.playerWon);
    // rps.addListener('playerLost', mockListeners.playerLost);
    // rps.addListener('playersDrawed', mockListeners.playersDrawed);
  });
  describe('statusChange', () => {
    it('Returns true if status is started if game started', () => {
      rps.startGame();
      expect(rps.status).toBe(GameStatus.STARTED);
      expect(mockListeners.statusChange).toBeCalled();
    });
    //   it('Returns true if status is finished if game finished', () => {
    //     rps.calculateWinnerFromMoves(Answer.ROCK, Answer.PAPER);
    //     expect(rps.status).toBe(GameStatus.FINISHED);
    //     expect(mockListeners.statusChange).toBeCalled();
    //   });
    //   it('Returns true if status is finished if game finished with draw result', () => {
    //     rps.calculateWinnerFromMoves(Answer.ROCK, Answer.ROCK);
    //     expect(rps.status).toBe(GameStatus.FINISHED);
    //     expect(mockListeners.statusChange).toBeCalled();
    //   });
    // });
    // describe('calculate winner', () => {
    //   it('returns player one if player one wins with paper', () => {
    //     expect(rps.calculateWinnerFromMoves(Answer.PAPER, Answer.ROCK)).toEqual(player1);
    //     expect(mockListeners.playerWon).toBeCalled();
    //   });
    //   it('returns player one if player one wins with rock', () => {
    //     expect(rps.calculateWinnerFromMoves(Answer.ROCK, Answer.SCISSORS)).toEqual(player1);
    //     expect(mockListeners.playerWon).toBeCalled();
    //   });
    //   it('returns player one if player one wins with scissors', () => {
    //     expect(rps.calculateWinnerFromMoves(Answer.SCISSORS, Answer.PAPER)).toEqual(player1);
    //     expect(mockListeners.playerWon).toBeCalled();
    //   });
    //   it('returns player two if player two wins with paper', () => {
    //     expect(rps.calculateWinnerFromMoves(Answer.ROCK, Answer.PAPER)).toEqual(player2);
    //     expect(mockListeners.playerWon).toBeCalled();
    //   });
    //   it('returns player two if player two wins with rock', () => {
    //     expect(rps.calculateWinnerFromMoves(Answer.SCISSORS, Answer.ROCK)).toEqual(player2);
    //     expect(mockListeners.playerWon).toBeCalled();
    //   });
    //   it('returns player two if player two wins with scissors', () => {
    //     expect(rps.calculateWinnerFromMoves(Answer.PAPER, Answer.SCISSORS)).toEqual(player2);
    //     expect(mockListeners.playerWon).toBeCalled();
    //   });
    // });
    // describe('draw', () => {
    //   it('returns draw if players drawed with paper', () => {
    //     expect(rps.calculateWinnerFromMoves(Answer.PAPER, Answer.PAPER)).toBeUndefined();
    //     expect(mockListeners.playersDrawed).toBeCalled();
    //   });
    //   it('returns draw if players drawed with scissors', () => {
    //     expect(rps.calculateWinnerFromMoves(Answer.SCISSORS, Answer.SCISSORS)).toBeUndefined();
    //     expect(mockListeners.playersDrawed).toBeCalled();
    //   });
    //   it('returns draw if players drawed with rock', () => {
    //     expect(rps.calculateWinnerFromMoves(Answer.ROCK, Answer.ROCK)).toBeUndefined();
    //     expect(mockListeners.playersDrawed).toBeCalled();
    //   });
  });
});
