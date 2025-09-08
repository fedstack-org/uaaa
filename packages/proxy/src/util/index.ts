import { pino } from 'pino'

export const logger = pino()

export const panic = (msg: string) => {
  logger.fatal(msg)
  process.exit(1)
}

export const warn = <T>(msg: string, value: T) => {
  logger.warn(msg)
  return value
}
