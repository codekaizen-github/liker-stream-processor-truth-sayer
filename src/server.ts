// Import the 'express' module
import express from 'express';
import { db } from './database';
import { findTotallyOrderedStreamEvents } from './streamOutStore';
import {
    createHttpSubscriber,
    deleteHttpSubscriber,
    findHttpSubscribers,
} from './httpSubscriberStore';
import onEvent from './transmissionControl/onEvent';
import { buildFetchUpstream } from './transmissionControl/buildFetchUpstream';
import { subscribe } from './subscribe';
import { notifySubscribers } from './transmissionControl/notifySubscribers';
import { getMostRecentTotallyOrderedStreamEvents } from './getMostRecentTotallyOrderedStreamEvents';
import {
    getUpstreamControl,
    getUpstreamControlForTransaction,
} from './getUpstreamControl';
import { StreamEventOutOfSequenceException } from './transmissionControl/exceptions';
import { TotallyOrderedStreamEvent } from './transmissionControl/types';

if (
    undefined ==
    process.env.LIKER_STREAM_PROCESSOR_TRUTH_SAYER_UPSTREAM_URL_STREAM_OUT
) {
    throw new Error('Undefined upstream URL');
}
const fetchUpstreamFunc = buildFetchUpstream(
    process.env.LIKER_STREAM_PROCESSOR_TRUTH_SAYER_UPSTREAM_URL_STREAM_OUT
);
// Create an Express application
const app = express();

// Set the port number for the server
const port = 80;

app.use(express.json());

// Define a route for the root path ('/')
app.get('/', (req, res) => {
    // Send a response to the client
    res.send('Hello, TypeScript + Node.js + Express!');
});

app.post('/streamIn', async (req, res) => {
    if (!Array.isArray(req.body.events)) {
        return res.status(400).send();
    }
    if (isNaN(Number(req.body.totalOrderId))) {
        return res.status(400).send();
    }
    const totalOrderId: number = req.body.totalOrderId;
    const events: TotallyOrderedStreamEvent[] = req.body.events;
    try {
        await onEvent(events, totalOrderId);
    } catch (e) {
        if (e instanceof StreamEventOutOfSequenceException) {
            try {
                const upstreamControl = await getUpstreamControl();
                const responseBody = await fetchUpstreamFunc(
                    totalOrderId,
                    upstreamControl?.streamId ?? 0
                );
                await onEvent(responseBody.events, responseBody.totalOrderId);
            } catch (e) {
                return res.status(500).send();
            }
        }
        return res.status(500).send();
    }
    return res.status(201).send();
});

app.get('/streamOut', async (req, res) => {
    // Ignore
    let totalOrderId = !isNaN(Number(req.query.totalOrderId))
        ? Number(req.query.totalOrderId)
        : undefined;
    let eventIdStart = !isNaN(Number(req.query.eventIdStart))
        ? Number(req.query.eventIdStart)
        : undefined;
    let eventIdEnd = !isNaN(Number(req.query.eventIdEnd))
        ? Number(req.query.eventIdEnd)
        : undefined;
    let limit = !isNaN(Number(req.query.limit))
        ? Number(req.query.limit)
        : undefined;
    let offset = !isNaN(Number(req.query.offset))
        ? Number(req.query.offset)
        : undefined;
    // Get the upstreamControl
    const upstreamControl = await getUpstreamControl();
    // Make sure that our replica is up to date
    if (
        totalOrderId !== undefined &&
        (upstreamControl?.totalOrderId ?? 0) < totalOrderId
    ) {
        const responseBody = await fetchUpstreamFunc(
            totalOrderId,
            upstreamControl?.streamId ?? 0
        );
        totalOrderId = responseBody.totalOrderId;
        await onEvent(responseBody.events, responseBody.totalOrderId);
    }
    await db
        .transaction()
        .setIsolationLevel('serializable')
        .execute(async (trx) => {
            // Get our upstream
            const upstreamControl = await getUpstreamControlForTransaction(trx);
            const records = await findTotallyOrderedStreamEvents(
                trx,
                eventIdStart,
                eventIdEnd,
                limit,
                offset
            );
            return res.json({
                totalOrderId: upstreamControl?.totalOrderId ?? 0,
                events: records,
            });
        });
    // Find all log records with an ID greater than 'afterId'
    // Send the records to the client
});

app.post('/httpSubscriber/register', async (req, res) => {
    await db
        .transaction()
        .setIsolationLevel('serializable')
        .execute(async (trx) => {
            const existing = await findHttpSubscribers(trx, {
                url: req.body.url,
            });
            if (existing.length > 0) {
                return res.status(200).send();
            }
            const result = createHttpSubscriber(trx, req.body);
            return res.status(201).send();
        });
});

app.post('/httpSubscriber/unregister', async (req, res) => {
    await db
        .transaction()
        .setIsolationLevel('serializable')
        .execute(async (trx) => {
            const existing = await findHttpSubscribers(trx, {
                url: req.body.url,
            });
            if (existing.length > 0) {
                // delete
                for (const subscription of existing) {
                    await deleteHttpSubscriber(trx, subscription.id);
                }
                return res.status(200).send();
            }
            return res.status(404).send();
        });
});

// Start the server and listen on the specified port
app.listen(port, () => {
    // Log a message when the server is successfully running
    console.log(`Server is running on http://localhost:${port}`);
});

// Subscribe
(async () => {
    if (
        process.env.LIKER_STREAM_PROCESSOR_TRUTH_SAYER_UPSTREAM_URL_REGISTER ===
        undefined
    ) {
        return;
    }
    if (
        process.env
            .LIKER_STREAM_PROCESSOR_TRUTH_SAYER_CALLBACK_URL_STREAM_IN ===
        undefined
    ) {
        return;
    }
    subscribe(
        process.env.LIKER_STREAM_PROCESSOR_TRUTH_SAYER_UPSTREAM_URL_REGISTER,
        process.env.LIKER_STREAM_PROCESSOR_TRUTH_SAYER_CALLBACK_URL_STREAM_IN
    );
})();

// Poll for the latest log records
(async () => {
    try {
        const upstreamControl = await getUpstreamControl();
        const responseBody = await fetchUpstreamFunc(
            upstreamControl?.totalOrderId ?? 0,
            upstreamControl?.streamId ?? 0
        );
        await onEvent(responseBody.events, responseBody.totalOrderId);
    } catch (e) {
        console.error(e);
    }
})();

// Get the most recent log record and notify subscribers
(async () => {
    const result = await getMostRecentTotallyOrderedStreamEvents();
    // non-blocking
    notifySubscribers(result.events, result.totalOrderId);
})();
