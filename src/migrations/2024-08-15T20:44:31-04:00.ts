import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('streamOut')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('streamId', 'integer', (col) => col.notNull().unique())
        .addColumn('totalOrderId', 'integer', (col) => col.notNull())
        // Add an arbitrary JSON column
        .addColumn('data', 'json', (col) => col.notNull())
        .execute();
    await db.schema
        .createTable('streamOutIncrementor')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.primaryKey())
        .addColumn('streamId', 'integer', (col) => col.notNull())
        .execute();
    await db.schema
        .createTable('httpSubscriber')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('url', 'text', (col) => col.notNull())
        .execute();
    await db.schema
        .createTable('upstreamControl')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.primaryKey())
        .addColumn('streamId', 'integer', (col) => col.notNull())
        .addColumn('totalOrderId', 'integer', (col) => col.notNull())
        .execute();
    await db.schema
        .createTable('game')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('gameId', 'integer', (col) => col.notNull().unique())
        .addColumn('likeCount', 'integer', (col) => col.notNull())
        .execute();
    await db.schema
        .createTable('gameIncrementor')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.primaryKey())
        .addColumn('gameId', 'integer', (col) => col.notNull())
        .execute();
    await db.schema
        .createTable('user')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('userId', 'integer', (col) => col.notNull().unique())
        .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
        .execute();
    await db.schema
        .createTable('userIncrementor')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.primaryKey())
        .addColumn('userId', 'integer', (col) => col.notNull())
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('streamOut').ifExists().execute();
    await db.schema.dropTable('streamOutIncrementor').ifExists().execute();
    await db.schema.dropTable('httpSubscriber').ifExists().execute();
    await db.schema.dropTable('upstreamControl').ifExists().execute();
    await db.schema.dropTable('game').ifExists().execute();
    await db.schema.dropTable('gameIncrementor').ifExists().execute();
    await db.schema.dropTable('user').ifExists().execute();
    await db.schema.dropTable('userIncrementor').ifExists().execute();
}
