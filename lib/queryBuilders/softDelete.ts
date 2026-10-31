import {
  ForClassMethod,
  Model,
  ModelClass,
  Page,
  PartialModelObject,
  QueryBuilder,
} from "objection";
import { CustomQueryBuilder } from "./custom";

/** The column soft delete reads and writes. */
const DELETED_AT = "deleted_at";

/**
 * The property to patch so that the `deleted_at` column is written: `deletedAt`
 * when the model (snakeCaseMappers) or knex (knexSnakeCaseMappers) maps column
 * names, `deleted_at` without mappers.
 */
function deletedAtProperty(builder: QueryBuilder<any, any>): string {
  const property = builder.modelClass().columnNameToPropertyName(DELETED_AT);
  if (property !== DELETED_AT) return property;

  try {
    const wrapIdentifier = (builder as any).unsafeKnex()?.client?.config
      ?.wrapIdentifier;
    if (
      typeof wrapIdentifier === "function" &&
      wrapIdentifier("deletedAt", (value: string) => value, {}) === DELETED_AT
    ) {
      return "deletedAt";
    }
  } catch {
    // a custom wrapIdentifier we cannot probe: write the column name
  }
  return DELETED_AT;
}

export class SoftDeleteQueryBuilder<
  M extends Model,
  R = M[]
> extends CustomQueryBuilder<M, R> {
  static forClass: ForClassMethod = (modelClass) => {
    const qb = QueryBuilder.forClass.call(this, modelClass);
    qb.onBuild((builder) => {
      const tableName = builder.tableRefFor(modelClass as any);
      // only filter top-level reads; partial builders (relations, subqueries)
      // and update/delete queries are left alone
      const isPartial = (builder as any)["isPartial"]();
      if (!isPartial && builder.isFind() && !builder.context().withArchived) {
        builder.whereNull(`${tableName}.${DELETED_AT}`);
      }
    });
    return qb as any;
  };

  withArchived() {
    this.context().withArchived = true;
    return this;
  }

  /**
   * Archives the matching rows: sets their `deleted_at` column to now.
   */
  softDelete() {
    return this.patch({
      [deletedAtProperty(this)]: new Date(),
    } as unknown as PartialModelObject<M>);
  }
}
