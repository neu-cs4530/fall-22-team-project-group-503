import assert from 'assert';
import EventEmitter from 'events';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import TypedEmitter from 'typed-emitter';
import Interactable from '../components/Town/Interactable';
import ViewingArea from '../components/Town/interactables/ViewingArea';
import { LoginController } from '../contexts/LoginControllerContext';
import { TownsService, TownsServiceClient } from '../generated/client';
import useTownController from '../hooks/useTownController';
import { RPSPlayerMove } from '../types/CoveyTownSocket';
import {
  ChatMessage,
  CoveyTownSocket,
  PlayerLocation,
  RPSChallenge,
  RPSResult,
  TownSettingsUpdate,
  ViewingArea as ViewingAreaModel,
} from '../types/CoveyTownSocket';
import { isConversationArea, isViewingArea } from '../types/TypeUtils';
import ConversationAreaController from './ConversationAreaController';
import PlayerController from './PlayerController';
import RPS from './RPS';
import ViewingAreaController from './ViewingAreaController';

const CALCULATE_NEARBY_PLAYERS_DELAY = 300;

export type ConnectionProperties = {
  userName: string;
  townID: string;
  loginController: LoginController;
};

/**
 * The TownController emits these events. Components may subscribe to these events
 * by calling the `addListener` method on a TownController
 */
export type TownEvents = {
  /**
   * An event that indicates that the TownController is now connected to the townService
   * @param providerVideoToken a secret token that can be used to connect to the video service
   */
  connect: (providerVideoToken: string) => void;
  /**
   * An event that indicates that the TownController has been disconnected from the townService
   */
  disconnect: () => void;
  /**
   * An event that indicates that the town settings have been updated. This event is dispatched
   * before updating the properties of this TownController; clients may find the new settings in the parameter
   */
  townSettingsUpdated: (newTownSettings: TownSettingsUpdate) => void;
  /**
   * An event that indicates that the set of players in the town has changed. This event is dispatched
   * before updating the proeprties of this TownController; clients will find the new players in the parameter
   */
  playersChanged: (newPlayers: PlayerController[]) => void;
  /**
   * An event that indicates that a player has moved. This event is dispatched after updating the player's location -
   * the new location can be found on the PlayerController.
   */
  playerMoved: (movedPlayer: PlayerController) => void;
  /**
   * An event that indicates that a game has ended. This event is dispatched after updating the player's location -
   * the new score can be found on the PlayerController.
   */
  rpsGameEnded: (update: RPSResult) => void;
  /**
   * An event that indicates that a player score has changed. This event is dispatched after updating the player's location -
   * the new score can be found on the PlayerController.
   */
  playerScoreUpdated: (update: RPSResult) => void;
  /**
   * An event that indicates that the set of conversation areas has changed. This event is dispatched
   * when a conversation area is created, or when the set of active conversations has changed. This event is dispatched
   * after updating the town controller's record of conversation areas.
   */
  conversationAreasChanged: (currentConversationAreas: ConversationAreaController[]) => void;
  /**
   * An event that indicates that the set of viewing areas has changed. This event is emitted after updating
   * the town controller's record of viewing areas.
   */
  viewingAreasChanged: (newViewingAreas: ViewingAreaController[]) => void;
  /**
   * An event that indicates that a new chat message has been received, which is the parameter passed to the listener
   */
  chatMessage: (message: ChatMessage) => void;
  /**
   * An event that indicates that the 2D game is now paused. Pausing the game should, if nothing else,
   * release all key listeners, so that text entry is possible
   */
  pause: () => void;
  /**
   * An event that indicates that the 2D game should now be unpaused (resumed).
   */
  unPause: () => void;
  /**
   * An event that indicates that the player is now interacting with a different interactable
   * @param typeName the type of interactable
   * @param obj the interactable that is being interacted with
   */
  interact: <T extends Interactable>(typeName: T['name'], obj: T) => void;

  /**
   * This is subject to change, but when selecting a player to challenge (clicking on another avatar which triggers the confirmation popup), this event gets emitted
   */
  rpsChallengeCreated: (player: PlayerController) => void;

  /**
   * This is subject to change, but when the popup modal dissappears due to the player cancelling, the challenge is destroyed.
   */
  rpsChallengeRemoved: (player: PlayerController) => void;

  /**
   * An event that indicates that an RPS challenge has been sent.
   * The event is dispatched when a user clicks on another user's sprite.
   * The challenge is passed as a parameter.
   */
  rpsChallengeSent: (challenge: RPSChallenge) => void;

  /**
   * An event that indicates that the current player has received a challenge from another player. This event is dispatched when another
   * user clicks on this user's sprite and confirms they want to challenge them. The challenge is passed as a parameter.
   */
  rpsChallengeReceived: (challenge: RPSChallenge) => void;

  /**
   * An event that indicates that an RPS game has changed. This event is emitted after updating
   * receiving user input from a user either creating a game of RPS or while playing the game.
   */
  rpsGameChanged: (changedRPS: RPSChallenge) => void;

  /**
   * An event that indicates that an player has made a move in a game of RPS. The event is emitted after receiving user input of the user choosing rock, paper, or scissors.
   */
  rpsPlayerMove: (move: RPSPlayerMove) => void;
};

