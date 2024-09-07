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
    id: Generated<number>;
    totalOrderId: number;
    data: any;
}

export interface StreamOutTableSerialized extends StreamOutTable {
    data: string;
}

export type StreamOut = Selectable<StreamOutTable>;
export type NewStreamOut = Insertable<StreamOutTableSerialized>;
export type StreamOutUpdate = Updateable<StreamOutTableSerialized>;

export interface HttpSubscriberTable {
    id: Generated<number>;
    url: string;
}

export type HttpSubscription = Selectable<HttpSubscriberTable>;
export type NewHttpSubscription = Insertable<HttpSubscriberTable>;
export type HttpSubscriptionUpdate = Updateable<HttpSubscriberTable>;

export interface UpstreamControlTable {
    id: number; // Will always be 0
    streamId: number;
    totalOrderId: number;
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
