import Redis from 'ioredis'
import { Mutex } from 'redis-semaphore'
import type { JobOptions, Queue } from 'bull'

const defaultTaskSpawnLockTimeout = 1000 * 60 * 5

export type TaskDefinition = {
  id: string
  queue: Queue
  payload?: Record<string, any>
  concurrency: number
  jobOptions: JobOptions
}

export type BullHerderOptions = {
  redis: Redis
  redisPrefix: string
  taskSpawnLockTimeout?: number
}

export async function spawnTasks(options: BullHerderOptions, tasks: TaskDefinition[]) {
  const { redis } = options
  const taskSpawnLockTimeout = options.taskSpawnLockTimeout || defaultTaskSpawnLockTimeout

  for (let task of tasks) {
    const mutex = new Mutex(options.redis, `${options.redisPrefix}:locks:${task.id}`, {
      lockTimeout: taskSpawnLockTimeout,
    })
    const isLocked = await mutex.tryAcquire()
    if (!isLocked) {
      continue
    }
    try {
      const taskCountString = await redis.get(resolveTaskCountId(options.redisPrefix, task.id))
      const taskCount = taskCountString ? Number.parseInt(taskCountString) : 0

      if (taskCount < task.concurrency) {
        await spawnMissingTasks(options, taskCount, task)
      }
    } finally {
      await mutex.release()
    }
  }
}

async function spawnMissingTasks(
  options: BullHerderOptions,
  taskCount: number,
  task: TaskDefinition
) {
  let currentTaskCount = taskCount

  while (currentTaskCount < task.concurrency) {
    currentTaskCount++
    const id = `${task.id}-${currentTaskCount}`
    void task.queue.add(id, task.payload, {
      ...task.jobOptions,
      jobId: id,
    })
    await options.redis.set(resolveTaskCountId(options.redisPrefix, task.id), currentTaskCount)
  }
}

function resolveTaskCountId(prefix: string, taskId: string) {
  return `${prefix}:task-count:${taskId}`
}
