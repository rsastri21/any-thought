# AnyThought Effect Monorepo

## Prequisites

The monorepo uses PNPM workspaces. Ensure PNPM is installed.

### Docker

- The server application uses Docker to spin up Postgres and Redis instances for local development.
- Ensure `docker` and `docker-compose` are installed.

## Running Code

This repository leverages [tsx](https://tsx.is) to allow execution of TypeScript files via NodeJS as if they were written in plain JavaScript.

To execute a file with `tsx`:

```sh
pnpm tsx ./path/to/the/file.ts
```

## Operations

**Building**

To build all packages in the monorepo:

```sh
pnpm build
```

**Testing**

To test all packages in the monorepo:

```sh
pnpm test
```
