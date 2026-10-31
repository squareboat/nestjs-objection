import { Inject, Injectable, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { SquareboatNestObjection } from "./constants";
import { DatabaseOptions, DbConnectionOptions } from "./options";
import Knex, { Knex as KnexType } from "knex";
import { ConnectionNotFound } from "./exceptions";
import { BaseModel } from "./baseModel";

/** How long shutdown waits for the connection pools to close, by default. */
const DEFAULT_SHUTDOWN_TIMEOUT = 5000;

@Injectable()
export class ObjectionService implements OnModuleInit, OnApplicationShutdown {
  static config: DatabaseOptions;
  static dbConnections: Record<string, KnexType>;
  private readonly connections: Record<string, KnexType> = {};
  private readonly shutdownTimeout: number;

  constructor(
    @Inject(SquareboatNestObjection.databaseOptions) config: DatabaseOptions
  ) {
    ObjectionService.config = config;
    ObjectionService.dbConnections = {};
    this.shutdownTimeout = config.shutdownTimeout ?? DEFAULT_SHUTDOWN_TIMEOUT;
    for (const conName in config.connections) {
      const { validateQuery, ...knexConfig } = config.connections[conName];
      this.connections[conName] = Knex(knexConfig);
      ObjectionService.dbConnections[conName] = this.connections[conName];
    }

    if (!this.connections[config.default]) {
      throw new ConnectionNotFound(config.default);
    }
    // models share the default connection's pool (no second pool for it)
    BaseModel.knex(this.connections[config.default]);
  }

  async onModuleInit() {
    for (const connName in ObjectionService.dbConnections) {
      console.debug(
        `[@squareboat/nestjs-objection] '${connName}' validating connection...`
      );
      const connection = ObjectionService.dbConnections[connName];
      const dbOptions = ObjectionService.getOptions(connName);

      try {
        await connection.raw(dbOptions.validateQuery || "select 1+1 as result");
        console.debug(
          `[@squareboat/nestjs-objection] '${connName}' connection validated...`
        );
      } catch (_e) {
        const e = _e as Error;
        console.error(
          `[@squareboat/nestjs-objection] '${connName}' connection failed, REASON: ${e.message}`
        );
      }
    }
  }

  /**
   * Closes every connection pool when the app shuts down, so open connections
   * do not keep the process alive. Waits at most `shutdownTimeout` ms (a pool
   * waits for checked-out connections, e.g. an unfinished transaction).
   */
  async onApplicationShutdown(): Promise<void> {
    const timeout = this.shutdownTimeout;
    await Promise.all(
      Object.entries(this.connections).map(async ([connName, connection]) => {
        let timer: NodeJS.Timeout | undefined;
        const timedOut = new Promise<boolean>((resolve) => {
          timer = setTimeout(() => resolve(true), timeout);
          timer.unref();
        });
        const closed = connection.destroy().then(
          () => false,
          (e: Error) => {
            console.error(
              `[@squareboat/nestjs-objection] '${connName}' closing the connection pool failed, REASON: ${e.message}`
            );
            return false;
          }
        );
        if (await Promise.race([closed, timedOut])) {
          console.warn(
            `[@squareboat/nestjs-objection] '${connName}' connection pool not closed within ${timeout}ms`
          );
        }
        clearTimeout(timer);
      })
    );
  }

  static getOptions(conName?: string): DbConnectionOptions {
    // check if conName is a valid connection name
    conName = conName || ObjectionService.config.default;

    const isConNameValid = Object.keys(
      ObjectionService.config.connections
    ).includes(conName);

    if (conName && !isConNameValid) {
      throw new ConnectionNotFound(conName);
    }

    return ObjectionService.config.connections[conName];
  }

  static connection(conName?: string): KnexType {
    // check if conName is a valid connection name
    conName = conName || ObjectionService.config.default;

    const isConNameValid = Object.keys(
      ObjectionService.config.connections
    ).includes(conName);

    if (conName && !isConNameValid) {
      throw new ConnectionNotFound(conName);
    }

    return ObjectionService.dbConnections[conName];
  }
}
