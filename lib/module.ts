import { DynamicModule, Module, Provider, Type } from "@nestjs/common";
import { SquareboatNestObjection } from "./constants";
import {
  DatabaseAsyncOptions,
  DatabaseAsyncOptionsFactory,
  DatabaseOptions,
} from "./options";
import { ObjectionService } from "./service";
import { DbOperationsCommand } from "./commands/migrations";
import { DatabaseUtilitiesCommand } from "./commands/utils";

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class ObjectionModule {
  /**
   * Register options
   * @param options
   */
  static register(options: DatabaseOptions): DynamicModule {
    return {
      global: options.isGlobal || false,
      module: ObjectionModule,
      imports: [],
      providers: [
        ObjectionService,
        DbOperationsCommand,
        DatabaseUtilitiesCommand,
        { provide: SquareboatNestObjection.databaseOptions, useValue: options },
      ],
      exports: [],
    };
  }

  /**
   * Register Async Options
   */
  static registerAsync(options: DatabaseAsyncOptions): DynamicModule {
    return {
      global: options.isGlobal || false,
      module: ObjectionModule,
      imports: [],
      providers: [
        this.createOptionsProvider(options),
        ObjectionService,
        DbOperationsCommand,
        DatabaseUtilitiesCommand,
      ],
      exports: [],
    };
  }

  private static createOptionsProvider(
    options: DatabaseAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: SquareboatNestObjection.databaseOptions,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const inject = [
      (options.useClass || options.useExisting) as Type<DatabaseOptions>,
    ];

    return {
      provide: SquareboatNestObjection.databaseOptions,
      useFactory: async (optionsFactory: DatabaseAsyncOptionsFactory) =>
        await optionsFactory.createOptions(),
      inject,
    };
  }
}
