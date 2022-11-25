import { Box, Heading, HStack, ListItem, OrderedList, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { useLeaderboard } from '../../classes/TownController';
import useTownController from '../../hooks/useTownController';
import PlayerName from './PlayerName';

/**
 * Lists the current leaderboard
 *
 * See relevant hooks: `usePlayersInTown` and `useCoveyAppState`
 *
 */
export default function Leaderboard(): JSX.Element {
  const leaderboard = useLeaderboard();
  const { friendlyName, townID } = useTownController();

  return (
    <Box>
      <Tooltip label={`Town ID: ${townID}`}>
        <Heading as='h2' fontSize='l'>
          Leaderboard
        </Heading>
      </Tooltip>
      <OrderedList>
        {leaderboard.map(player => (
          <ListItem key={player.id}>
            <HStack>
              <PlayerName player={player} />
              <Box>: {player.score}</Box>
            </HStack>
          </ListItem>
        ))}
      </OrderedList>
    </Box>
  );
}
