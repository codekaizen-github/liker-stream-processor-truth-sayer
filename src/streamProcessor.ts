import { Response } from 'express';
import { createStreamOut } from './streamOutStore';
import { notifySubscribers } from './subscriptions';
import { Database, NewStreamOut } from './types';
import { Kysely, Transaction } from 'kysely';
import { createGame, findGameById, updateGame } from './gameStore';
import { createUser, findUsers } from './userStore';

export async function processStreamEvent(
    newStreamEvent: NewStreamOut,
    db: Kysely<Database>,
    trx: Transaction<Database>
) {
    const newStreamEventData = JSON.parse(newStreamEvent.data);
    switch (newStreamEventData.type) {
        case 'user-login-intended': {
            const userEmail = newStreamEventData.payload.user.email;
            const existingUser = await findUsers(trx, { email: userEmail });
            if (existingUser.length === 0) {
                const newUser = await createUser(trx, {
                    email: userEmail,
                });
                if (newUser === undefined) {
                    throw new Error('Failed to create user');
                }
                const newUserStreamOut = {
                    data: JSON.stringify({
                        type: 'create-new-user-succeeded',
                        payload: {
                            ...newStreamEventData.payload,
                            user: newUser,
                        },
                    }),
                };
                const userStreamOut = await createStreamOut(
                    trx,
                    newUserStreamOut
                );
                if (userStreamOut === undefined) {
                    throw new Error('Failed to create stream out');
                }
                notifySubscribers(db, userStreamOut);
            }
            const newLoginStreamOut = {
                data: JSON.stringify({
                    type: 'user-login-succeeded',
                    payload: {
                        ...newStreamEventData.payload
                    }
                }),
            };
            const loginStreamOut = await createStreamOut(
                trx,
                newLoginStreamOut
            );
            if (loginStreamOut === undefined) {
                throw new Error('Failed to create stream out');
            }
            notifySubscribers(db, loginStreamOut);
            break;
        }
        case 'like-intended': {
            // Get the game id
            const gameId = newStreamEventData.payload.game.id;
            // Get the game state
            const game = await findGameById(trx, gameId);
            console.log({ game });
            if (game !== undefined && game.likeCount < 50) {
                const newStreamOutLikeSucceeded = {
                    data: JSON.stringify({
                        type: 'like-succeeded',
                        payload: {
                            ...newStreamEventData.payload
                        }
                    }),
                };
                const streamOutLikeSucceeded = await createStreamOut(
                    trx,
                    newStreamOutLikeSucceeded
                );
                if (streamOutLikeSucceeded === undefined) {
                    throw new Error('Failed to create stream out');
                }
                notifySubscribers(db, streamOutLikeSucceeded);
                await updateGame(trx, gameId, {
                    likeCount: game.likeCount + 1,
                });
                const updatedGame = await findGameById(trx, gameId);
                if (updatedGame === undefined) {
                    throw new Error('Failed to find game');
                }
                if (updatedGame.likeCount === 50) {
                    const newStreamOutGameCompleted = {
                        data: JSON.stringify({
                            // Don't pass the user email
                            type: 'game-completed',
                            payload: {
                                game: updatedGame,
                            }
                        }),
                    };
                    const streamOutGameCompleted = await createStreamOut(
                        trx,
                        newStreamOutGameCompleted
                    );
                    if (streamOutGameCompleted === undefined) {
                        throw new Error('Failed to create stream out');
                    }
                    notifySubscribers(db, streamOutGameCompleted);
                    break;
                }
                const newStreamOutGameUpdated = {
                    data: JSON.stringify({
                        // Don't pass the user email
                        type: 'game-updated',
                        payload: {
                            game: updatedGame,
                        }
                    }),
                };
                const streamOutGameUpdated = await createStreamOut(
                    trx,
                    newStreamOutGameUpdated
                );
                if (streamOutGameUpdated === undefined) {
                    throw new Error('Failed to create stream out');
                }
                notifySubscribers(db, streamOutGameUpdated);
                break;
            }
            const newStreamOut = {
                data: JSON.stringify({
                    type: 'like-failed',
                    payload: {
                        ...newStreamEventData.payload,
                    }
                }),
            };
            const streamOut = await createStreamOut(trx, newStreamOut);
            if (streamOut === undefined) {
                throw new Error('Failed to create stream out');
            }
            notifySubscribers(db, streamOut);
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
                data: JSON.stringify({
                    type: 'game-started-succeeded',
                    payload: {
                        // Don't pass user email
                        // ...newStreamEventData.payload,
                        game: newGame,
                    },
                }),
            };
            const streamOut = await createStreamOut(trx, newStreamOut);
            if (streamOut === undefined) {
                throw new Error('Failed to create stream out');
            }
            notifySubscribers(db, streamOut);
            break;
        }
        default: {
            break;
        }
    }
}
