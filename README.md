## Introduction

Almost every application nowadays, requires a database to persist data. We have integrated [`ObjectionJS`](https://vincit.github.io/objection.js/) as our supported ORM.

`ObjectionJS` provides very clean and fluent APIs to build and run complex queries at ease. We have worked in the past with many ORMs, but `ObjectionJS` stood out, it is relatively young but more mature in terms of its offerings.

**Why we ❤️ ObjectionJS**:

- ✅ Very clean and mature Query Builder
- ✅ Fluent Relational Queries
- ✅ Official Typescript Support
- ✅ Clean Migrations and Seeders using [`KnexJS`](http://knexjs.org/)
- ✅ Support for Hooks
- ✅ Powerful model entity relation operations
- ✅ Easy to use Transactions

**What we have added on top of it?**:

- ✅ Setting up project is now much easier than ever
- ✅ Custom `BaseModel` having performant functions
- ✅ In-built `DatabaseRepository` to help you maintain data store functions smartly
- ✅ Beautiful console commands to manage migrations
- ✅ Custom `QueryBuilder` with some much needed methods
- ✅ Utilise multiple connections in repositories smartly.
- ✅ Clean Transaction API using Repositories

## Documentation

To read the complete documentation, [click here](https://squareboat.com/open-source/nestjs-boilerplate/database/introduction/).

## Upgrading from 0.3.x

**Requirements.** Node 20.19+, 22.12+ or 24+, and NestJS 10, 11 or 12 (7 to 9 are no longer supported). `@squareboat/nest-console` `^2.0.0` is a
peer dependency: an app still on nest-console 1.x gets an `ERESOLVE` error from npm, so upgrade it in the same step.

**knex 3.** This package now uses knex `^3.3.0` (and objection `^3.9.2`), and knex types are part of its API
(`DbConnectionOptions extends Knex.Config`, `ObjectionService.connection(): Knex`, `startTrx(Knex.TransactionConfig)`,
`getTrx()`). If your app depends on `knex@^2`, npm installs a second, nested knex 3 for this package and your
TypeScript build fails with `TS2322`. Bump your app's knex too:

```bash
npm install @squareboat/nestjs-objection@^0.4.0 @squareboat/nest-console@^2 knex@^3.3.0
```

knex 3.2+ rejects `delete()` combined with `limit()` or `having()` on every database except MySQL. On Postgres,
`where(...).delete().limit(1)` silently deleted **all** matching rows with knex 2; it now throws
"`limit` has no effect on a `delete` statement". Select the ids first:

```typescript
import { Knex } from 'knex'

export async function deleteOneFailedJob(knex: Knex): Promise<void> {
  const row = await knex('jobs').where('status', 'failed').first('id')
  if (row) await knex('jobs').where('id', row.id).delete()
}
```

**Soft delete (coming from 0.3.8 or earlier).** The `deleted_at` filter now applies only to reads. Patch, update
and delete queries, including the repository's `update()`, `updateWhere()`, `delete()` and `deleteWhere()`, also
reach archived rows. Add `.whereNull('deleted_at')` where you relied on them skipping archived rows. Apps on 0.3.9
see no change. `softDelete()` now also works on models without column name mappers.

**Other changes.**

- The default connection uses one connection pool (`BaseModel.knex()` is `ObjectionService.connection()`), where it
  used two. All pools are closed when the app shuts down (`app.close()`, or a signal with `enableShutdownHooks()`),
  so the process can exit; shutdown waits at most `shutdownTimeout` ms (default `5000`) for them.
- `migrate:reset` rolls back every migration (it used to undo only the last one), its confirmation defaults to
  No, and it no longer asks for a password.
- On MySQL, `updateAndReturn()` returns the updated rows (it returned `1`), and `create()`/`updateAndReturn()` no
  longer log ".returning() is not supported by mysql". `bulkInsert()` works on Postgres and SQL Server only.

## Contributing

To know about contributing to this package, read the guidelines [here](./CONTRIBUTING.md)

## About Us

We are a bunch of dreamers, designers, and futurists. We are high on collaboration, low on ego, and take our happy hours seriously. We'd love to hear more about your product. Let's talk and turn your great ideas into something even greater! We have something in store for everyone. [☎️ 📧 Connect with us!](https://squareboat.com/contact)

## License

The MIT License. Please see License File for more information. Copyright © 2020 SquareBoat.

Made with ❤️ by [Squareboat](https://squareboat.com)
