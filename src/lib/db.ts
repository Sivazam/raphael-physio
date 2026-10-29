import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client with a deployment safety net.
 *
 * On serverless hosts the git-ignored `.env` (DATABASE_URL) never travels
 * with the deployment. Depending on the Prisma version, a missing env var
 * can throw either at construction (which would crash this module's import
 * and take every page down with it) or at first query. Wrapping the
 * constructor means the worst case degrades to per-query rejections —
 * which the public site's data layer (@/lib/catalog, @/lib/settings)
 * already handles by serving the baked-in content snapshot.
 */
function createPrismaClient(): PrismaClient {
  try {
    return new PrismaClient({
      log: ['error', 'warn'],
    })
  } catch (err) {
    console.warn(
      '[db] Prisma client unavailable — serving baked content. ' +
        (err instanceof Error ? err.message.split('\n')[0] : '')
    )
    return unreachableProxy()
  }
}

/**
 * A stand-in that rejects every model access / method call, mimicking a
 * failed query so existing `.catch()` fallbacks keep working unchanged.
 */
function unreachableProxy(): PrismaClient {
  const reject = () =>
    Promise.reject(new Error('database unavailable (no DATABASE_URL)'))
  const proxy: unknown = new Proxy(function () {} as unknown as PrismaClient, {
    get(_target, prop, receiver) {
      if (typeof prop === 'symbol') return Reflect.get(_target, prop, receiver)
      if (prop === 'then') return undefined // never a thenable
      return proxy // model delegates (db.service) and methods chain alike
    },
    apply() {
      return reject()
    },
  })
  return proxy as PrismaClient
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
