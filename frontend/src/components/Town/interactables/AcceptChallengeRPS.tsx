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
import { useChallengeReceived } from '../../../classes/TownController';
import useTownController from '../../../hooks/useTownController';

export default function AcceptChallengeRPS(): JSX.Element {
  const coveyTownController = useTownController();
  const newPotentialChallenger = useChallengeReceived();
  const player = coveyTownController.ourPlayer;

  const potentialChallengerController = coveyTownController.players.find(p => {
    if (newPotentialChallenger) {
      return p.id === newPotentialChallenger;
    }
  });

  const closeModal = useCallback(() => {
    coveyTownController.unPause();
    if (potentialChallengerController) {
      coveyTownController.removeChallengeRequestAgainstPlayer(player);
    }
  }, [coveyTownController, player, potentialChallengerController]);

  const toast = useToast();

  const isOpen = newPotentialChallenger !== undefined;

  const challengerUsername = coveyTownController.players.find(
    p => p.id === newPotentialChallenger,
  )?.userName;

  const acceptRPSChallenge = useCallback(async () => {
    try {
      if (newPotentialChallenger) {
        await coveyTownController.startRPS({
          challengee: player.id,
          challenger: newPotentialChallenger,
          response: true,
        });
      }

      toast({
        title: 'Challenge Accepted!',
        status: 'success',
      });
      coveyTownController.unPause();
      closeModal();
    } catch (err) {
      if (err instanceof Error) {
        toast({
          title: 'Unable to accept challenge',
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
  }, [closeModal, player, coveyTownController, toast, newPotentialChallenger]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        closeModal();
        coveyTownController.unPause();
      }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {challengerUsername} challenges you to a game of Rock Paper Scissors. Do you accept?
        </ModalHeader>
        <ModalCloseButton />
        <ModalFooter>
          <Button colorScheme='blue' mr={3} onClick={acceptRPSChallenge}>
            Accept Challenge
          </Button>
          <Button onClick={closeModal}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
