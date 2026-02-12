import { tSecurityLevel } from '@uaaa/core'
import { type } from 'arktype'
import { rAppId } from '../../util/index.js'

export const tAppProvidedPermission = type({
  name: 'string',
  description: 'string',
  path: 'string'
})
export type IAppProvidedPermission = typeof tAppProvidedPermission.infer

export const tAppRequestedClaim = type({
  name: 'string',
  reason: 'string',
  'required?': 'boolean',
  'verified?': 'boolean'
})
export type IAppRequestedClaim = typeof tAppRequestedClaim.infer

export const tAppRequestedPermission = type({
  perm: 'string',
  reason: 'string',
  'required?': 'boolean'
})
export type IAppRequestedPermission = typeof tAppRequestedPermission.infer

export const tAppGeneralConfig = type({
  'promoted?': 'boolean',
  'autoInstall?': type('boolean', '|', {
    'grantedPermissions?': 'string[]',
    'grantedClaims?': 'string[]'
  })
})

export type IAppGeneralConfig = typeof tAppGeneralConfig.infer

export const tAppOpenIdConfig = type({
  'additionalClaims?': 'Record<string,string>',
  'allowPublicClient?': 'boolean',
  'defaultPublicClient?': 'boolean',
  'logoutUrls?': 'string[]',
  'ignoreLocalhostCallbackPort?': 'boolean'
})
export type IAppOpenIdConfig = typeof tAppOpenIdConfig.infer

export const tChangelogItem = type({
  versionName: 'string',
  content: 'string'
})

export const tAppDcrMatcher = type({
  'softwareIds?': 'string[]',
  'clientNames?': 'string[]',
  'priority?': 'number'
})
export type IAppDcrMatcher = typeof tAppDcrMatcher.infer

export const tDelegationConfig = type({
  userId: 'string',
  requestedPermissions: tAppRequestedPermission.array()
})
export type IAppDelegationConfig = typeof tDelegationConfig.infer

export const tAppManifest = type({
  appId: type('string').narrow((id) => rAppId.test(id)),
  name: 'string',
  version: type('number').narrow((v) => Number.isSafeInteger(v) && v >= 0),
  'description?': 'string',
  'icon?': 'string',
  providedPermissions: tAppProvidedPermission.array(),
  requestedClaims: tAppRequestedClaim.array(),
  requestedPermissions: tAppRequestedPermission.array(),
  callbackUrls: 'string[]',
  variables: 'Record<string,string>',
  secrets: 'Record<string,string>',
  changelog: tChangelogItem.array(),
  'config?': tAppGeneralConfig,
  'openid?': tAppOpenIdConfig,
  'delegation?': tDelegationConfig,
  'dcr?': tAppDcrMatcher,
  securityLevel: tSecurityLevel,
  'baseSecurityLevel?': tSecurityLevel
}).narrow((manifest, ctx) => {
  if (manifest.version !== manifest.changelog.length) {
    return ctx.reject({ expected: 'version to equal changelog length' })
  }
  if (manifest.dcr && !manifest.openid?.allowPublicClient && !manifest.openid?.defaultPublicClient) {
    return ctx.reject({
      expected: 'openid.allowPublicClient or openid.defaultPublicClient when dcr is set',
      path: ['dcr']
    })
  }
  return true
})

export type IAppManifest = typeof tAppManifest.infer

export interface IAppDoc extends Omit<IAppManifest, 'appId'> {
  /** The app id is the unique app id [a-zA-Z._-]+ */
  _id: string

  /** Managed properties */
  disabled?: boolean | undefined
  secret: string
}
