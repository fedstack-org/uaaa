import type { ITokenPayload } from '@uaaa/core'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { IncomingHttpHeaders } from 'node:http'
import type { IncomingHttpHeaders as Http2IncomingHttpHeaders } from 'node:http2'

export interface IProxyAdapterTransform {
  rewriteRequestHeaders?: (
    headers: IncomingHttpHeaders | Http2IncomingHttpHeaders
  ) => IncomingHttpHeaders | Http2IncomingHttpHeaders
}

export interface IProxyAdapter {
  name: string
  getTransform: (
    req: FastifyRequest,
    rep: FastifyReply,
    token: ITokenPayload
  ) => Promise<IProxyAdapterTransform>
}
