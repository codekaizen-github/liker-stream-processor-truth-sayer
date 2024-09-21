import { findHttpSubscribers } from './httpSubscriberStore';
import { TotallyOrderedStreamEvent } from './transmissionControl/types';
import { db } from './database';

export async function handleNotifyingSubscribers(
    streamOut: TotallyOrderedStreamEvent[],
    totalOrderId: number
): Promise<void> {
    const subscriptions = await db.transaction().execute(async (trx) => {
        return await findHttpSubscribers(trx, {});
    });
    for (const subscription of subscriptions) {
        // non-blockink
        notifySubscriberUrl(subscription.url, streamOut, totalOrderId);
    }
}

export async function notifySubscriberUrl(
    url: string,
    streamOut: TotallyOrderedStreamEvent[],
    totalOrderId: number
): Promise<void> {
    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                totalOrderId,
                events: streamOut,
            }),
        });
    } catch (e) {
        console.error(e);
    }
}
