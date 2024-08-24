import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface NewStreamEvent {
    data: any;
}

export interface OrderedStreamEvent {
    id: number;
    data: any;
}

export interface Database {
    streamOut: StreamOutTable;
    httpSubscriber: HttpSubscriberTable;
    upstreamControl: UpstreamControlTable;
    game: GameTable;
    user: UserTable;
}

// This interface describes the `person` table to Kysely. Table
// interfaces should only be used in the `Database` type above
// and never as a result type of a query!. See the `Person`,
// `NewPerson` and `PersonUpdate` types below.
export interface StreamOutTable {
    // Columns that are generated by the database should be marked
    // using the `Generated` type. This way they are automatically
    // made optional in inserts and updates.
    id: Generated<number>;
    data: any;
}

// You should not use the table schema interfaces directly. Instead, you should
// use the `Selectable`, `Insertable` and `Updateable` wrappers. These wrappers
// make sure that the correct types are used in each operation.
//
// Most of the time you should trust the type inference and not use explicit
// types at all. These types can be useful when typing function arguments.
export type StreamOut = Selectable<StreamOutTable>;
export type NewStreamOut = Insertable<StreamOutTable & { data: string }>;
export type StreamOutUpdate = Updateable<StreamOutTable & { data: string }>;

export interface HttpSubscriberTable {
    id: Generated<number>;
    url: string;
}

export type HttpSubscription = Selectable<HttpSubscriberTable>;
export type NewHttpSubscription = Insertable<HttpSubscriberTable>;
export type HttpSubscriptionUpdate = Updateable<HttpSubscriberTable>;

export interface UpstreamControlTable {
    id: Generated<number>;
    streamInId: number;
}

export type UpstreamControl = Selectable<UpstreamControlTable>;
export type NewUpstreamControl = Insertable<UpstreamControlTable>;
export type UpstreamControlUpdate = Updateable<UpstreamControlTable>;

export interface GameTable {
    id: Generated<number>;
    likeCount: number;
}

export type Game = Selectable<GameTable>;
export type NewGame = Insertable<GameTable>;
export type GameUpdate = Updateable<GameTable>;

export interface UserTable {
    id: Generated<number>;
    email: string;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;
