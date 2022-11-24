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
    rps = new RPS(player1.id, player2.id);
    mockClear(mockListeners.statusChange);
    mockClear(mockListeners.gameEnded);
    rps.addListener('statusChange', mockListeners.statusChange);
    rps.addListener('gameEnded', mockListeners.gameEnded);
  });
  describe('statusChange', () => {
    it('Returns true if status is started if game started', () => {
      rps.startGame();
      expect(rps.status).toBe(GameStatus.STARTED);
      expect(mockListeners.statusChange).toBeCalled();
    });
    it('Returns true if status is finished if game finished', () => {
      rps.selectMove(player1.id, Answer.ROCK);
      rps.selectMove(player2.id, Answer.PAPER);
      rps.calculateWinnerFromMoves();
      expect(rps.status).toBe(GameStatus.FINISHED);
      expect(mockListeners.statusChange).toBeCalled();
    });
    it('Returns true if status is finished if game finished with draw result', () => {
      rps.selectMove(player1.id, Answer.ROCK);
      rps.selectMove(player2.id, Answer.ROCK);
      expect(rps.status).toBe(GameStatus.FINISHED);
      expect(mockListeners.statusChange).toBeCalled();
    });
  });
  describe('calculate winner', () => {
    it('returns player one as winner if player one wins with paper', () => {
      rps.selectMove(player1.id, Answer.PAPER);
      rps.selectMove(player2.id, Answer.ROCK);
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
      expect(mockListeners.gameEnded).toBeCalled();
    });
    it('returns player one as winner if player one wins with rock', () => {
      rps.selectMove(player1.id, Answer.ROCK);
      rps.selectMove(player2.id, Answer.SCISSORS);
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
      expect(mockListeners.gameEnded).toBeCalled();
    });
    it('returns player one as winner if player one wins with scissors', () => {
      rps.selectMove(player1.id, Answer.SCISSORS);
      rps.selectMove(player2.id, Answer.PAPER);
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
      expect(mockListeners.gameEnded).toBeCalled();
    });
    it('returns player two as winnner if player two wins with paper', () => {
      rps.selectMove(player1.id, Answer.ROCK);
      rps.selectMove(player2.id, Answer.PAPER);
      const expectedResult = {
        winner: player2.id,
        loser: player1.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
      expect(mockListeners.gameEnded).toBeCalled();
    });
    it('returns player two as winner if player two wins with rock', () => {
      rps.selectMove(player1.id, Answer.SCISSORS);
      rps.selectMove(player2.id, Answer.ROCK);
      const expectedResult = {
        winner: player2.id,
        loser: player1.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
      expect(mockListeners.gameEnded).toBeCalled();
    });
    it('returns player two as winner if player two wins with scissors', () => {
      rps.selectMove(player1.id, Answer.PAPER);
      rps.selectMove(player2.id, Answer.SCISSORS);
      const expectedResult = {
        winner: player2.id,
        loser: player1.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
      expect(mockListeners.gameEnded).toBeCalled();
    });
  });
  describe('draw', () => {
    it('returns draw if players drawed with paper', () => {
      rps.selectMove(player1.id, Answer.PAPER);
      rps.selectMove(player2.id, Answer.PAPER);
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
        draw: true,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
      expect(mockListeners.gameEnded).toBeCalled();
    });
    it('returns draw if players drawed with scissors', () => {
      rps.selectMove(player1.id, Answer.SCISSORS);
      rps.selectMove(player2.id, Answer.SCISSORS);
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
        draw: true,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
      expect(mockListeners.gameEnded).toBeCalled();
    });
    it('returns draw if players drawed with rock', () => {
      rps.selectMove(player1.id, Answer.ROCK);
      rps.selectMove(player2.id, Answer.ROCK);
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
        draw: true,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
      expect(mockListeners.gameEnded).toBeCalled();
    });
  });
});
