import { FetchGraphOptions } from "objection";

export type GenericFunction = (...args: any[]) => any;
export type GenericClass = Record<string, any>;
export type Keys<T> = keyof T;

export type ModelKeys<T> = {
  [P in keyof T]?: any;
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
