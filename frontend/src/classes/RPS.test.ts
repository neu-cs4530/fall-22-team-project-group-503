import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { Answer } from './Answer';
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
    mockClear(mockListeners.gameEnded);
  });
  describe('calculate winner', () => {
    it('returns player one as winner if player one wins with paper', () => {
      rps.updateFrom({
        player: player1.id,
        opponent: player2.id,
        move: Answer.PAPER,
      });
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.ROCK,
      });
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
    });
    it('returns player one as winner if player one wins with rock', () => {
      rps.updateFrom({
        player: player1.id,
        opponent: player2.id,
        move: Answer.ROCK,
      });
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.SCISSORS,
      });
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
    });
    it('returns player one as winner if player one wins with scissors', () => {
      rps.updateFrom({
        player: player1.id,
        opponent: player2.id,
        move: Answer.SCISSORS,
      });
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.PAPER,
      });
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
    });
    it('returns player two as winnner if player two wins with paper', () => {
      rps.updateFrom({
        player: player1.id,
        opponent: player2.id,
        move: Answer.ROCK,
      });
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.PAPER,
      });
      const expectedResult = {
        winner: player2.id,
        loser: player1.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
    });
    it('returns player two as winner if player two wins with rock', () => {
      rps.updateFrom({
        player: player1.id,
        opponent: player2.id,
        move: Answer.SCISSORS,
      });
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.ROCK,
      });
      const expectedResult = {
        winner: player2.id,
        loser: player1.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
    });
    it('returns player two as winner if player two wins with scissors', () => {
      rps.updateFrom({
        player: player1.id,
        opponent: player2.id,
        move: Answer.PAPER,
      });
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.SCISSORS,
      });
      const expectedResult = {
        winner: player2.id,
        loser: player1.id,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
    });
  });
  describe('draw', () => {
    it('returns draw if players drawed with paper', () => {
      rps.updateFrom({
        player: player1.id,
        opponent: player2.id,
        move: Answer.PAPER,
      });
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.PAPER,
      });
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
        draw: true,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
    });
    it('returns draw if players drawed with scissors', () => {
      rps.updateFrom({
        player: player1.id,
        opponent: player2.id,
        move: Answer.SCISSORS,
      });
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.SCISSORS,
      });
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
        draw: true,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
    });
    it('returns draw if players drawed with rock', () => {
      rps.updateFrom({
        player: player1.id,
        opponent: player2.id,
        move: Answer.ROCK,
      });
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.ROCK,
      });
      const expectedResult = {
        winner: player1.id,
        loser: player2.id,
        draw: true,
      };
      expect(rps.calculateWinnerFromMoves()).toEqual(expectedResult);
    });
  });
  describe('readyToComplete', () => {
    it('returns false if both players do not have a move', () => {
      expect(rps.readyToComplete()).toEqual(false);
    });
    it('returns false if player 1 does not have a move', () => {
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.ROCK,
      });
      expect(rps.readyToComplete()).toEqual(false);
    });
    it('returns false if player 2 does not have a move', () => {
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.PAPER,
      });
      expect(rps.readyToComplete()).toEqual(false);
    });
    it('returns true if both players have a move', () => {
      rps.updateFrom({
        player: player1.id,
        opponent: player2.id,
        move: Answer.PAPER,
      });
      rps.updateFrom({
        player: player2.id,
        opponent: player1.id,
        move: Answer.SCISSORS,
      });
      expect(rps.readyToComplete()).toEqual(true);
    });
  });
});
