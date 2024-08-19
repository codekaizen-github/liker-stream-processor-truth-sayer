import { sql } from 'kysely';
import { db } from './database';

async function reset() {
    console.log('Resetting database');
    await sql`TRUNCATE TABLE streamOut`.execute(db);
    console.log('Truncated streamOut');
    await sql`TRUNCATE TABLE upstreamControl`.execute(db);
    console.log('Truncated upstreamControl');
    await sql`TRUNCATE TABLE game`.execute(db);
    console.log('Truncated game');
    await sql`TRUNCATE TABLE user`.execute(db);
    console.log('Truncated user');
    await db.destroy();
}

reset();
