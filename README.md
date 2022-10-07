# bull-herder
Bull queue job manager for distributed systems

[![Build Status](https://github.com/kibertoad/bull-herder/workflows/ci/badge.svg)](https://github.com/kibertoad/bull-herder/actions)

## Getting started

First install the package:

```bash
npm i bull-herder
```

Next, set up your jobs:

```ts
import Bull from 'bull'
import Redis from 'ioredis'

const redis = new Redis({
    host: 'localhost',
    port: 6379,
})
const queue = Bull('testQueue2', { redis: redisOptions })

const options: BullHerderOptions = {
    redis,
    redisPrefix: 'herder',
}

const taskOptions: TaskDefinition = {
    concurrency: 1,
    id: 'someTaskId',
    queue,
    jobOptions: {
        // add relevant options, e. g. recurrency here
    },
}

// This will ensure that at least the amount of jobs specified by concurrency were created by the system
// If not, creates jobs until specified concurrency level is reached (using internal counter, not relying on bull data)
// If an equal or larger amount of jobs was already created, does nothing
await spawnTasks(options, tasks)

```

There are several caveats to the current implementation:
 * `bull-herder` does not track jobs which it did not create;
 * It is assumed that all jobs are created as recurring jobs. If something was created as a one-off job, it will still be counted forever. Do not use `bull-herder` in queues that rely on one-off jobs.
 * Excessive jobs are not deleted;
