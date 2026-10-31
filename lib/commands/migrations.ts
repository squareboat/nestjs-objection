import { Inject, Injectable } from "@nestjs/common";
import * as pc from "picocolors";
import { Command, ConsoleIO } from "@squareboat/nest-console";
import { ObjectionService } from "../service";
import { SquareboatNestObjection } from "../constants";
import { DatabaseOptions } from "../options";

@Injectable()
export class DbOperationsCommand {
  constructor(
    @Inject(SquareboatNestObjection.databaseOptions)
    private options: DatabaseOptions
  ) {}

  @Command("migrate:status {--connection==}", {
    desc: "Command to show the status of all migrations",
  })
  async migrateStatus(_cli: ConsoleIO): Promise<void> {
    const conn = _cli.option<string>("connection") || this.options.default;
    const knex = ObjectionService.connection(conn);
    const connConfig = this.options.connections[conn];

    const [completed, pending]: Record<string, any>[][] =
      await knex.migrate.list(connConfig.migrations);
    const statusList = [];

    for (const migration of completed) {
      statusList.push({ migration: migration.name, status: pc.green("Y") });
    }

    for (const migration of pending) {
      statusList.push({ migration: migration.file, status: pc.red("N") });
    }

    _cli.table(statusList);
  }

  @Command("migrate {--connection==}", {
    desc: "Command to run the pending migrations",
  })
  async migrationUp(_cli: ConsoleIO): Promise<void> {
    const conn = _cli.option<string>("connection") || this.options.default;
    const knex = ObjectionService.connection(conn);
    const connConfig = this.options.connections[conn];

    const [batch, migrations]: [number, string[]] = await knex.migrate.latest(
      connConfig.migrations
    );

    if (migrations.length === 0) {
      _cli.info("No migrations to run");
      return;
    }

    _cli.info(`Batch Number: ${batch}`);
    for (const migration of migrations) {
      _cli.success(migration);
    }
  }

  @Command("migrate:rollback {--connection==}", {
    desc: "Command to rollback the previous batch of migrations",
  })
  async migrateRollback(_cli: ConsoleIO) {
    const conn = _cli.option<string>("connection") || this.options.default;
    const knex = ObjectionService.connection(conn);
    const connConfig = this.options.connections[conn];

    const [batch, migrations]: [number, string[]] = await knex.migrate.rollback(
      connConfig.migrations
    );

    if (migrations.length === 0) {
      _cli.info("No migrations to rollback. Already at the base migration");
      return;
    }

    _cli.info(`Reverted Batch: ${batch}`);
    for (const migration of migrations) {
      _cli.success(migration);
    }
  }

  @Command("migrate:reset {--connection==}", {
    desc: "Command to rollback all the migrations",
  })
  async migrateReset(_cli: ConsoleIO) {
    const conn = _cli.option<string>("connection") || this.options.default;
    const knex = ObjectionService.connection(conn);
    const connConfig = this.options.connections[conn];

    const confirm = await _cli.confirm(
      `Are you sure you want to rollback all the migrations of '${conn}'? This action is irreversible.`,
      false
    );

    if (!confirm) {
      _cli.info("Thank you! Exiting...");
      return;
    }

    // every batch, not only the last one
    const [, migrations]: [number, string[]] = await knex.migrate.rollback(
      connConfig.migrations,
      true
    );

    if (migrations.length === 0) {
      _cli.info("No migrations to rollback. Already at the base migration");
      return;
    }

    _cli.info("Rollback of following migrations are done:");
    for (const migration of migrations) {
      _cli.success(migration);
    }
  }

  @Command("make:migration {name} {--connection=}", {
    desc: "Command to create a new migration",
  })
  async makeMigration(_cli: ConsoleIO) {
    const name = _cli.argument<string>("name");
    const conn = _cli.option<string>("connection") || this.options.default;
    const knex = ObjectionService.connection(conn);
    const connConfig = this.options.connections[conn];

    const res = await knex.migrate.make(name, {
      directory: connConfig?.migrations?.directory,
      extension: "js",
    });

    const paths = res.split("/");
    _cli.success(paths[paths.length - 1]);
  }
}
