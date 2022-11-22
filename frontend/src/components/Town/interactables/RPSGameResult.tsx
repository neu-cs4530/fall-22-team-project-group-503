import {
  Button,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react';
import React, { useCallback } from 'react';
import { useIsInRPSGame, useRPSResult } from '../../../classes/TownController';
import useTownController from '../../../hooks/useTownController';
import { Answer } from '../../../classes/Answer';

export default function RPSGameResult(): JSX.Element {
  const coveyTownController = useTownController();
  const ourPlayer = coveyTownController.ourPlayer;
  const newResult = useRPSResult();

  const toast = useToast();

  try {
    if (newResult) {
      toast({
        title: 'recieved resulty',
        status: 'success',
      });
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