/**
 * The (frontend) TownController manages the communication between the frontend
 * and the backend. When a player join a town, a new TownController is created,
 * and frontend components can register to receive events (@see CoveyTownEvents).
 *
 * To access the TownController from a React component, use the
 * useTownController hook (@see useTownController). While the town controller
 * can be directly used by React components, it is generally preferable to use the various hooks
 * defined in this file (e.g. @see usePlayers, @see useConversationAreas), which will automatically
 * subscribe to updates to their respective data, triggering the React component that consumes them
 * to re-render when the underlying data changes.
 *
 */
export default class TownController extends (EventEmitter as new () => TypedEmitter<TownEvents>) {
  /** The socket connection to the townsService. Messages emitted here
   * are received by the TownController in that service.
   */
  private _socket: CoveyTownSocket;

  /**
   * The REST API client to access the townsService
   */
  private _townsService: TownsService;

  /**
   * The login controller is used by the frontend application to manage logging in to a town,
   * and is also used to log out of a town.
   */
  private _loginController: LoginController;

  /**
   * The current list of players in the town. Adding or removing players might replace the array
   * with a new one; clients should take note not to retain stale references.
   */
  private _playersInternal: PlayerController[] = [];

  /**
   * The current list of conversation areas in the twon. Adding or removing conversation areas might
   * replace the array with a new one; clients should take note not to retain stale references.
   */
  private _conversationAreasInternal: ConversationAreaController[] = [];

  /**
   * The friendly name of the current town, set only once this TownController is connected to the townsService
   */
  private _friendlyNameInternal?: string;

  /**
   * The town ID of the current town, generated by the backend townsService and used to uniquely identify this town with the
   * server and other players
   */
  private readonly _townID: string;

  /**
   * If true, then this town's friendlyName and townID are included in the public listing of active towns.
   * Changes to this variable do not influence the behavior of the server, it must be changed through the townsService API client
   */
  private _townIsPubliclyListedInternal = false;

  /**
   * The username of the player whose browser created this TownController
   */
  private readonly _userName: string;

  /**
   * The user ID of the player whose browser created this TownController. The user ID is set by the backend townsService, and
   * is only available after the service is connected.
   */
  private _userID?: string;

  /**
   * A reference to the Player object that represents the player whose browser created this TownController.
   */
  private _ourPlayer?: PlayerController;

  /**
   * A secret token that is provided by the townsService when we connect, and is needed
   * for authenticating future API calls as being from the same user who created this TownController.
   */
  private _sessionToken?: string;

  /**
   * A secret token that is provided by the townsService when we connect, and can be used to connect
   * to a third-party video conferecing service.
   */
  private _providerVideoToken?: string;

  /**
   * A flag indicating whether the current 2D game is paused, or not. Pausing the game will prevent it from updating,
   * and will also release any key bindings, allowing all keys to be used for text entry or other purposes.
   */
  private _paused = false;

  /**
   * An event emitter that broadcasts interactable-specific events
   */
  private _interactableEmitter = new EventEmitter();

  private _viewingAreas: ViewingAreaController[] = [];

  // private _rpsGames: RPS[] = [];

  private _rpsGame: RPS | undefined;

  public constructor({ userName, townID, loginController }: ConnectionProperties) {
    super();
    this._townID = townID;
    this._userName = userName;
    this._loginController = loginController;

    /*
        The event emitter will show a warning if more than this number of listeners are registered, as it
        may indicate a leak (listeners that should de-register not de-registering). The default is 10; we expect
        more than 10 listeners because each conversation area might be its own listener, and there are more than 10
        */
    this.setMaxListeners(30);

    const url = process.env.REACT_APP_TOWNS_SERVICE_URL;
    assert(url);
    this._socket = io(url, { auth: { userName, townID } });
    this._townsService = new TownsServiceClient({ BASE: url }).towns;
    this.registerSocketListeners();
  }

  public get sessionToken() {
    return this._sessionToken || '';
  }

