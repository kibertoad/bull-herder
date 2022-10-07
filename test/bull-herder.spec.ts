import Bull from 'bull'
import Redis from 'ioredis'
import { Queue } from 'bull'
import { BullHerderOptions, spawnTasks, TaskDefinition } from '../lib/bull-herder'
import { waitUntilTrue } from './waitUtils'

const redisOptions = {
  host: 'localhost',
  port: 6379,
  password: 'sOmE_sEcUrE_pAsS',
}

describe('bull-herder', () => {
  let redis: Redis
  let queue: Queue
  let options: BullHerderOptions
  let taskOptions: Omit<TaskDefinition, 'concurrency'>
  beforeEach(async () => {
    redis = new Redis(redisOptions)
    await redis.flushall('SYNC')
    queue = Bull('testQueue2', { redis: redisOptions })

    options = {
      redis,
      redisPrefix: 'herder',
    }

    taskOptions = {
      id: 'spawn',
      queue,
      jobOptions: {},
    }
  })
  afterEach(async () => {
    await redis.disconnect()
    await queue.close(true)
  })

  describe('spawnTasks', () => {
    it('creates tasks if none exist', async () => {
      const tasks: TaskDefinition[] = [
        {
          ...taskOptions,
          concurrency: 1,
        },
      ]

      await spawnTasks(options, tasks)
      await assertTasks(1, queue)
    })

    it('creates only missing tasks if some exist', async () => {
      const tasks: TaskDefinition[] = [
        {
          ...taskOptions,
          concurrency: 2,
        },
      ]

      await spawnTasks(options, tasks)
      await assertTasks(2, queue)

      await spawnTasks(options, [
        {
          ...taskOptions,
          concurrency: 3,
        },
      ])
      await assertTasks(3, queue)
    })

    it('creates nothing if all tasks exist', async () => {
      const tasks: TaskDefinition[] = [
        {
          ...taskOptions,
          concurrency: 5,
        },
      ]

      await spawnTasks(options, tasks)
      await assertTasks(5, queue)

      await spawnTasks(options, [
        {
          ...taskOptions,
          concurrency: 5,
        },
      ])
      await assertTasks(5, queue)
    })
  })
})

async function assertTasks(expectedAmount: number, queue: Queue) {
  await waitUntilTrue(async () => {
    const runningTasks = await queue.getJobs(['waiting'])
    return runningTasks.length === expectedAmount
  })

  const runningTasks = await queue.getJobs(['waiting'])
  expect(runningTasks.length).toBe(expectedAmount)
}
