// Import the 'express' module
import express from 'express';
import { db } from './database';
import {
    createStreamOutFromStreamEvent,
    findStreamOutsGreaterThanStreamId,
    findTotallyOrderedStreamEventsGreaterThanStreamId,
    getMostRecentStreamOut,
} from './streamOutStore';
import {
    createHttpSubscriber,
    deleteHttpSubscriber,
    findHttpSubscribers,
} from './httpSubscriberStore';
import {
    StreamEventIdDuplicateException,
    StreamEventOutOfSequenceException,
} from './exceptions';
import onEvent from './transmissionControl/onEvent';
import { buildFetchUpstream } from './transmissionControl/buildFetchUpstream';
import { syncUpstream } from './transmissionControl/syncUpstream';
import { subscribe } from './subscribe';
import { notifySubscribers } from './transmissionControl/notifySubscribers';
import { getMostRecentTotallyOrderedStreamEvent } from './getMostRecentTotallyOrderedStreamEvent';

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
    // Get the query parameter 'afterId' from the request
    const afterId = Number(req.query.afterId);
    await db
        .transaction()
        .setIsolationLevel('serializable')
        .execute(async (trx) => {
            const records =
                await findTotallyOrderedStreamEventsGreaterThanStreamId(
                    trx,
                    afterId
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
        await syncUpstream(fetchUpstream);
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