  public get userID() {
    const id = this._userID;
    assert(id);
    return id;
  }

  public get townIsPubliclyListed() {
    return this._townIsPubliclyListedInternal;
  }

  private set _townIsPubliclyListed(newSetting: boolean) {
    this._townIsPubliclyListedInternal = newSetting;
    this.emit('townSettingsUpdated', { isPubliclyListed: newSetting });
  }

  public get providerVideoToken() {
    const token = this._providerVideoToken;
    assert(token);
    return token;
  }

  public get userName() {
    return this._userName;
  }

  public get friendlyName() {
    const friendlyName = this._friendlyNameInternal;
    assert(friendlyName);
    return friendlyName;
  }

  private set _friendlyName(newFriendlyName: string) {
    this._friendlyNameInternal = newFriendlyName;
    this.emit('townSettingsUpdated', { friendlyName: newFriendlyName });
  }

  public get paused() {
    return this._paused;
  }

  public get ourPlayer() {
    const ret = this._ourPlayer;
    assert(ret);
    return ret;
  }

  public get townID() {
    return this._townID;
  }

  public pause(): void {
    if (!this._paused) {
      this._paused = true;
      this.emit('pause');
    }
  }

  public unPause(): void {
    if (this._paused) {
      this._paused = false;
      this.emit('unPause');
    }
  }

  public get players(): PlayerController[] {
    return this._playersInternal;
  }

  private set _players(newPlayers: PlayerController[]) {
    this.emit('playersChanged', newPlayers);
    this._playersInternal = newPlayers;
  }

  public get conversationAreas() {
    return this._conversationAreasInternal;
  }

  private set _conversationAreas(newConversationAreas: ConversationAreaController[]) {
    this._conversationAreasInternal = newConversationAreas;
    this.emit('conversationAreasChanged', newConversationAreas);
  }

  public get interactableEmitter() {
    return this._interactableEmitter;
  }

  public get viewingAreas() {
    return this._viewingAreas;
  }

  public set viewingAreas(newViewingAreas: ViewingAreaController[]) {
    this._viewingAreas = newViewingAreas;
    this.emit('viewingAreasChanged', newViewingAreas);
  }

  public get rpsGame(): RPS | undefined {
    return this._rpsGame;
  }

  public set rpsGame(newRPS: RPS | undefined) {
    this._rpsGame = newRPS;
  }

  /**
   * Begin interacting with an interactable object. Emits an event to all listeners.
   * @param interactedObj
   */
  public interact<T extends Interactable>(interactedObj: T) {
    this._interactableEmitter.emit(interactedObj.getType(), interactedObj);
  }

  /**
   * End interacting with an interactable object. Emits an event to all listeners.
   * @param objectNoLongerInteracting
   */
  public interactEnd(objectNoLongerInteracting: Interactable) {
    this._interactableEmitter.emit('endInteraction', objectNoLongerInteracting);
  }

