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
import { usePotentialOpponent } from '../../../classes/TownController';
import useTownController from '../../../hooks/useTownController';

export default function ChallengePlayerRPS(): JSX.Element {
  const coveyTownController = useTownController();
  let potentialOpponent = usePotentialOpponent();
  //   const [player, setPlayer] = useState<PlayerController>(coveyTownController.ourPlayer);

  // get the challenge player (from TownGameScene.ts line 503 `createPlayerSprites`)
  // set to `potentialOpponent`

  const isOpen = potentialOpponent !== undefined;
  const closeModal = useCallback(() => {
    coveyTownController.unPause();
    close();
    potentialOpponent = undefined;
  }, [coveyTownController]);

  const toast = useToast();

  const createRPSChallenge = useCallback(async () => {
    try {
      if (potentialOpponent) {
        await coveyTownController.challengePlayer(potentialOpponent);
      }
      toast({
        title: 'Challenge Sent!',
        status: 'success',
      });
      coveyTownController.unPause();
      closeModal();
    } catch (err) {
      if (err instanceof Error) {
        toast({
          title: 'Unable to create RPS Challenge',
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
  }, [closeModal, potentialOpponent, coveyTownController, toast]);

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
          Challenge {potentialOpponent ? potentialOpponent.userName : 'ERROR'} to Rock Paper
          Scissors
        </ModalHeader>
        <ModalCloseButton />
        <ModalFooter>
          <Button colorScheme='blue' mr={3} onClick={createRPSChallenge}>
            Challenge
          </Button>
          <Button onClick={closeModal}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
