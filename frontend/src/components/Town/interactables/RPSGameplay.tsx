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
import { useRPSGame } from '../../../classes/TownController';
import useTownController from '../../../hooks/useTownController';
import { Answer } from '../../../classes/Answer';

export default function RPSGameplay(): JSX.Element {
  const coveyTownController = useTownController();
  const currentRPSGame = useRPSGame(coveyTownController.ourPlayer.id);

  const closeModal = useCallback(() => {
    coveyTownController.unPause();
    close();
  }, [coveyTownController]);

  const toast = useToast();

  let isOpen = currentRPSGame !== undefined;

  const ourPlayer = coveyTownController.ourPlayer;

  const isPlayerOne: boolean = currentRPSGame ? currentRPSGame.playerOne === ourPlayer.id : false;

  const selectMove = useCallback(
    async (answer: Answer) => {
      try {
        if (currentRPSGame) {
          currentRPSGame.selectMove(ourPlayer.id, answer);
          currentRPSGame.calculateWinner();
          toast({
            title: 'Move has been sent',
            status: 'success',
          });
          coveyTownController.unPause();
          closeModal();
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
    },
    [closeModal, coveyTownController, currentRPSGame, isPlayerOne, toast],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        closeModal();
        coveyTownController.unPause();
      }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Pick a move</ModalHeader>
        <ModalCloseButton />
        <ModalFooter>
          <Button
            colorScheme='blue'
            mr={3}
            onClick={() => {
              selectMove(Answer.ROCK);
              isOpen = false;
            }}>
            Rock
          </Button>
          <Button
            colorScheme='blue'
            mr={3}
            onClick={() => {
              selectMove(Answer.PAPER);
              isOpen = false;
            }}>
            Paper
          </Button>
          <Button
            colorScheme='blue'
            mr={3}
            onClick={() => {
              selectMove(Answer.SCISSORS);
              isOpen = false;
            }}>
            Scissors
          </Button>
          <Button onClick={closeModal}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
