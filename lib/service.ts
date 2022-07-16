import { Inject, Injectable } from "@nestjs/common";
import { BaseModel } from "./baseModel";
import { SquareboatNestObjection } from "./constants";
import { DatabaseOptions } from "./options";
import Knex, { Knex as KnexType } from "knex";
import { ConnectionNotFound } from "./exceptions";

@Injectable()
export class ObjectionService {
  static config: DatabaseOptions;
  static dbConnections: Record<string, KnexType>;

  constructor(
    @Inject(SquareboatNestObjection.databaseOptions) config: DatabaseOptions
  ) {
    const defaultConnection = config.connections[config.default];
    ObjectionService.config = config;
    ObjectionService.dbConnections = {};
    BaseModel.knex(Knex(defaultConnection));
    for (const conName in config.connections) {
      ObjectionService.dbConnections[conName] = Knex(
        config.connections[conName]
      );
    }
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

    return ObjectionService.dbConnections[
      conName ? conName : ObjectionService.config.default
    ];
  }
}
