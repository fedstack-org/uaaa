import { ConfigManager, type IConfig } from './config/index.js'

export class App {
  config

  constructor(configInit: IConfig) {
    this.config = new ConfigManager(this, configInit)
  }

  async init() {
    //
  }

  async start() {
    //
  }

  async stop() {
    //
  }
}
