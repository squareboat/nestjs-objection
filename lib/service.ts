import { Inject } from '@nestjs/common';
import { BaseModel } from './baseModel';
import { SquareboatNestObjection } from './constants';
import { DatabaseOptions } from './options';
import Knex from 'knex';

export class ObjectionService {
  constructor(
    @Inject(SquareboatNestObjection.databaseOptions) config: DatabaseOptions,
  ) {
    BaseModel.knex(Knex(config.connection));
  }
}
