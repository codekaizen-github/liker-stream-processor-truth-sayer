import { db } from './database';
import { getUpstreamControlForTransaction } from './getUpstreamControl';
import { getMostRecentStreamOutsWithSameTotalOrderId } from './streamOutStore';
import { TotallyOrderedStreamEvent } from './transmissionControl/types';

export async function getMostRecentTotallyOrderedStreamEvents(): Promise<{
    totalOrderId: number;
    events: TotallyOrderedStreamEvent[];
}> {
    return db.transaction().execute(async (trx) => {
        const upstreamControl = await getUpstreamControlForTransaction(trx);
        const streamOuts = await getMostRecentStreamOutsWithSameTotalOrderId(
            trx
        );
        return {
            totalOrderId: upstreamControl?.totalOrderId ?? 0,
            events: streamOuts,
        };
    });
}