  /**
   * Registers listeners for the events that can come from the server to our socket
   */
  registerSocketListeners() {
    /**
     * On chat messages, forward the messages to listeners who subscribe to the controller's events
     */
    this._socket.on('chatMessage', message => {
      this.emit('chatMessage', message);
    });
    /**
     * On changes to town settings, update the local state and emit a townSettingsUpdated event to
     * the controller's event listeners
     */
    this._socket.on('townSettingsUpdated', update => {
      const newFriendlyName = update.friendlyName;
      if (newFriendlyName !== undefined) {
        this._friendlyName = newFriendlyName;
      }
      if (update.isPubliclyListed !== undefined) {
        this._townIsPubliclyListed = update.isPubliclyListed;
      }
    });
    /**
     * On town closing events, emit a disconnect message to the controller's event listeners, and
     * return to the login screen
     */
    this._socket.on('townClosing', () => {
      this.emit('disconnect');
      this._loginController.setTownController(null);
    });
    /**
     * When a new player joins the town, update our local state of players in the town and notify
     * the controller's event listeners that the player has moved to their starting location.
     *
     * Note that setting the players array will also emit an event that the players in the town have changed.
     */
    this._socket.on('playerJoined', newPlayer => {
      const newPlayerObj = PlayerController.fromPlayerModel(newPlayer);
      this._players = this.players.concat([newPlayerObj]);
      this.emit('playerMoved', newPlayerObj);
    });
    /**
     * When a player disconnects from the town, update local state
     *
     * Note that setting the players array will also emit an event that the players in the town have changed.
     */
    this._socket.on('playerDisconnect', disconnectedPlayer => {
      this._players = this.players.filter(eachPlayer => eachPlayer.id !== disconnectedPlayer.id);
    });
    /**
     * When a player moves, update local state and emit an event to the controller's event listeners
     */
    this._socket.on('playerMoved', movedPlayer => {
      const playerToUpdate = this.players.find(eachPlayer => eachPlayer.id === movedPlayer.id);
      if (playerToUpdate) {
        if (playerToUpdate === this._ourPlayer) {
          /*
           * If we are told that WE moved, we shouldn't update our x,y because it's probably lagging behind
           * real time. However: we SHOULD update our interactable ID, because its value is managed by the server
           */
          playerToUpdate.location.interactableID = movedPlayer.location.interactableID;
        } else {
          playerToUpdate.location = movedPlayer.location;
        }
        this.emit('playerMoved', playerToUpdate);
      } else {
        const newPlayer = PlayerController.fromPlayerModel(movedPlayer);
        this._players = this.players.concat(newPlayer);
        this.emit('playerMoved', newPlayer);
      }
    });

    /**
     * When an interactable's state changes, push that update into the relevant controller, which is assumed
     * to be either a Viewing Area or a Conversation Area, and which is assumed to already be represented by a
     * ViewingAreaController or ConversationAreaController that this TownController has.
     *
     * If a conversation area transitions from empty to occupied (or occupied to empty), this handler will emit
     * a conversationAreasChagned event to listeners of this TownController.
     *
     * If the update changes properties of the interactable, the interactable is also expected to emit its own
     * events (@see ViewingAreaController and @see ConversationAreaController)
     */
    this._socket.on('interactableUpdate', interactable => {
      if (isConversationArea(interactable)) {
        const updatedConversationArea = this.conversationAreas.find(c => c.id === interactable.id);
        if (updatedConversationArea) {
          const emptyNow = updatedConversationArea.isEmpty();
          updatedConversationArea.topic = interactable.topic;
          updatedConversationArea.occupants = this._playersByIDs(interactable.occupantsByID);
          const emptyAfterChange = updatedConversationArea.isEmpty();
          if (emptyNow !== emptyAfterChange) {
            this.emit('conversationAreasChanged', this._conversationAreasInternal);
          }
        }
      } else if (isViewingArea(interactable)) {
        const updatedViewingArea = this._viewingAreas.find(
          eachArea => eachArea.id === interactable.id,
        );
        updatedViewingArea?.updateFrom(interactable);
      }
    });

    /**
     * send challenge
     */
    this._socket.on('rpsChallengeSent', challenge => {
      if (challenge.challengee === this.userID) {
        this.emit('rpsChallengeReceived', challenge);
      } else {
        this.emit('rpsChallengeSent', challenge);
      }
    });

    this._socket.on('rpsGameEnded', gameResult => {
      this.emit('rpsGameEnded', gameResult);
    });

    this._socket.on('rpsGameChanged', rpsGame => {
      this.emit('rpsGameChanged', rpsGame);
    });

    this._socket.on('rpsPlayerMove', rpsMove => {
      if (this.rpsGame) {
        this.rpsGame.updateFrom(rpsMove);
        this._attemptToFinishGame(this._rpsGame);
      }
    });
  }

  /**
   * Emit a movement event for the current player, updating the state locally and
   * also notifying the townService that our player moved.
   *
   * Note: it is the responsibility of the townService to set the 'interactableID' parameter
   * of the player's location, and any interactableID set here may be overwritten by the townService
   *
   * @param newLocation
   */
  public emitMovement(newLocation: PlayerLocation) {
    this._socket.emit('playerMovement', newLocation);
    const ourPlayer = this._ourPlayer;
    assert(ourPlayer);
    ourPlayer.location = newLocation;
    this.emit('playerMoved', ourPlayer);
  }

  private _attemptToFinishGame(game: RPS | undefined) {
    if (game && game.readyToComplete()) {
      const newGameResult = game.calculateWinnerFromMoves();
      this._socket.emit('rpsGameEnded', newGameResult);
      this._rpsGame = undefined;
    }
  }

  /**
   * Emit a challenge created event against the potatential opponent.
   * @param potentialOpponent
   */
  createChallengeRequestAgainstPlayer(potentialOpponent: PlayerController) {
    this.emit('rpsChallengeCreated', potentialOpponent);
  }

  /**
   * Emit a challenge remove event against the potatential opponent.
   * @param potentialOpponent
   */
  removeChallengeRequestAgainstPlayer(potentialOpponent: PlayerController) {
    this.emit('rpsChallengeRemoved', potentialOpponent);
  }

  removeRPSGame(game: RPSChallenge | undefined) {
    if (game) {
      game.response = false;
      this.emit('rpsGameChanged', game);
    }
  }

