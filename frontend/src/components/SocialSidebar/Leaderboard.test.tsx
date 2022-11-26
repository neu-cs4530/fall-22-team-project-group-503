import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import { render, RenderResult, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { nanoid } from 'nanoid';
import React from 'react';
import PlayerController from '../../classes/PlayerController';
import TownController, * as TownControllerHooks from '../../classes/TownController';
import * as useTownController from '../../hooks/useTownController';
import { mockTownController } from '../../TestUtils';
import { PlayerLocation } from '../../types/CoveyTownSocket';
import Leaderboard from './Leaderboard';
import * as PlayerName from './PlayerName';

describe('PlayersOnLeaderboard', () => {
  const randomLocation = (): PlayerLocation => ({
    moving: Math.random() < 0.5,
    rotation: 'front',
    x: Math.random() * 1000,
    y: Math.random() * 1000,
  });
  const wrappedLeaderboardComponent = () => (
    <ChakraProvider>
      <React.StrictMode>
        <Leaderboard />
      </React.StrictMode>
    </ChakraProvider>
  );
  const renderLeaderboard = () => render(wrappedLeaderboardComponent());
  let consoleErrorSpy: jest.SpyInstance<void, [message?: any, ...optionalParms: any[]]>;
  let useLeaderboard: jest.SpyInstance<PlayerController[], []>;
  let useTownControllerSpy: jest.SpyInstance<TownController, []>;
  let players: PlayerController[] = [];
  let townID: string;
  let townFriendlyName: string;
  const expectProperlyRenderedLeaderboard = async (
    renderData: RenderResult,
    playersToExpect: PlayerController[],
  ) => {
    const listEntries = await renderData.findAllByRole('listitem');
    expect(listEntries.length).toBe(playersToExpect.length); // expect same number of players
    const playersSortedCorrectly = playersToExpect
      .sort((a, b) => b.score - a.score)
      .map(p => p.userName);
    for (let i = 0; i < playersSortedCorrectly.length; i += 1) {
      expect(listEntries[i]).toHaveTextContent(playersSortedCorrectly[i]);
      const parentComponent = listEntries[i].parentNode;
      if (parentComponent) {
        expect(parentComponent.nodeName).toBe('OL'); // list items expected to be directly nested in an ordered list
      }
    }
  };
  beforeAll(() => {
    // Spy on console.error and intercept react key warnings to fail test
    consoleErrorSpy = jest.spyOn(global.console, 'error');
    consoleErrorSpy.mockImplementation((message?, ...optionalParams) => {
      const stringMessage = message as string;
      if (stringMessage.includes('children with the same key,')) {
        throw new Error(stringMessage.replace('%s', optionalParams[0]));
      } else if (stringMessage.includes('warning-keys')) {
        throw new Error(stringMessage.replace('%s', optionalParams[0]));
      }
      // eslint-disable-next-line no-console -- we are wrapping the console with a spy to find react warnings
      console.warn(message, ...optionalParams);
    });
    useLeaderboard = jest.spyOn(TownControllerHooks, 'useLeaderboard');
    useTownControllerSpy = jest.spyOn(useTownController, 'default');
  });

  beforeEach(() => {
    players = [];
    for (let i = 0; i < 10; i += 1) {
      players.push(
        new PlayerController(
          `testingPlayerID${i}-${nanoid()}`,
          `testingPlayerUser${i}-${nanoid()}}`,
          randomLocation(),
        ),
      );
    }
    players.sort((a, b) => b.score - a.score);
    players.slice(0, 10);
    useLeaderboard.mockReturnValue(players);
    townID = nanoid();
    townFriendlyName = nanoid();
    const mockedTownController = mockTownController({ friendlyName: townFriendlyName, townID });
    useTownControllerSpy.mockReturnValue(mockedTownController);
  });
  describe('Heading', () => {
    it('Displays a heading "Leaderboard', async () => {
      const renderData = renderLeaderboard();
      const heading = await renderData.findByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent(`Leaderboard`);
    });
    it('Includes a tooltip that has the town ID', async () => {
      const renderData = renderLeaderboard();
      const heading = await renderData.findByRole('heading', { level: 2 });
      expect(renderData.queryByRole('tooltip')).toBeNull(); // no tooltip visible yet
      userEvent.hover(heading);
      const toolTip = await renderData.findByRole('tooltip'); // should be just one...
      expect(toolTip).toHaveTextContent(`Town ID: ${townID}`);
    });
  });
  it("Renders a list of all players' user names, without checking sort", async () => {
    // players array is already sorted correctly
    const renderData = renderLeaderboard();
    await expectProperlyRenderedLeaderboard(renderData, players);
  });
  it("Renders the players' names in a PlayerName component", async () => {
    const mockPlayerName = jest.spyOn(PlayerName, 'default');
    try {
      renderLeaderboard();
      await waitFor(() => {
        expect(mockPlayerName).toBeCalledTimes(players.length);
      });
    } finally {
      mockPlayerName.mockRestore();
    }
  });
  it('Displays top 10 players in correct order', async () => {
    players.reverse();
    const renderData = renderLeaderboard();
    await expectProperlyRenderedLeaderboard(renderData, players);
  });
  it('Does not mutate the array returned by useLeaderboard', async () => {
    players.reverse();
    const copyOfArrayPassedToComponent = players.concat([]);
    const renderData = renderLeaderboard();
    await expectProperlyRenderedLeaderboard(renderData, players);
    expect(players).toEqual(copyOfArrayPassedToComponent); // expect that the players array is unchanged by the compoennt
  });
  it('Adds players to the list when they are added to the town', async () => {
    const renderData = renderLeaderboard();
    await expectProperlyRenderedLeaderboard(renderData, players);
    for (let i = 0; i < players.length; i += 1) {
      const newPlayers = players.concat([
        new PlayerController(
          `testingPlayerID-${i}.new`,
          `testingPlayerUser${i}.new`,
          randomLocation(),
        ),
      ]);
      useLeaderboard.mockReturnValue(newPlayers);
      renderData.rerender(wrappedLeaderboardComponent());
      await expectProperlyRenderedLeaderboard(renderData, newPlayers);
    }
  });
  it('Removes players from the list when they are removed from the town', async () => {
    const renderData = renderLeaderboard();
    await expectProperlyRenderedLeaderboard(renderData, players);
    for (let i = 0; i < players.length; i += 1) {
      const newPlayers = players.splice(i, 1);
      useLeaderboard.mockReturnValue(newPlayers);
      renderData.rerender(wrappedLeaderboardComponent());
      await expectProperlyRenderedLeaderboard(renderData, newPlayers);
    }
  });
});
