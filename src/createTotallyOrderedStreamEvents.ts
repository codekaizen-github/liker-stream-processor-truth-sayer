import { Transaction } from 'kysely';
import { createStreamOutFromStreamEvent } from './streamOutStore';
import { Database, User } from './types';
import {
    NewTotallyOrderedStreamEvent,
    TotallyOrderedStreamEvent,
} from './transmissionControl/types';
import { createUser, findUserByEmail } from './userStore';
import { createGame, findGameById, updateGame } from './gameStore';
import {
    getSingleStreamOutIncrementorForUpdateWithDefault,
    updateSingleStreamOutIncrementor,
} from './streamOutIncrementorStore';
import {
    getSingleUserIncrementorForUpdateWithDefault,
    updateSingleUserIncrementor,
} from './userIncrementorStore';
import {
    getSingleGameIncrementorForUpdateWithDefault,
    updateSingleGameIncrementor,
} from './gameIncrementorStore';

export async function createTotallyOrderedStreamEvents(
    trx: Transaction<Database>,
    streamEvent: NewTotallyOrderedStreamEvent
): Promise<TotallyOrderedStreamEvent[]> {
    console.log({
        ...streamEvent,
        payload: JSON.stringify(streamEvent.data.payload),
    });
    const results: TotallyOrderedStreamEvent[] = [];
    const streamOutIncrementorToUpdate =
        await getSingleStreamOutIncrementorForUpdateWithDefault(trx);
    if (streamOutIncrementorToUpdate === undefined) {
        throw new Error('Failed to get incrementor control lock');
    }
    const userEmail = streamEvent.data?.payload?.user?.email;
    let user = await findUserByEmail(trx, userEmail);
    if (streamEvent.data.type === 'user-login-intended') {
        if (user === undefined) {
            const userIncrementor =
                await getSingleUserIncrementorForUpdateWithDefault(trx);
            if (userIncrementor === undefined) {
                throw new Error('Failed to get incrementor control lock');
            }
            user = await createUser(trx, {
                email: userEmail,
                userId: ++userIncrementor.userId,
            });
            await updateSingleUserIncrementor(trx, userIncrementor);
            if (user === undefined) {
                throw new Error('Failed to create user');
            }
            const userStreamOut = await createStreamOutFromStreamEvent(trx, {
                streamId: ++streamOutIncrementorToUpdate.streamId,
                totalOrderId: streamEvent.totalOrderId,
                data: {
                    type: 'create-new-user-succeeded',
                    payload: {
                        ...streamEvent.data.payload,
                        user: user,
                    },
                },
            });
            if (userStreamOut === undefined) {
                throw new Error('Failed to create stream out');
            }
            results.push(userStreamOut);
        }

        const loginStreamOut = await createStreamOutFromStreamEvent(trx, {
            streamId: ++streamOutIncrementorToUpdate.streamId,
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
    }
    if (user === undefined) {
        console.log('User not found: ', userEmail);
        return results;
    }
    switch (streamEvent.data.type) {
        case 'like-intended': {
            // Get the game id
            const gameId = streamEvent.data.payload.game.id;
            // Get the game state
            const game = await findGameById(trx, gameId);
            if (game === undefined) {
                console.error('Game not found: ', gameId);
                break;
            }
            // Pass thru the like-intended
            const streamOutLikeIntended = await createStreamOutFromStreamEvent(
                trx,
                {
                    streamId: ++streamOutIncrementorToUpdate.streamId,
                    totalOrderId: streamEvent.totalOrderId,
                    data: {
                        type: 'like-intended',
                        payload: {
                            ...streamEvent.data.payload,
                        },
                    },
                }
            );
            if (streamOutLikeIntended === undefined) {
                throw new Error('Failed to create stream out');
            }
            results.push(streamOutLikeIntended);
            console.log({ game });
            if (game !== undefined && game.likeCount < 50) {
                const streamOutLikeSucceeded =
                    await createStreamOutFromStreamEvent(trx, {
                        streamId: ++streamOutIncrementorToUpdate.streamId,
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
                            streamId: ++streamOutIncrementorToUpdate.streamId,
                            totalOrderId: streamEvent.totalOrderId,
                            data: {
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
                        streamId: ++streamOutIncrementorToUpdate.streamId,
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
                streamId: ++streamOutIncrementorToUpdate.streamId,
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
            const gameIncrementor =
                await getSingleGameIncrementorForUpdateWithDefault(trx);
            if (gameIncrementor === undefined) {
                throw new Error('Failed to get incrementor control lock');
            }
            const newGame = await createGame(trx, {
                gameId: ++gameIncrementor.gameId,
                likeCount: 0,
            });
            await updateSingleGameIncrementor(trx, gameIncrementor);
            if (newGame === undefined) {
                throw new Error('Failed to create game');
            }
            const streamOutGameStartedIntended = await createStreamOutFromStreamEvent(trx, {
                streamId: ++streamOutIncrementorToUpdate.streamId,
                totalOrderId: streamEvent.totalOrderId,
                data: {
                    type: 'game-started-intended',
                    payload: {
                        // Don't pass user email
                        ...streamEvent.data.payload
                    },
                },
            });
            if (streamOutGameStartedIntended === undefined) {
                throw new Error('Failed to create stream out');
            }
            results.push(streamOutGameStartedIntended);
            const streamOutGameStartedSucceeded = await createStreamOutFromStreamEvent(trx, {
                streamId: ++streamOutIncrementorToUpdate.streamId,
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
            if (streamOutGameStartedSucceeded === undefined) {
                throw new Error('Failed to create stream out');
            }
            results.push(streamOutGameStartedSucceeded);
            break;
        }
        default: {
            break;
        }
    }
    await updateSingleStreamOutIncrementor(trx, streamOutIncrementorToUpdate);
    return results;
}
