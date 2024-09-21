import { Transaction } from 'kysely';
import { createStreamOutFromStreamEvent } from './streamOutStore';
import { Database } from './types';
import {
    NewTotallyOrderedStreamEvent,
    TotallyOrderedStreamEvent,
} from './transmissionControl/types';
import { createUser, findUserByEmail } from './userStore';
import { createGame, findGameById, updateGame } from './gameStore';
import {
    getStreamOutIncrementorForUpdate,
    insertIntoIgnoreStreamOutIncrementor,
    updateStreamOutIncrementor,
} from './streamOutIncrementorStore';

export async function createTotallyOrderedStreamEvents(
    trx: Transaction<Database>,
    streamEvent: NewTotallyOrderedStreamEvent
): Promise<TotallyOrderedStreamEvent[]> {
    const results: TotallyOrderedStreamEvent[] = [];
    const incrementorForUpdateLock = await getStreamOutIncrementorForUpdate(
        trx,
        0
    ); // Prevents duplicate entry keys and insertions in other tables
    const incrementorControlIgnore = await insertIntoIgnoreStreamOutIncrementor(
        trx,
        {
            id: 0,
            streamId: 0,
        }
    );
    const incrementorControl = await getStreamOutIncrementorForUpdate(trx, 0);
    if (incrementorControl === undefined) {
        throw new Error('Failed to get incrementor control lock');
    }
    const incrementorControlToUpdate = {
        id: 0,
        streamId: incrementorControl.streamId,
    };
    switch (streamEvent.data.type) {
        case 'user-login-intended': {
            const userEmail = streamEvent.data.payload.user.email;
            const existingUser = await findUserByEmail(trx, userEmail);
            if (existingUser === undefined) {
                const newUser = await createUser(trx, {
                    email: userEmail,
                });
                if (newUser === undefined) {
                    throw new Error('Failed to create user');
                }

                const userStreamOut = await createStreamOutFromStreamEvent(
                    trx,
                    {
                        streamId: ++incrementorControlToUpdate.streamId,
                        totalOrderId: streamEvent.totalOrderId,
                        data: {
                            type: 'create-new-user-succeeded',
                            payload: {
                                ...streamEvent.data.payload,
                                user: newUser,
                            },
                        },
                    }
                );
                if (userStreamOut === undefined) {
                    throw new Error('Failed to create stream out');
                }
                results.push(userStreamOut);
            }

            const loginStreamOut = await createStreamOutFromStreamEvent(trx, {
                streamId: ++incrementorControlToUpdate.streamId,
                totalOrderId: streamEvent.totalOrderId,
                data: {
                    type: 'user-login-succeeded',
                    payload: {
                        ...streamEvent.data.payload,
                    },
                },
            });
            if (loginStreamOut === undefined) {
                throw new Error('Failed to create stream out');
            }
            results.push(loginStreamOut);
            break;
        }
        case 'like-intended': {
            // Pass thru the like-intended
            const streamOutLikeIntended = await createStreamOutFromStreamEvent(
                trx,
                streamEvent
            );
            if (streamOutLikeIntended === undefined) {
                throw new Error('Failed to create stream out');
            }
            results.push(streamOutLikeIntended);
            // Get the game id
            const gameId = streamEvent.data.payload.game.id;
            // Get the game state
            const game = await findGameById(trx, gameId);
            console.log({ game });
            if (game !== undefined && game.likeCount < 50) {
                const streamOutLikeSucceeded =
                    await createStreamOutFromStreamEvent(trx, {
                        streamId: ++incrementorControlToUpdate.streamId,
                        totalOrderId: streamEvent.totalOrderId,
                        data: {
                            type: 'like-succeeded',
                            payload: {
                                ...streamEvent.data.payload,
                            },
                        },
                    });
                if (streamOutLikeSucceeded === undefined) {
                    throw new Error('Failed to create stream out');
                }
                results.push(streamOutLikeSucceeded);
                await updateGame(trx, gameId, {
                    likeCount: game.likeCount + 1,
                });
                const updatedGame = await findGameById(trx, gameId);
                if (updatedGame === undefined) {
                    throw new Error('Failed to find game');
                }
                if (updatedGame.likeCount === 50) {
                    const streamOutGameCompleted =
                        await createStreamOutFromStreamEvent(trx, {
                            streamId: ++incrementorControlToUpdate.streamId,
                            totalOrderId: streamEvent.totalOrderId,
                            data: {
                                // Don't pass the user email
                                type: 'game-completed',
                                payload: {
                                    game: updatedGame,
                                },
                            },
                        });
                    if (streamOutGameCompleted === undefined) {
                        throw new Error('Failed to create stream out');
                    }
                    results.push(streamOutGameCompleted);
                    break;
                }

                const streamOutGameUpdated =
                    await createStreamOutFromStreamEvent(trx, {
                        streamId: ++incrementorControlToUpdate.streamId,
                        totalOrderId: streamEvent.totalOrderId,
                        data: {
                            // Don't pass the user email
                            type: 'game-updated',
                            payload: {
                                game: updatedGame,
                            },
                        },
                    });
                if (streamOutGameUpdated === undefined) {
                    throw new Error('Failed to create stream out');
                }
                results.push(streamOutGameUpdated);
                break;
            }

            const streamOut = await createStreamOutFromStreamEvent(trx, {
                streamId: ++incrementorControlToUpdate.streamId,
                totalOrderId: streamEvent.totalOrderId,
                data: {
                    type: 'like-failed',
                    payload: {
                        ...streamEvent.data.payload,
                    },
                },
            });
            if (streamOut === undefined) {
                throw new Error('Failed to create stream out');
            }
            results.push(streamOut);
            break;
        }
        case 'game-started-intended': {
            const newGame = await createGame(trx, {
                likeCount: 0,
            });
            if (newGame === undefined) {
                throw new Error('Failed to create game');
            }
            const streamOut = await createStreamOutFromStreamEvent(trx, {
                streamId: ++incrementorControlToUpdate.streamId,
                totalOrderId: streamEvent.totalOrderId,
                data: {
                    type: 'game-started-succeeded',
                    payload: {
                        // Don't pass user email
                        // ...streamEvent.data.payload,
                        game: newGame,
                    },
                },
            });
            if (streamOut === undefined) {
                throw new Error('Failed to create stream out');
            }
            results.push(streamOut);
            break;
        }
        default: {
            break;
        }
    }
    await updateStreamOutIncrementor(trx, 0, incrementorControlToUpdate);
    return results;
}