  completeGame(game: RPSChallenge) {
    this.emit('rpsGameChanged', game);
  }

  submitMove(move: RPSPlayerMove) {
    if (move.opponent === this.userID || move.player === this.userID) {
      const newGame = this._rpsGame;
      this._socket.emit('rpsPlayerMove', move);
      if (newGame) {
        newGame.updateFrom(move);
        this._attemptToFinishGame(newGame);
      }
    }
  }

  /**
   * Emit a challenge event for the current player to the given player
   *
   * @param player
   */
  challengePlayer(player: PlayerController) {
    this._socket.emit('rpsChallengeSent', {
      challenger: this.ourPlayer.id,
      challengee: player.id,
      response: false,
    });
  }

  /**
   * Emit a chat message to the townService
   *
   * @param message
   */
  public emitChatMessage(message: ChatMessage) {
    this._socket.emit('chatMessage', message);
  }

  /**
   * Starts the RPS game.
   *
   * @param response
   * @return RPSnew game if response is true.
   */
  public async startRPS(response: RPSChallenge): Promise<RPS | undefined> {
    if (response) {
      const challenger = this.players.find(p => p.id === response.challenger);
      const challengee = this.players.find(p => p.id === response.challengee);

      if (challenger !== undefined && challengee !== undefined) {
        const newGame = new RPS(challenger.id, challengee.id);
        this._rpsGame = newGame;
        response.response = true;
        this._socket.emit('rpsGameChanged', response); // we need to make sure this works and emits correctly, since the PlayerControlleres did not work when emitted
        return newGame;
      }
    }
    return undefined;
  }

  /**
   * Update the settings of the current town. Sends the request to update the settings to the townService,
   * and does not update the local model. If the update is successful, then the townService will inform us
   * of the updated settings. Throws an error if the request is not successful.
   *
   * @param roomUpdatePassword
   * @param updatedSettings
   */
  async updateTown(
    roomUpdatePassword: string,
    updatedSettings: { isPubliclyListed: boolean; friendlyName: string },
  ) {
    await this._townsService.updateTown(this._townID, roomUpdatePassword, updatedSettings);
  }

  /**
   * Delete the current town. Sends the request to the townService, and sends an error if the request is
   * not successful
   *
   * @param roomUpdatePassword
   */
  async deleteTown(roomUpdatePassword: string) {
    await this._townsService.deleteTown(this._townID, roomUpdatePassword);
  }

  /**
   * Create a new conversation area, sending the request to the townService. Throws an error if the request
   * is not successful. Does not immediately update local state about the new conversation area - it will be
   * updated once the townService creates the area and emits an interactableUpdate
   *
   * @param newArea
   */
  async createConversationArea(newArea: {
    topic?: string;
    id: string;
    occupantsByID: Array<string>;
  }) {
    await this._townsService.createConversationArea(this.townID, this.sessionToken, newArea);
  }

  /**
   * Create a new viewing area, sending the request to the townService. Throws an error if the request
   * is not successful. Does not immediately update local state about the new viewing area - it will be
   * updated once the townService creates the area and emits an interactableUpdate
   *
   * @param newArea
   */
  async createViewingArea(newArea: ViewingAreaModel) {
    await this._townsService.createViewingArea(this.townID, this.sessionToken, newArea);
  }

  /**
   * Disconnect from the town, notifying the townService that we are leaving and returning
   * to the login page
   */
  public disconnect() {
    this._socket.disconnect();
    this._loginController.setTownController(null);
  }

  /**
   * Connect to the townService. Throws an error if it is unable to connect
   * @returns
   */
  public async connect() {
    /*
         The connection is only valid if we receive an 'initialize' callback, and is invalid if the disconnect
         handler is called. Wrap the return of connect in a promise that is resolved upon initialize or rejected
         upon disconnect.
         */
    return new Promise<void>((resolve, reject) => {
      this._socket.connect();
      this._socket.on('initialize', initialData => {
        this._providerVideoToken = initialData.providerVideoToken;
        this._friendlyNameInternal = initialData.friendlyName;
        this._townIsPubliclyListedInternal = initialData.isPubliclyListed;
        this._sessionToken = initialData.sessionToken;
        this._players = initialData.currentPlayers.map(eachPlayerModel =>
          PlayerController.fromPlayerModel(eachPlayerModel),
        );

        this._conversationAreas = [];
        this._viewingAreas = [];
        initialData.interactables.forEach(eachInteractable => {
          if (isConversationArea(eachInteractable)) {
            this._conversationAreasInternal.push(
              ConversationAreaController.fromConversationAreaModel(
                eachInteractable,
                this._playersByIDs.bind(this),
              ),
            );
          } else if (isViewingArea(eachInteractable)) {
            this._viewingAreas.push(new ViewingAreaController(eachInteractable));
          }
        });
        this._userID = initialData.userID;
        this._ourPlayer = this.players.find(eachPlayer => eachPlayer.id == this.userID);
        this.emit('connect', initialData.providerVideoToken);
        resolve();
      });
      this._socket.on('disconnect', () => {
        reject(new Error('Invalid town ID'));
      });
    });
  }

