import type { IUserClaims } from '@uaaa/server'

export interface ICandidateClaims {
  username?: string
}

export const getCandidateClaims = (claims: Partial<IUserClaims>): ICandidateClaims | null => {
  if (!claims?.username) return null
  return {
    username: claims.username.value
  }
}

export const restoreUserClaims = (claims: ICandidateClaims): Partial<IUserClaims> => {
  const result: Partial<IUserClaims> = {}
  if (claims.username) {
    result.username = { value: claims.username }
  }
  return result
}
