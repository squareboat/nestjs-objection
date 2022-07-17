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
    options: LoadRelOptions
  ): Promise<void> {
    await this.$fetchGraph(expression, options);
  }

  async $load(
    expression: LoadRelSchema,
    options: LoadRelOptions
  ): Promise<void> {
    type ObjectKey = keyof typeof this;

    const getKeys = (obj: Record<string, any>): Array<Record<string, any>> => {
      const p = [];
      for (const key in obj) {
        const o = { parent: key, children: [] as Record<string, any>[] };
        if (key === "$recursive" || key === "$relation" || key === "$modify") {
          continue;
        }
        const exp = obj[key];
        if (typeof exp === "object") {
          o.children = getKeys(exp);
        }
        p.push(o);
      }

      return p;
    };

    const p = getKeys(expression);

    const toBeLoadedRelations = {} as Record<string, any>;
    const getUnloadedRelationsList = async (
      model: this,
      rel: Array<any>,
      parent: string
    ) => {
      for (const o of rel) {
        if (!model || !model[o.parent as unknown as ObjectKey]) {
          toBeLoadedRelations[
            parent !== "" ? `${parent}.${o.parent}` : o.parent
          ] = true;
        }

        if (o.children.length > 0) {
          getUnloadedRelationsList(
            model[o.parent as ObjectKey] as unknown as this,
            o.children,
            o.parent
          );
        }
      }
    };

    await getUnloadedRelationsList(this, p, "");
    const promises = [];
    const alreadyLoading = [] as string[];
    for (const key in toBeLoadedRelations) {
      const [parent] = key.split(".");

      if (!alreadyLoading.includes(parent)) {
        promises.push(this.$fetchGraph(pick(expression, parent), options));
        alreadyLoading.push(parent);
      }
    }

    await Promise.all(promises);

    return;
  }
}
