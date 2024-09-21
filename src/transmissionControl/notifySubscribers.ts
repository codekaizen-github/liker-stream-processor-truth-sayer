import { TotallyOrderedStreamEvent } from './types';
import { handleNotifyingSubscribers } from '../handleNotifyingSubscribers';
export async function notifySubscribers(
    streamOut: TotallyOrderedStreamEvent[],
    totalOrderId: number
): Promise<void> {
    await handleNotifyingSubscribers(streamOut, totalOrderId);
}
