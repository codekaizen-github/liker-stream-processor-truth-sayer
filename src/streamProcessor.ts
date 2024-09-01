import { createStreamOutFromStreamEvent } from './streamOutStore';
import { notifySubscribers } from './subscriptions';
import { Database, NewStreamEvent } from './types';
import { Transaction } from 'kysely';
import { createUser, findUserByEmail } from './userStore';
import { createGame, findGameById, updateGame } from './gameStore';

export async function processStreamEvent(
    trx: Transaction<Database>,
    newStreamEvent: NewStreamEvent
) {
    const newStreamEventData = newStreamEvent.data;
    switch (newStreamEventData.type) {
        case 'user-login-intended': {
            const userEmail = newStreamEventData.payload.user.email;
            const existingUser = await findUserByEmail(trx, userEmail);
            if (existingUser === undefined) {
                const newUser = await createUser(trx, {
                    email: userEmail,
                });
                if (newUser === undefined) {
                    throw new Error('Failed to create user');
                }
                const newUserStreamOut = {
                    data: {
                        type: 'create-new-user-succeeded',
                        payload: {
                            ...newStreamEventData.payload,
                            user: newUser,
                        },
                    },
                };
                const userStreamOut = await createStreamOutFromStreamEvent(
                    trx,
                    newUserStreamOut
                );
                if (userStreamOut === undefined) {
                    throw new Error('Failed to create stream out');
                }
                notifySubscribers(trx, userStreamOut);
            }
            const newLoginStreamOut = {
                data: {
                    type: 'user-login-succeeded',
                    payload: {
                        ...newStreamEventData.payload,
                    },
                },
            };
            const loginStreamOut = await createStreamOutFromStreamEvent(
                trx,
                newLoginStreamOut
            );
            if (loginStreamOut === undefined) {
                throw new Error('Failed to create stream out');
            }
            notifySubscribers(trx, loginStreamOut);
            break;
        }
        case 'like-intended': {
            // Pass thru the like-intended
            const streamOutLikeIntended = await createStreamOutFromStreamEvent(
                trx,
                newStreamEvent
            );
            if (streamOutLikeIntended === undefined) {
                throw new Error('Failed to create stream out');
            }
            notifySubscribers(trx, streamOutLikeIntended);
            // Get the game id
            const gameId = newStreamEventData.payload.game.id;
            // Get the game state
            const game = await findGameById(trx, gameId);
            console.log({ game });
            if (game !== undefined && game.likeCount < 50) {
                const newStreamOutLikeSucceeded = {
                    data: {
                        type: 'like-succeeded',
                        payload: {
                            ...newStreamEventData.payload,
                        },
                    },
                };
                const streamOutLikeSucceeded =
                    await createStreamOutFromStreamEvent(
                        trx,
                        newStreamOutLikeSucceeded
                    );
                if (streamOutLikeSucceeded === undefined) {
                    throw new Error('Failed to create stream out');
                }
                notifySubscribers(trx, streamOutLikeSucceeded);
                await updateGame(trx, gameId, {
                    likeCount: game.likeCount + 1,
                });
                const updatedGame = await findGameById(trx, gameId);
                if (updatedGame === undefined) {
                    throw new Error('Failed to find game');
                }
                if (updatedGame.likeCount === 50) {
                    const newStreamOutGameCompleted = {
                        data: {
                            // Don't pass the user email
                            type: 'game-completed',
                            payload: {
                                game: updatedGame,
                            },
                        },
                    };
                    const streamOutGameCompleted =
                        await createStreamOutFromStreamEvent(
                            trx,
                            newStreamOutGameCompleted
                        );
                    if (streamOutGameCompleted === undefined) {
                        throw new Error('Failed to create stream out');
                    }
                    notifySubscribers(trx, streamOutGameCompleted);
                    break;
                }
                const newStreamOutGameUpdated = {
                    data: {
                        // Don't pass the user email
                        type: 'game-updated',
                        payload: {
                            game: updatedGame,
                        },
                    },
                };
                const streamOutGameUpdated =
                    await createStreamOutFromStreamEvent(
                        trx,
                        newStreamOutGameUpdated
                    );
                if (streamOutGameUpdated === undefined) {
                    throw new Error('Failed to create stream out');
                }
                notifySubscribers(trx, streamOutGameUpdated);
                break;
            }
            const newStreamOut = {
                data: {
                    type: 'like-failed',
                    payload: {
                        ...newStreamEventData.payload,
                    },
                },
            };
            const streamOut = await createStreamOutFromStreamEvent(
                trx,
                newStreamOut
            );
            if (streamOut === undefined) {
                throw new Error('Failed to create stream out');
            }
            notifySubscribers(trx, streamOut);
            break;
        }
        case 'game-started-intended': {
            const newGame = await createGame(trx, {
                likeCount: 0,
            });
            if (newGame === undefined) {
                throw new Error('Failed to create game');
            }
            const newStreamOut = {
                data: {
                    type: 'game-started-succeeded',
                    payload: {
                        // Don't pass user email
                        // ...newStreamEventData.payload,
                        game: newGame,
                    },
                },
            };
            const streamOut = await createStreamOutFromStreamEvent(
                trx,
                newStreamOut
            );
            if (streamOut === undefined) {
                throw new Error('Failed to create stream out');
            }
            notifySubscribers(trx, streamOut);
            break;
        }
        default: {
            break;
        }
    }
}
