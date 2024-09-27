import { sql, Transaction } from 'kysely';
import {
    UserIncrementorUpdate,
    UserIncrementor,
    NewUserIncrementor,
    Database,
} from './types';

export async function getSingleUserIncrementorForUpdateWithDefault(
    trx: Transaction<Database>
) {
    await getUserIncrementorForUpdate(trx, 0); // Prevents duplicate entry keys and insertions in other tables
    await insertIntoIgnoreUserIncrementor(trx, {
        id: 0,
        userId: 0,
    });
    const incrementor = await getUserIncrementorForUpdate(trx, 0);
    return incrementor;
}

export async function getUserIncrementorForUpdateWithDefault(
    trx: Transaction<Database>
) {
    await getUserIncrementorForUpdate(trx, 0); // Prevents duplicate entry keys and insertions in other tables
    await insertIntoIgnoreUserIncrementor(trx, {
        id: 0,
        userId: 0,
    });
    const userIncrementor = await getUserIncrementorForUpdate(trx, 0);
    return userIncrementor;
}

export async function updateSingleUserIncrementor(
    trx: Transaction<Database>,
    updateWith: UserIncrementorUpdate
) {
    await trx
        .updateTable('userIncrementor')
        .set(updateWith)
        .where('id', '=', 0)
        .execute();
}

export async function findUserIncrementorById(
    trx: Transaction<Database>,
    id: number
) {
    return await trx
        .selectFrom('userIncrementor')
        .where('id', '=', id)
        .selectAll()
        .executeTakeFirst();
}

export async function findUserIncrementors(
    trx: Transaction<Database>,
    criteria: Partial<UserIncrementor>
) {
    let query = trx.selectFrom('userIncrementor');

    if (criteria.id) {
        query = query.where('id', '=', criteria.id); // Kysely is immutable, you must re-assign!
    }

    return await query.selectAll().execute();
}

export async function getMostRecentUserIncrementor(trx: Transaction<Database>) {
    return await trx
        .selectFrom('userIncrementor')
        .orderBy('id', 'desc')
        .limit(1)
        .selectAll()
        .executeTakeFirst();
}

export async function getUserIncrementorForUpdate(
    trx: Transaction<Database>,
    id: number
) {
    return await trx
        .selectFrom('userIncrementor')
        .where('id', '=', id)
        .forUpdate()
        .selectAll()
        .executeTakeFirst();
}

export async function updateUserIncrementor(
    trx: Transaction<Database>,
    id: number,
    updateWith: UserIncrementorUpdate
) {
    await trx
        .updateTable('userIncrementor')
        .set(updateWith)
        .where('id', '=', id)
        .execute();
}

export async function createUserIncrementor(
    trx: Transaction<Database>,
    userIncrementor: NewUserIncrementor
) {
    const { insertId } = await trx
        .insertInto('userIncrementor')
        .values(userIncrementor)
        .executeTakeFirstOrThrow();

    return await findUserIncrementorById(trx, Number(insertId!));
}

export async function insertIntoIgnoreUserIncrementor(
    trx: Transaction<Database>,
    userIncrementor: NewUserIncrementor
) {
    await trx
        .insertInto('userIncrementor')
        .values(userIncrementor)
        .ignore()
        .execute();
}

export async function deleteUserIncrementor(
    trx: Transaction<Database>,
    id: number
) {
    const userIncrementor = await findUserIncrementorById(trx, id);

    if (userIncrementor) {
        await trx.deleteFrom('userIncrementor').where('id', '=', id).execute();
    }

    return userIncrementor;
}
