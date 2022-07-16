import { Inject, Injectable } from "@nestjs/common";
import { Knex } from "knex";
import * as pc from "picocolors";
import { SquareboatNestObjection } from "../constants";
import { Command, ConsoleIO } from "@squareboat/nest-console";
import { DatabaseOptions } from "../options";

@Injectable()
export class DbOperationsCommand {
  private migratorConfig = {
    directory: "./database/migrations",
    loadExtensions: [".js"],
  };

  constructor(
    @Inject(SquareboatNestObjection.dbConnection) private knex: Knex,
    @Inject(SquareboatNestObjection.databaseOptions)
    private config: DatabaseOptions
  ) {}

  @Command("migrate:status", {
    desc: "Command to show the status of all migrations",
  })
  async migrateStatus(_cli: ConsoleIO): Promise<void> {
    const [completed, pending]: Record<string, any>[][] =
      await this.knex.migrate.list(this.migratorConfig);
    const statusList = [];

    for (const migration of completed) {
      statusList.push({ migration: migration.name, status: pc.green("Y") });
    }

    for (const migration of pending) {
      statusList.push({ migration: migration.file, status: pc.red("N") });
    }

    _cli.table(statusList);
  }

  @Command("migrate", { desc: "Command to run the pending migrations" })
  async migrationUp(_cli: ConsoleIO): Promise<void> {
    const [batch, migrations]: [number, string[]] =
      await this.knex.migrate.latest(this.migratorConfig);

    if (migrations.length === 0) {
      _cli.info("No migrations to run");
      return;
    }

    _cli.info(`Batch Number: ${batch}`);
    for (const migration of migrations) {
      _cli.success(migration);
    }
  }

  @Command("migrate:rollback", {
    desc: "Command to rollback the previous batch of migrations",
  })
  async migrateRollback(_cli: ConsoleIO) {
    const [batch, migrations]: [number, string[]] =
      await this.knex.migrate.rollback(this.migratorConfig);

    if (migrations.length === 0) {
      _cli.info("No migrations to rollback. Already at the base migration");
      return;
    }

    _cli.info(`Reverted Batch: ${batch}`);
    for (const migration of migrations) {
      _cli.success(migration);
    }
  }

  @Command("migrate:reset", {
    desc: "Command to reset the migration",
  })
  async migrateReset(_cli: ConsoleIO) {
    const confirm = await _cli.confirm(
      "Are you sure you want to reset your database? This action is irreversible."
    );

    if (!confirm) {
      _cli.info("Thank you! Exiting...");
      return;
    }

    const password = await _cli.password(
      "Please enter the password of the database to proceed"
    );

    // if (password !== this.config.connection.connection.password) {
    //   _cli.error(" Wrong Password. Exiting... ");
    //   return;
    // }

    const [, migrations]: [number, string[]] = await this.knex.migrate.down(
      this.migratorConfig
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

  @Command("make:migration {name}", {
    desc: "Command to create a new migration",
  })
  async makeMigration(_cli: ConsoleIO) {
    const res = await this.knex.migrate.make(_cli.argument("name"), {
      directory: "./database/migrations",
      extension: "js",
    });

    const paths = res.split("/");
    _cli.success(paths[paths.length - 1]);
  }
}
