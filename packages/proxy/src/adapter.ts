import type { ITokenPayload } from '@uaaa/core'

export interface IProxyAdapter {
  name: string
  transformRequest: (req: Request, token: ITokenPayload) => Promise<Request>
}
