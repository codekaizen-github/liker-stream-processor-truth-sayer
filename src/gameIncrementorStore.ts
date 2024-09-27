import { sql, Transaction } from 'kysely';
import {
    GameIncrementorUpdate,
    GameIncrementor,
    NewGameIncrementor,
    Database,
} from './types';

export async function getSingleGameIncrementorForUpdateWithDefault(
    trx: Transaction<Database>
) {
    await getGameIncrementorForUpdate(trx, 0); // Prevents duplicate entry keys and insertions in other tables
    await insertIntoIgnoreGameIncrementor(trx, {
        id: 0,
        gameId: 0,
    });
    const incrementor = await getGameIncrementorForUpdate(trx, 0);
    return incrementor;
}

export async function updateSingleGameIncrementor(
    trx: Transaction<Database>,
    updateWith: GameIncrementorUpdate
) {
    await trx
        .updateTable('gameIncrementor')
        .set(updateWith)
        .where('id', '=', 0)
        .execute();
}

export async function findGameIncrementorById(
    trx: Transaction<Database>,
    id: number
) {
    return await trx
        .selectFrom('gameIncrementor')
        .where('id', '=', id)
        .selectAll()
        .executeTakeFirst();
}

export async function findGameIncrementors(
    trx: Transaction<Database>,
    criteria: Partial<GameIncrementor>
) {
    let query = trx.selectFrom('gameIncrementor');

    if (criteria.id) {
        query = query.where('id', '=', criteria.id); // Kysely is immutable, you must re-assign!
    }

    return await query.selectAll().execute();
}

export async function getMostRecentGameIncrementor(trx: Transaction<Database>) {
    return await trx
        .selectFrom('gameIncrementor')
        .orderBy('id', 'desc')
        .limit(1)
        .selectAll()
        .executeTakeFirst();
}

export async function getGameIncrementorForUpdate(
    trx: Transaction<Database>,
    id: number
) {
    return await trx
        .selectFrom('gameIncrementor')
        .where('id', '=', id)
        .forUpdate()
        .selectAll()
        .executeTakeFirst();
}

export async function updateGameIncrementor(
    trx: Transaction<Database>,
    id: number,
    updateWith: GameIncrementorUpdate
) {
    await trx
        .updateTable('gameIncrementor')
        .set(updateWith)
        .where('id', '=', id)
        .execute();
}

export async function createGameIncrementor(
    trx: Transaction<Database>,
    gameIncrementor: NewGameIncrementor
) {
    const { insertId } = await trx
        .insertInto('gameIncrementor')
        .values(gameIncrementor)
        .executeTakeFirstOrThrow();

    return await findGameIncrementorById(trx, Number(insertId!));
}

export async function insertIntoIgnoreGameIncrementor(
    trx: Transaction<Database>,
    gameIncrementor: NewGameIncrementor
) {
    await trx
        .insertInto('gameIncrementor')
        .values(gameIncrementor)
        .ignore()
        .execute();
}

export async function deleteGameIncrementor(
    trx: Transaction<Database>,
    id: number
) {
    const gameIncrementor = await findGameIncrementorById(trx, id);

    if (gameIncrementor) {
        await trx.deleteFrom('gameIncrementor').where('id', '=', id).execute();
    }

    return gameIncrementor;
}
