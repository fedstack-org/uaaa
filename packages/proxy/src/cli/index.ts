#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { Cli, Builtins, Command, Option } from 'clipanion'
import { App } from '../index.js'

abstract class BaseCommand extends Command {
  config = Option.String(`--config`, { env: 'UAAA_SERVER_CONFIG_PATH' })
  private _app?: Promise<App>

  private async _getApp() {
    if (!this.config) throw new Error(`Config path is required`)
    const configText = await readFile(this.config, `utf8`)
    const config = JSON.parse(configText)
    const app = new App(config)
    await app.init()
    return app
  }

  async getApp() {
    return (this._app ??= this._getApp())
  }
}

class ServeCommand extends BaseCommand {
  static paths = [[`serve`], [`s`]]
  static usage = Command.Usage({})

  async execute() {
    const app = await this.getApp()
    await app.start()
  }
}

const [node, app, ...args] = process.argv

const cli = new Cli({
  binaryLabel: `UAAA Server`,
  binaryName: `uaaa-server`
})

cli.register(ServeCommand)
cli.register(Builtins.HelpCommand)
cli.register(Builtins.VersionCommand)
cli.runExit(args)
