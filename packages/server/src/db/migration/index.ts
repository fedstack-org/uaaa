import { Hookable } from 'hookable'
import { MongoServerError } from 'mongodb'
import { generateKeyPair } from 'node:crypto'
import { promisify } from 'node:util'
import { logger, wait } from '../../util/index.js'
import type { DbManager } from '../index.js'

export const databaseVersion = 4

export interface IMigrationImpl {
  (this: MigrationManager): Promise<void>
}

export class MigrationManager extends Hookable<{
  preMigration: (currentVersion: number) => void
  postMigration: (currentVersion: number) => void
}> {
  private migrations = new Map<number, IMigrationImpl>()

  constructor(public db: DbManager) {
    super()
    this._loadMigrations()
  }

  private _loadMigrations() {
    this.migrations.set(0, async function () {
      await this.db.installations.createIndex({ userId: 1, appId: 1 }, { unique: true })
      await this.db.tokens.createIndex(
        { code: 1 },
        { unique: true, partialFilterExpression: { code: { $exists: true } } }
      )
      await this.db.tokens.createIndex(
        { refreshToken: 1 },
        { unique: true, partialFilterExpression: { refreshToken: { $exists: true } } }
      )
      await this.db.users.createIndex({ 'claims.username.value': 1 }, { unique: true })
      await this.db.credentials.createIndex(
        { userId: 1, type: 1, userIdentifier: 1 },
        { unique: true, partialFilterExpression: { userIdentifier: { $exists: true } } }
      )
      await this.db.credentials.createIndex(
        { type: 1, globalIdentifier: 1 },
        { unique: true, partialFilterExpression: { globalIdentifier: { $exists: true } } }
      )

      const { privateKey, publicKey } = await promisify(generateKeyPair)('rsa', {
        modulusLength: 2048
      })
      await this.db.jwkpairs.insertOne({
        publicKey: publicKey.export({ format: 'jwk' }),
        privateKey: privateKey.export({ format: 'jwk' })
      })
      await this.db.setSystemConfig('version', 1)
    })

    this.migrations.set(1, async function () {
      // Since UAAA v0.1.0
      // Token Document is changed, delete all of old items
      await this.db.tokens.deleteMany({})
      // Also Session Document is changed
      await this.db.sessions.deleteMany({})

      // App version is added
      await this.db.apps.updateMany({}, { $set: { version: 0 } })
      await this.db.installations.updateMany({}, { $set: { version: 0 } })

      await this.db.setSystemConfig('version', 2)
    })

    this.migrations.set(2, async function () {
      // Add delegated session
      await this.db.sessions.createIndex(
        { appId: 1, userId: 1 },
        { unique: true, partialFilterExpression: { appId: { $exists: true } } }
      )

      await this.db.setSystemConfig('version', 3)
    })

    this.migrations.set(3, async function () {
      // Migrate openid.minSecurityLevel to baseSecurityLevel using aggregation pipeline
      await this.db.apps.updateMany({}, [
        {
          $set: {
            baseSecurityLevel: {
              $ifNull: ['$openid.minSecurityLevel', 1]
            }
          }
        }
      ])

      // Remove the old minSecurityLevel field
      await this.db.apps.updateMany({}, { $unset: { 'openid.minSecurityLevel': '' } })

      await this.db.setSystemConfig('version', 4)
    })
  }

  private async _startMigration() {
    do {
      const currentVersion = await this.db.getSystemConfig('version', 0)
      logger.info(`Migrating database from ${currentVersion}`)
      const migrationImpl = this.migrations.get(currentVersion)
      if (!migrationImpl) {
        throw new Error(`No migration found for version ${currentVersion}`)
      }
      await this.callHook('preMigration', currentVersion)
      await migrationImpl.call(this)
      await this.callHook('postMigration', currentVersion)
    } while (databaseVersion !== (await this.db.getSystemConfig('version', 0)))
  }

  async startMigration() {
    for (;;) {
      if (databaseVersion === (await this.db.getSystemConfig('version', 0))) break
      try {
        await this.db.insertSystemConfig('migration', true)
        logger.info('Starting database migration')
        await this._startMigration()
        await this.db.delSystemConfig('migration')
        logger.info('Database migration completed')
      } catch (e) {
        if (e instanceof MongoServerError && e.code === 11000) {
          logger.info('Waiting for database migration')
          await wait(100)
        } else {
          throw e
        }
      }
    }
  }
}
