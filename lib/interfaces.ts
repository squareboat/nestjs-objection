import { BaseModel } from "./baseModel";
import { FetchGraphOptions, PartialModelObject } from "objection";

export type GenericFunction = (...args: any[]) => any;
export type GenericClass = Record<string, any>;
export type ModelKeys<T extends BaseModel> = PartialModelObject<T> & {
  [key: string]: any;
};

export interface Pagination<T> {
  data: T[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    perPage: number;
    total: number;
  };
}

export interface SortableSchema {
  sort?: string;
}

export interface ObjectionModel {
  $fetchGraph?: GenericFunction;
  $load?(exp: LoadRelSchema): Promise<void>;
}

export interface NestedLoadRelSchema {
  $recursive?: boolean | number;
  $relation?: string;
  $modify?: string[];
  [key: string]:
    | boolean
    | number
    | string
    | string[]
    | NestedLoadRelSchema
    | undefined;
}

export interface LoadRelSchema {
  [key: string]: boolean | NestedLoadRelSchema;
}

export type LoadRelOptions = FetchGraphOptions;
