import { sql, Transaction } from 'kysely';
import {
    StreamOutIncrementorUpdate,
    StreamOutIncrementor,
    NewStreamOutIncrementor,
    Database,
} from './types';

export async function getSingleStreamOutIncrementorForUpdateWithDefault(
    trx: Transaction<Database>
) {
    await getStreamOutIncrementorForUpdate(trx, 0); // Prevents duplicate entry keys and insertions in other tables
    await insertIntoIgnoreStreamOutIncrementor(trx, {
        id: 0,
        streamId: 0,
    });
    const incrementor = await getStreamOutIncrementorForUpdate(trx, 0);
    return incrementor;
}

export async function updateSingleStreamOutIncrementor(
    trx: Transaction<Database>,
    updateWith: StreamOutIncrementorUpdate
) {
    await trx
        .updateTable('streamOutIncrementor')
        .set(updateWith)
        .where('id', '=', 0)
        .execute();
}

export async function findStreamOutIncrementorById(
    trx: Transaction<Database>,
    id: number
) {
    return await trx
        .selectFrom('streamOutIncrementor')
        .where('id', '=', id)
        .selectAll()
        .executeTakeFirst();
}

export async function findStreamOutIncrementors(
    trx: Transaction<Database>,
    criteria: Partial<StreamOutIncrementor>
) {
    let query = trx.selectFrom('streamOutIncrementor');

    if (criteria.id) {
        query = query.where('id', '=', criteria.id); // Kysely is immutable, you must re-assign!
    }

    return await query.selectAll().execute();
}

export async function getMostRecentStreamOutIncrementor(
    trx: Transaction<Database>
) {
    return await trx
        .selectFrom('streamOutIncrementor')
        .orderBy('id', 'desc')
        .limit(1)
        .selectAll()
        .executeTakeFirst();
}

export async function getStreamOutIncrementorForUpdate(
    trx: Transaction<Database>,
    id: number
) {
    return await trx
        .selectFrom('streamOutIncrementor')
        .where('id', '=', id)
        .forUpdate()
        .selectAll()
        .executeTakeFirst();
}

export async function updateStreamOutIncrementor(
    trx: Transaction<Database>,
    id: number,
    updateWith: StreamOutIncrementorUpdate
) {
    await trx
        .updateTable('streamOutIncrementor')
        .set(updateWith)
        .where('id', '=', id)
        .execute();
}

export async function createStreamOutIncrementor(
    trx: Transaction<Database>,
    streamOutIncrementor: NewStreamOutIncrementor
) {
    const { insertId } = await trx
        .insertInto('streamOutIncrementor')
        .values(streamOutIncrementor)
        .executeTakeFirstOrThrow();

    return await findStreamOutIncrementorById(trx, Number(insertId!));
}

export async function insertIntoIgnoreStreamOutIncrementor(
    trx: Transaction<Database>,
    streamOutIncrementor: NewStreamOutIncrementor
) {
    await trx
        .insertInto('streamOutIncrementor')
        .values(streamOutIncrementor)
        .ignore()
        .execute();
}

export async function deleteStreamOutIncrementor(
    trx: Transaction<Database>,
    id: number
) {
    const streamOutIncrementor = await findStreamOutIncrementorById(trx, id);

    if (streamOutIncrementor) {
        await trx
            .deleteFrom('streamOutIncrementor')
            .where('id', '=', id)
            .execute();
    }

    return streamOutIncrementor;
}
