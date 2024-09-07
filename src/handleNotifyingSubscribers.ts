import { findHttpSubscribers } from './httpSubscriberStore';
import { TotallyOrderedStreamEvent } from './transmissionControl/types';
import { db } from './database';

export async function handleNotifyingSubscribers(
    streamOut: TotallyOrderedStreamEvent
): Promise<void> {
    const subscriptions = await db.transaction().execute(async (trx) => {
        return await findHttpSubscribers(trx, {});
    });
    for (const subscription of subscriptions) {
        // non-blocking
        console.log('notifying:', {
            url: subscription.url,
            streamOut: JSON.stringify(streamOut),
        });
        notifySubscriberUrl(subscription.url, streamOut);
    }
}

export async function notifySubscriberUrl(
    url: string,
    streamOut: TotallyOrderedStreamEvent
): Promise<void> {
    console.log('notifying subscriber:', { streamOut });
    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(streamOut),
        });
    } catch (e) {
        console.error(e);
    }
}
