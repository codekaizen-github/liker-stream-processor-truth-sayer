import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('streamOut')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('totalOrderId', 'integer', (col) => col.notNull())
        // Add an arbitrary JSON column
        .addColumn('data', 'json', (col) => col.notNull())
        .execute();
    await db.schema
        .createTable('httpSubscriber')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('url', 'text', (col) => col.notNull())
        .execute();
    await db.schema
        .createTable('upstreamControl')
        .addColumn('id', 'integer', (col) => col.primaryKey())
        .addColumn('streamId', 'integer', (col) => col.notNull())
        .addColumn('totalOrderId', 'integer', (col) => col.notNull())
        .execute();
    await db.schema
        .createTable('game')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('likeCount', 'integer', (col) => col.notNull())
        .execute();
    await db.schema
        .createTable('user')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('streamOut').execute();
    await db.schema.dropTable('httpSubscriber').execute();
    await db.schema.dropTable('upstreamControl').execute();
    await db.schema.dropTable('game').execute();
    await db.schema.dropTable('user').execute();
}