  /**
   * Retrieve the viewing area controller that corresponds to a viewingAreaModel, creating one if necessary
   *
   * @param viewingArea
   * @returns
   */
  public getViewingAreaController(viewingArea: ViewingArea): ViewingAreaController {
    const existingController = this._viewingAreas.find(
      eachExistingArea => eachExistingArea.id === viewingArea.name,
    );
    if (existingController) {
      return existingController;
    } else {
      const newController = new ViewingAreaController({
        elapsedTimeSec: 0,
        id: viewingArea.name,
        isPlaying: false,
        video: viewingArea.defaultVideoURL,
      });
      this._viewingAreas.push(newController);
      return newController;
    }
  }

  /**
   * Emit a viewing area update to the townService
   * @param viewingArea The Viewing Area Controller that is updated and should be emitted
   *    with the event
   */
  public emitViewingAreaUpdate(viewingArea: ViewingAreaController) {
    this._socket.emit('interactableUpdate', viewingArea.viewingAreaModel());
  }

  /**
   * Determine which players are "nearby" -- that they should be included in our video call
   */
  public nearbyPlayers(): PlayerController[] {
    const isNearby = (p: PlayerController) => {
      if (p.location && this.ourPlayer.location) {
        if (this.ourPlayer.location.interactableID || p.location.interactableID) {
          return p.location.interactableID === this.ourPlayer.location.interactableID;
        }
        const dx = p.location.x - this.ourPlayer.location.x;
        const dy = p.location.y - this.ourPlayer.location.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        return d < 80;
      }
      return false;
    };
    return this.players.filter(p => isNearby(p));
  }

  private _playersByIDs(playerIDs: string[]): PlayerController[] {
    return this._playersInternal.filter(eachPlayer => playerIDs.includes(eachPlayer.id));
  }
}

/**
 * A react hook to retrieve the settings for this town
 *
 * This hook will cause components that use it to re-render when the settings change.
 *
 * This hook relies on the TownControllerContext.
 * @returns an object with the properties "friendlyName" and "isPubliclyListed",
 *  representing the current settings of the current town
 */
export function useTownSettings() {
  const townController = useTownController();
  const [friendlyName, setFriendlyName] = useState<string>(townController.friendlyName);
  const [isPubliclyListed, setIsPubliclyListed] = useState<boolean>(
    townController.townIsPubliclyListed,
  );
  useEffect(() => {
    const updateTownSettings = (update: TownSettingsUpdate) => {
      const newName = update.friendlyName;
      const newPublicSetting = update.isPubliclyListed;
      if (newName !== undefined) {
        setFriendlyName(newName);
      }
      if (newPublicSetting !== undefined) {
        setIsPubliclyListed(newPublicSetting);
      }
    };
    townController.addListener('townSettingsUpdated', updateTownSettings);
    return () => {
      townController.removeListener('townSettingsUpdated', updateTownSettings);
    };
  }, [townController]);
  return { friendlyName, isPubliclyListed };
}

/**
 * A react hook to show a player who just challenged them.
 *
 * This hook will cause components that use it to re-render when the settings change.
 *
 * This hook relies on the TownControllerContext.
 * @returns a RPSChallenge object,
 *  representing the current settings of the current town
 */
export function useChallengeReceived(): string | undefined {
  const townController = useTownController();
  const [challenger, setChallenger] = useState<string>();
  useEffect(() => {
    const challengeHandler = (rpsEvent: RPSChallenge) => {
      if (rpsEvent.challengee === townController.ourPlayer.id) {
        setChallenger(rpsEvent.challenger);
      }
    };
    const challengeRemovalHandler = (challengerPlayer: PlayerController) => {
      if (challengerPlayer.id === townController.ourPlayer.id) {
        setChallenger(undefined);
      }
    };
    townController.addListener('rpsChallengeReceived', challengeHandler);
    townController.addListener('rpsChallengeRemoved', challengeRemovalHandler);
    return () => {
      townController.removeListener('rpsChallengeReceived', challengeHandler);
      townController.removeListener('rpsChallengeRemoved', challengeRemovalHandler);
    };
  }, [townController, setChallenger, challenger]);
  return challenger;
}

