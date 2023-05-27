import { Model } from "objection";
import { pick } from "./helpers";
import { LoadRelOptions, LoadRelSchema } from "./interfaces";
import { CustomQueryBuilder } from "./queryBuilder";

export class BaseModel extends Model {
  readonly id!: number;

  /**
   * Specifies the connection to be used by the model.
   */
  static connection: string;

  QueryBuilderType!: CustomQueryBuilder<this>;

  static QueryBuilder = CustomQueryBuilder;
  static useLimitInFirst = true;

  async $forceLoad(
    expression: LoadRelSchema,
    options?: LoadRelOptions
  ): Promise<void> {
    await this.$fetchGraph(expression, { ...options, skipFetched: false });
  }

  async $load(
    expression: LoadRelSchema,
    options?: LoadRelOptions
  ): Promise<void> {
    await this.$fetchGraph(expression, {
      skipFetched: true,
      ...(options || {}),
    });

    return;
  }
}
