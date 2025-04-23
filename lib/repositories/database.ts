import { Expression, PrimitiveValue } from 'objection';
import { Knex, Knex as KnexType } from "knex";
import { RepositoryContract } from './contract';
import { BaseModel } from '../baseModel';
import { CustomQueryBuilder } from '../queryBuilders/custom';
import { LoadRelSchema, ModelKeys, ObjectionModel } from '../interfaces';
import { ObjectionService } from '../service';
import { ModelNotFound } from '../exceptions';
import { RepositoryError } from "../exceptions/repoError";

export class DatabaseRepository<T extends ObjectionModel>
  implements RepositoryContract<T>
{
  model: any;
  knexConnection: KnexType | null = null;
  trx: Knex.Transaction | null = null;
  currentforUpdate: Record<string, any> | null = null;

  public bindCon(conName?: string): DatabaseRepository<T> {
    const newRepository = new (<any>(
      this.constructor
    ))() as DatabaseRepository<T>;

    const connection = ObjectionService.connection(
      conName || this.model.connection,
    );
    newRepository.knexConnection = connection;

    return newRepository;
  }

  setModel(model: BaseModel): this {
    this.model = model;
    return this;
  }

  /**
   * Get all rows
   */
  async all(): Promise<T[]> {
    return this.query() as unknown as Promise<T[]>;
  }

  /**
   * Get first instance with the matching criterias
   * @param inputs
   * @param error
   */
  async firstWhere(
    inputs: ModelKeys<T>,
    error?: boolean,
    eager?: LoadRelSchema,
  ): Promise<T | undefined> {
    const query = this.query<T>();

    if (eager) {
      query.withGraphFetched(eager);
    }

    const model = await query.findOne(inputs);

    if (error && !model) this.raiseError();

    return model;
  }

  /**
   * Get all instances with the matching criterias
   * @param inputs
   * @param whereNot
   * @param error
   */
  async getWhere(inputs: ModelKeys<T>, error = true, whereNot?: ModelKeys<T>): Promise<T[]> {
    const query = this.query<T[]>();

    for (const key in inputs) {
      Array.isArray(inputs[key] as unknown as any)
        ? query.whereIn(
            key,
            inputs[key] as unknown as Expression<PrimitiveValue>[],
          )
        : query.where(key, inputs[key] as unknown as string);
    }

    if (whereNot) {
      for (const key in whereNot) {
        Array.isArray(whereNot[key] as unknown as any)
          ? query.whereNotIn(
              key,
              whereNot[key] as unknown as Expression<PrimitiveValue>[],
            )
          : query.whereNot(key, whereNot[key] as unknown as string);
      }
    }
    const models = await query;
    if (error && models.length == 0) this.raiseError();

    return models;
  }

  /**
   * Create a new model with given inputs
   * @param inputs
   */
  async create(inputs: ModelKeys<T>): Promise<T> {
    return this.query().insert(inputs).returning("*") as unknown as T;
  }

  /**
   * Update or Create model with given condition and values
   * @param conditions
   * @param values
   */
  async createOrUpdate(
    conditions: ModelKeys<T>,
    values: ModelKeys<T>,
    isConditionLinkedWithValue = true,
  ): Promise<T | undefined> {
    const model = await this.firstWhere(conditions, false);
    if (!model) {
      let payload = { ...values };
      if (isConditionLinkedWithValue) {
        payload = { ...payload, ...conditions };
      }
      return this.create(payload);
    }

    await this.update(model, values);
    return await this.firstWhere(conditions, false);
  }

  /**
   * First or Create model with given condition and values
   *
   * @param conditions
   * @param values
   */
  async firstOrNew(conditions: ModelKeys<T>, values: ModelKeys<T>): Promise<T> {
    const model = await this.firstWhere(conditions, false);
    if (model) return model;
    return await this.create({ ...conditions, ...values });
  }

  /**
   * Update the given model with values
   * @param model
   * @param setValues
   */
  async update(model: T, setValues: ModelKeys<T>): Promise<number | null> {
    const query = this.query<number>();
    if (!model.id) return null;

    query.findById(model.id).patch(setValues);
    return await query;
  }

  /**
   * Update all models where condition is matched
   * @param where
   * @param setValues
   */
  async updateWhere(
    where: ModelKeys<T>,
    setValues: ModelKeys<T>
  ): Promise<number | null> {
    const query = this.query<number>();
    query.where(where).patch(setValues);
    return query;
  }

  /**
   * Check if any model exists where condition is matched
   * @param params
   */
  async exists(params: T): Promise<boolean> {
    const query = this.query();
    query.where(params);
    return !!(await query.onlyCount());
  }

  /**
   * Get count of rows matching a criteria
   * @param params
   */
  async count(params: T): Promise<number> {
    const query = this.query();
    query.where(params);
    return await query.onlyCount();
  }

  /**
   * Delete a model
   *
   * @param model
   */
  async delete(model: T | number): Promise<boolean> {
    const id = typeof model === 'number' ? model : model.id;
    if (id === undefined) {
      throw new Error('Invalid model identifier');
    }
    return !!+(await this.query().deleteById(id));
  }

  /**
   * Delete documents where query is matched.
   *
   * @param inputs T
   */
  async deleteWhere<T>(inputs: T): Promise<boolean> {
    const query = this.query();

    for (const key in inputs) {
      Array.isArray(inputs[key])
        ? query.whereIn(key, inputs[key] as unknown as any[])
        : query.where(key, inputs[key] as unknown as any);
    }
    return !!+(await query.delete());
  }

  /**
   * Refresh a model
   *
   * @param model
   */
  async refresh(model: T, eager?: LoadRelSchema): Promise<T | undefined> {
    const query = this.query<T>();

    if (eager) {
      query.withGraphFetched(eager);
    }

    const id = typeof model === 'number' ? model : model.id;
    if (id === undefined) {
      throw new Error('Invalid model identifier');
    }
    return model ? await query.findById(id) : undefined;
  }

  /**
   * Relate ids to a model
   * @param model
   * @param relation
   * @param payload
   */
  async attach(
    model: T,
    relation: string,
    payload: number | string | Array<number | string> | Record<string, any>,
  ): Promise<void> {
    if (!model.$relatedQuery) {
      throw new Error('Model related query function is undefined');
    }
    await model.$relatedQuery(relation).relate(payload);
    return;
  }

  /**
   * Sync relation with a model
   * @param model
   * @param relation
   * @param payload
   */
  async sync(model: T, relation: string, payload: any[]): Promise<void> {
    if (!model.$relatedQuery) {
      throw new Error('Model related query function is undefined');
    }
    await model.$relatedQuery(relation).unrelate();
    if (Array.isArray(payload) && payload.length > 0) {
      await model.$relatedQuery(relation).relate(payload);
    }
    return;
  }

  /**
   * Fetch a chunk and run callback
   */
  async chunk(
    where: T,
    size: number,
    cb: (models: T[]) => void,
  ): Promise<void> {
    const query = this.query();
    query.where(where);
    await query.chunk(cb, size);
    return;
  }

  /**
   * Throws model not found exception.
   *
   * @throws ModelNotFoundException
   */
  raiseError(): void {
    throw new ModelNotFound(this.getEntityName());
  }

  /**
   * Returns new Query Builder Instance
   */
  query<R = T>(): CustomQueryBuilder<any, R> {
    if (!this.knexConnection) {
      this.knexConnection = ObjectionService.connection(this.model.connection);
    }
    return this.model.query(this.knexConnection);
  }

  getEntityName(): string {
    return this.model.name;
  }

  /**
   * Update rows where condition is matched and return modified rows
   * @param where
   * @param setValues
   * @param returnOne Set this true when you want only the first object to be returned
   */
  async updateAndReturn(
    where: T,
    setValues: ModelKeys<T>,
    returnOne: boolean = false,
  ): Promise<T | T[]> {
    const query = this.query();
    const records = await query.where(where).patch(setValues).returning('*');
    if (returnOne || records.length == 1) return records[0];
    return records;
  }

  /**
   * Bulk insert new models with given inputs,
   * currently only works in mysql.
   * @param inputs
   */
  async bulkInsert(inputs: ModelKeys<T>[]): Promise<T[]> {
    return this.query().insert(inputs).returning("*") as unknown as T[];
  }

  async startTrx(
    options?: Knex.TransactionConfig
  ): Promise<RepositoryContract<T>> {
    const newRepository = new (<any>(
      this.constructor
    ))() as RepositoryContract<T>;

    if (!this.knexConnection) {
      newRepository.knexConnection = ObjectionService.connection(
        this.model.connection
      );
    }

    if (newRepository.knexConnection) {
      newRepository.trx = await newRepository.knexConnection.transaction(
        options || {}
      );
    }

    return newRepository;
  }

  bindTrx(trx: Knex.Transaction): RepositoryContract<T> {
    const newRepository = new (<any>(
      this.constructor
    ))() as RepositoryContract<T>;

    if (!this.knexConnection) {
      newRepository.knexConnection = ObjectionService.connection(
        this.model.connection
      );
    }
    newRepository.trx = trx;

    return newRepository;
  }

  getTrx(): Knex.Transaction<any, any[]> | null {
    return this.trx;
  }

  /**
   * Commits the transaction
   */
  async commitTrx(): Promise<void> {
    if (!this.trx) {
      throw new RepositoryError(
        "Commit method being run on null. No Transaction started!"
      );
    }

    await this.trx.commit();
  }

  /**
   * Rollbacks the transaction
   */
  async rollbackTrx(): Promise<void> {
    if (!this.trx) {
      throw new RepositoryError(
        "Commit method being run on null. No Transaction started!"
      );
    }

    await this.trx.rollback();
  }

  forUpdate(options?: Record<string, any>): this {
    this.currentforUpdate = options || {};
    return this;
  }

  private clearForUpdate(): this {
    this.currentforUpdate = null;
    return this;
  }
}
