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
import {
    syncUpstream,
    syncUpstreamFromUpstreamControl,
} from './transmissionControl/syncUpstream';
import { subscribe } from './subscribe';
import { notifySubscribers } from './transmissionControl/notifySubscribers';
import { getMostRecentTotallyOrderedStreamEvent } from './getMostRecentTotallyOrderedStreamEvent';
import { getUpstreamControl } from './getUpstreamControl';

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
    try {
        if (
            process.env
                .LIKER_STREAM_PROCESSOR_TRUTH_SAYER_UPSTREAM_URL_STREAM_OUT ===
            undefined
        ) {
            throw new Error('Upstream URL is not defined');
        }
        await onEvent(
            req.body,
            buildFetchUpstream(
                process.env
                    .LIKER_STREAM_PROCESSOR_TRUTH_SAYER_UPSTREAM_URL_STREAM_OUT
            )
        );
    } catch (e) {
        console.error(e);
        return res.status(500).send();
    }
    return res.status(201).send();
});

app.get('/streamOut', async (req, res) => {
    console.log({ query: JSON.stringify(req.query) });
    // Ignore
    const totalOrderId = Number(req.query.totalOrderId);
    const eventIdStart = Number(req.query.eventIdStart);
    const eventIdEnd = req.query.eventIdEnd
        ? Number(req.query.eventIdEnd)
        : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    // Get the upstreamControl lock
    const upstreamControl = await getUpstreamControl();
    // Make sure that our replica is up to date
    if (upstreamControl.totalOrderId < totalOrderId) {
        if (
            process.env
                .LIKER_STREAM_PROCESSOR_TRUTH_SAYER_UPSTREAM_URL_STREAM_OUT ===
            undefined
        ) {
            throw new Error('Upstream URL is not defined');
        }
        await syncUpstream(
            buildFetchUpstream(
                process.env
                    .LIKER_STREAM_PROCESSOR_TRUTH_SAYER_UPSTREAM_URL_STREAM_OUT
            ),
            totalOrderId,
            upstreamControl.streamId
            // eventIdEnd // We can't stop here because the eventIdEnd passed in params is not the same eventIdEnd in the upstream
        );
    }
    await db
        .transaction()
        .setIsolationLevel('serializable')
        .execute(async (trx) => {
            // Get our upstream data if necessary
            // Get our upstream
            const records = await findTotallyOrderedStreamEvents(
                trx,
                eventIdStart,
                eventIdEnd,
                limit,
                offset
            );
            return res.json(records);
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
        if (
            process.env
                .LIKER_STREAM_PROCESSOR_TRUTH_SAYER_UPSTREAM_URL_STREAM_OUT ===
            undefined
        ) {
            return;
        }
        const fetchUpstream = buildFetchUpstream(
            process.env
                .LIKER_STREAM_PROCESSOR_TRUTH_SAYER_UPSTREAM_URL_STREAM_OUT
        );
        await syncUpstreamFromUpstreamControl(fetchUpstream);
    } catch (e) {
        console.error(e);
    }
})();

// Get the most recent log record and notify subscribers
// Get the most recent log record and notify subscribers
(async () => {
    const result = await getMostRecentTotallyOrderedStreamEvent();
    if (result === undefined) {
        return;
    }
    // non-blocking
    notifySubscribers(result);
})();
