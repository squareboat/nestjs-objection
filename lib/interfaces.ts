import { FetchGraphOptions } from 'objection';

export type GenericFunction = (...args: any[]) => any;
export type GenericClass = Record<string, any>;
export type ModelKeys<T> = Partial<T> & {
  [key: string]: any;
};

export interface Pagination<T> {
  data: T[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    perPage: number;
    total: number;
    count?: number;
  };
  extras?: Record<string, any>;
}

export interface SortableSchema {
  q?: string;
  sort?: string;
  sortOrder?: string;
  sortValue?: string;
  eager?: LoadRelSchema;
  page?: number;
  perPage?: number;
  paginate?: boolean;
}

export interface ObjectionModel {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  $relatedQuery?: GenericFunction;
  $fetchGraph?: GenericFunction;
  $load?(expression: LoadRelSchema, options?: LoadRelOptions): Promise<void>;
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