/**
 * A react hook that retrieves a game of RPS that this player is a part of. Relies on TownControllerContext.
 * @return the RPS game
 */
export function useIsInRPSGame() {
  const townController = useTownController();
  const [rpsGame, setRPSGame] = useState<RPSChallenge | undefined>();

  useEffect(() => {
    const rpsHandler = (updatedGame: RPSChallenge) => {
      if (
        (updatedGame.challengee === townController.ourPlayer.id ||
          updatedGame.challenger === townController.ourPlayer.id) &&
        updatedGame.response
      ) {
        setRPSGame(updatedGame);
      } else if (updatedGame.response === false) {
        setRPSGame(undefined);
      }
    };
    const rpsRemove = () => {
      setRPSGame(undefined);
    };
    townController.addListener('rpsGameChanged', rpsHandler);
    townController.addListener('rpsPlayerMove', rpsRemove);
    return () => {
      townController.removeListener('rpsGameChanged', rpsHandler);
      townController.removeListener('rpsPlayerMove', rpsRemove);
    };
  }, [townController, setRPSGame]);
  return rpsGame;
}

/**
 * A react hook that retrieves the potential opponent. Relies on TownControllerContext.
 * @return the potential opponent
 */
export function usePotentialOpponent(): PlayerController | undefined {
  const townController = useTownController();
  const [potentialOpponent, setPotentialOpponent] = useState<PlayerController>();

  useEffect(() => {
    const opponentHandler = (opponent: PlayerController) => {
      setPotentialOpponent(opponent);
    };
    const removeOpponentHandler = (opponent: PlayerController) => {
      if (opponent === potentialOpponent) {
        setPotentialOpponent(undefined);
      }
    };
    townController.addListener('rpsChallengeCreated', opponentHandler);
    townController.addListener('rpsChallengeRemoved', removeOpponentHandler);
    return () => {
      townController.removeListener('rpsChallengeCreated', opponentHandler);
      townController.addListener('rpsChallengeRemoved', removeOpponentHandler);
    };
  }, [townController, setPotentialOpponent, potentialOpponent]);
  return potentialOpponent;
}

/**
 * A react hook that retrieves the result of an RPS match that our player is a part of. Relies on TownControllerContext
 * @returns the result of an RPS game
 */
export function useRPSResult() {
  const townController = useTownController();
  const [result, setResult] = useState<RPSResult>();

  useEffect(() => {
    const resultHandler = (newResult: RPSResult) => {
      if (
        newResult.winner === townController.ourPlayer.id ||
        newResult.loser === townController.ourPlayer.id
      ) {
        setResult(newResult);
      }
    };
    townController.addListener('rpsGameEnded', resultHandler);
    return () => {
      townController.removeListener('rpsGameEnded', resultHandler);
    };
  });
  return result;
}

/**
 * A react hook to retrieve a viewing area controller.
 *
 * This function will throw an error if the viewing area controller does not exist.
 *
 * This hook relies on the TownControllerContext.
 *
 * @param viewingAreaID The ID of the viewing area to retrieve the controller for
 *
 * @throws Error if there is no viewing area controller matching the specifeid ID
 */
export function useViewingAreaController(viewingAreaID: string): ViewingAreaController {
  const townController = useTownController();

  const viewingArea = townController.viewingAreas.find(eachArea => eachArea.id == viewingAreaID);
  if (!viewingArea) {
    throw new Error(`Requested viewing area ${viewingAreaID} does not exist`);
  }
  return viewingArea;
}

/**
 * A react hook to retrieve the active conversation areas. This hook will re-render any components
 * that use it when the set of conversation areas changes. It does *not* re-render its dependent components
 * when the state of one of those areas changes - if that is desired, @see useConversationAreaTopic and @see useConversationAreaOccupants
 *
 * This hook relies on the TownControllerContext.
 *
 * @returns the list of conversation area controllers that are currently "active"
 */
export function useActiveConversationAreas(): ConversationAreaController[] {
  const townController = useTownController();
  const [conversationAreas, setConversationAreas] = useState<ConversationAreaController[]>(
    townController.conversationAreas.filter(eachArea => !eachArea.isEmpty()),
  );
  useEffect(() => {
    const updater = (allAreas: ConversationAreaController[]) => {
      setConversationAreas(allAreas.filter(eachArea => !eachArea.isEmpty()));
    };
    townController.addListener('conversationAreasChanged', updater);
    return () => {
      townController.removeListener('conversationAreasChanged', updater);
    };
  }, [townController, setConversationAreas]);
  return conversationAreas;
}

