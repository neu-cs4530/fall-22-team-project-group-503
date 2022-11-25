import { useToast } from '@chakra-ui/react';
import React from 'react';
import { useRPSResult } from '../../../classes/TownController';
import useTownController from '../../../hooks/useTownController';

export default function RPSGameResult(): JSX.Element {
  const coveyTownController = useTownController();
  const ourPlayer = coveyTownController.ourPlayer;
  const ourResult = useRPSResult();

  const toast = useToast();

  const isWinner = ourResult?.winner === ourPlayer.id;

  try {
    if (ourResult) {
      if (ourResult.draw) {
        toast({
          title: 'The game ended in a tie!',
          status: 'info',
        });
      } else if (isWinner) {
        toast({
          title: 'You won the game!',
          status: 'success',
        });
      } else {
        toast({
          title: 'You lost the game!',
          status: 'warning',
        });
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      toast({
        title: 'Unable to send RPS move',
        description: err.toString(),
        status: 'error',
      });
    } else {
      console.trace(err);
      toast({
        title: 'Unexpected Error',
        status: 'error',
      });
    }
  }

  return <></>;
}
