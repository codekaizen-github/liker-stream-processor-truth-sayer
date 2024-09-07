export interface TotallyOrderedStreamEvent {
    id: number;
    totalOrderId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
}

export interface NewTotallyOrderedStreamEvent {
    totalOrderId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
}