/**
 * A react hook to return the PlayerController's corresponding to each player in the town after a score update.
 *
 * This hook will cause components that use it to re-render when the score of players in the town changes.
 *
 * This hook will *not* trigger re-renders if a player moves.
 *
 * This hook relies on the TownControllerContext.
 *
 * @returns an array of PlayerController's, representing the current set of players in the town
 */
export function useLeaderboard(): PlayerController[] {
  const townController = useTownController();
  function top10(players: PlayerController[]) {
    players.sort((a, b) => b.score - a.score);
    return players.slice(0, 10);
  }

  const [leaderboard, setLeaderboard] = useState<PlayerController[]>(top10(townController.players));

  useEffect(() => {
    const updateLeaderboard = () => {
      setLeaderboard(top10(townController.players));
    };

    townController.addListener('playerScoreUpdated', updateLeaderboard);
    return () => {
      townController.removeListener('playerScoreUpdated', updateLeaderboard);
    };
  }, [townController, setLeaderboard]);
  return leaderboard;
}

/**
 * A react hook to return the PlayerController's corresponding to each player in the town.
 *
 * This hook will cause components that use it to re-render when the set of players in the town changes.
 *
 * This hook will *not* trigger re-renders if a player moves.
 *
 * This hook relies on the TownControllerContext.
 *
 * @returns an array of PlayerController's, representing the current set of players in the town
 */
export function usePlayers(): PlayerController[] {
  const townController = useTownController();
  const [players, setPlayers] = useState<PlayerController[]>(townController.players);
  useEffect(() => {
    townController.addListener('playersChanged', setPlayers);
    return () => {
      townController.removeListener('playersChanged', setPlayers);
    };
  }, [townController, setPlayers]);
  return players;
}

function samePlayers(a1: PlayerController[], a2: PlayerController[]) {
  if (a1.length !== a2.length) return false;
  const ids1 = a1.map(p => p.id).sort();
  const ids2 = a2.map(p => p.id).sort();
  return _.isEqual(ids1, ids2);
}

/**
 * A react hook to retrieve the interactable that is *currently* be interacted with by the player in this frontend.
 * A player is "interacting" with the Interactable if they are within it, and press the spacebar.
 *
 * This hook will cause any component that uses it to re-render when the object that the player is interacting with changes.
 *
 * This hook relies on the TownControllerContext.
 *
 * @param interactableType
 */
export function useInteractable<T extends Interactable>(
  interactableType: T['name'],
): T | undefined {
  const townController = useTownController();
  const [interactable, setInteractable] = useState<T | undefined>(undefined);
  useEffect(() => {
    const onInteract = (interactWith: T) => {
      setInteractable(interactWith);
    };
    const offInteract = () => {
      setInteractable(undefined);
    };
    townController.interactableEmitter.on(interactableType, onInteract);
    townController.interactableEmitter.on('endInteraction', offInteract);

    return () => {
      townController.interactableEmitter.off(interactableType, onInteract);
      townController.interactableEmitter.off('endInteraction', offInteract);
    };
  }, [interactableType, townController, setInteractable]);
  return interactable;
}
/**
 * A react hook to retrieve the players that should be included in the video call
 *
 * This hook will cause components that  use it to re-render when the set of players in the video call changes.
 *
 * This hook relies on the TownControllerContext.
 * @returns
 */
export function usePlayersInVideoCall(): PlayerController[] {
  const townController = useTownController();
  const [playersInCall, setPlayersInCall] = useState<PlayerController[]>([]);
  useEffect(() => {
    let lastRecalculatedNearbyPlayers = 0;
    let prevNearbyPlayers: PlayerController[] = [];
    const updatePlayersInCall = () => {
      const now = Date.now();
      // To reduce re-renders, only recalculate the nearby players every so often
      if (now - lastRecalculatedNearbyPlayers > CALCULATE_NEARBY_PLAYERS_DELAY) {
        lastRecalculatedNearbyPlayers = now;
        const nearbyPlayers = townController.nearbyPlayers();
        if (!samePlayers(nearbyPlayers, prevNearbyPlayers)) {
          prevNearbyPlayers = nearbyPlayers;
          setPlayersInCall(nearbyPlayers);
        }
      }
    };
    townController.addListener('playerMoved', updatePlayersInCall);
    townController.addListener('playersChanged', updatePlayersInCall);
    updatePlayersInCall();
    return () => {
      townController.removeListener('playerMoved', updatePlayersInCall);
      townController.removeListener('playersChanged', updatePlayersInCall);
    };
  }, [townController, setPlayersInCall]);
  return playersInCall;
}
