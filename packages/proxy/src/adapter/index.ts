export interface IProxyAdapter {
  name: string
  init(): Promise<void>
  transformRequest(request: Request): Promise<Request>
  transformResponse(response: Response): Promise<Response>
}
