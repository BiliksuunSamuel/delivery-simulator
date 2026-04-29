# nest-temporal-mongodb-worker-template

A production-ready NestJS template for running **Temporal workers** backed by **MongoDB**.

> **Testing this worker?** Use the companion API — [`temporal-client-test-api`](https://github.com/BiliksuunSamuel/temporal-client-test-api) — a ready-made NestJS REST API that drives the order workflow via start, query, and update operations. Follow its README alongside this one. This template handles the full lifecycle of a long-running Temporal workflow with NestJS dependency injection, Mongoose schema auto-loading, and a clean separation between workflow logic and activity logic.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Key Concepts](#key-concepts)
  - [Activities vs Workflows](#activities-vs-workflows)
  - [The Workflow Sandbox Rule](#the-workflow-sandbox-rule)
  - [Signals, Queries, and Updates](#signals-queries-and-updates)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Registering a New Schema](#registering-a-new-schema)
- [Adding a New Activity](#adding-a-new-activity)
- [Adding a New Workflow](#adding-a-new-workflow)
- [Workflow Guidelines](#workflow-guidelines)
  - [Importing into workflows](#importing-into-workflows)
  - [No NestJS inside workflows](#no-nestjs-inside-workflows)
  - [Exporting workflows correctly](#exporting-workflows-correctly)
  - [Query handlers must be synchronous](#query-handlers-must-be-synchronous)
  - [Signal handlers must be synchronous or void-returning async](#signal-handlers-must-be-synchronous-or-void-returning-async)
- [Running the Worker](#running-the-worker)

---

## Overview

This template wires together three things:

| Concern | Package |
|---|---|
| NestJS application host | `@nestjs/common`, `@nestjs/core` |
| Temporal worker + decorator API | `nest-temporal-host` |
| MongoDB persistence | `@nestjs/mongoose`, `mongoose` |

The worker connects to a Temporal server, registers workflows and activities on a task queue, and keeps running until the process exits.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  NestJS AppModule                │
│                                                  │
│  ┌─────────────────┐   ┌──────────────────────┐  │
│  │  MongooseModule │   │  TemporalHostModule  │  │
│  │  (forFeature)   │   │  (forRoot)           │  │
│  └────────┬────────┘   └──────────┬───────────┘  │
│           │                       │              │
│           ▼                       ▼              │
│  ┌─────────────────┐   ┌──────────────────────┐  │
│  │  OrderModel DI  │──▶│   OrderActivities    │  │
│  └─────────────────┘   │   (@Activity())      │  │
│                        └──────────┬───────────┘  │
│                                   │              │
│                        ┌──────────▼───────────┐  │
│                        │  TemporalWorkerHost  │  │
│                        │  (resolves via DI,   │  │
│                        │   runs workers)      │  │
│                        └──────────────────────┘  │
└──────────────────────────────────────────────────┘

         Temporal Server (external)
              ▲         ▲
    Workflow Bundle    Activity Tasks
    (webpack bundle,   (resolved via DI,
     runs in VM)        runs in Node.js)
```

**Workflows** run inside Temporal's sandboxed V8 VM — they cannot use NestJS or Node.js built-ins directly.

**Activities** run in normal Node.js — they have full access to NestJS DI, Mongoose models, and any external service.

---

## Project Structure

```
src/
├── activities/
│   └── order-activities.ts       # @Activity() class — NestJS DI, Mongoose access
├── configuration/
│   └── index.ts                  # Loads env vars (TEMPORAL_URL, CONNECTION_STRING)
├── enums/
│   └── index.ts                  # WorkflowSignals, WorkflowUpdates, WorkflowQueries,
│                                 #   WorkflowTaskQueues, WorkflowNames, OrderStatus
├── functions/
│   └── load.schemas.ts           # Auto-discovers and registers all *.schema.ts files
├── models/
│   └── order-models.ts           # Plain TS classes (no NestJS decorators) — safe to
│                                 #   import in workflows
├── schemas/
│   ├── base.schema.ts            # Shared base fields (id, createdAt)
│   └── order.schema.ts           # @Schema() class — Mongoose document definition
├── workflows/
│   └── order-workflow.ts         # @Workflow() class + createWorkflow() export
├── app.module.ts                 # Root module — wires everything together
└── main.ts                       # Bootstrap
```

---

## Key Concepts

### Activities vs Workflows

| | Activity | Workflow |
|---|---|---|
| Decorator | `@Activity()` | `@Workflow()` |
| Runs in | Normal Node.js process | Temporal's sandboxed V8 VM |
| NestJS DI | Yes — full access | No |
| Database access | Yes | No — call an activity instead |
| Can be async | Yes | Yes, but with restrictions |
| Registered in | `AppModule.providers` | `workflowsPath` bundle |

**Activities** are where all side-effectful logic lives: database reads/writes, HTTP calls, sending emails, etc.

**Workflows** are pure orchestration: they call activities, wait on signals/timers, and maintain in-memory state.

### The Workflow Sandbox Rule

Temporal bundles your workflow file using webpack into an isolated VM. This means:

- **Do not import** `@nestjs/common`, `@nestjs/core`, `mongoose`, or any Node.js built-ins (`fs`, `http`, etc.) inside a workflow file.
- **Do not import** activity classes as values — use `import type` instead, so the import is erased at compile time.
- **Do not import** schema classes that use `@nestjs/mongoose` decorators — use `import type` for those too.
- **Use `import from 'nest-temporal-host/workflow'`**, not `'nest-temporal-host'`. The `/workflow` sub-path is a NestJS-free build safe for the sandbox.

```ts
// CORRECT
import { Workflow, Execute, createWorkflow } from 'nest-temporal-host/workflow';
import type { OrderActivities } from 'src/activities/order-activities';
import type { Order } from 'src/schemas/order.schema';
import { OrderRequest } from 'src/models/order-models'; // safe — plain TS class

// WRONG
import { Workflow } from 'nest-temporal-host';           // pulls in @nestjs/core
import { OrderActivities } from 'src/activities/order-activities'; // pulls in Mongoose
import { Logger } from '@nestjs/common';                // not available in sandbox
```

### Signals, Queries, and Updates

| Mechanism | Decorator | Direction | Can be async | Can call activities |
|---|---|---|---|---|
| Signal | `@Signal('name')` | Client → Workflow | Yes (void only) | No |
| Query | `@Query('name')` | Client → Workflow (read) | **No — must be sync** | **No** |
| Update | `@Update('name')` | Client → Workflow | Yes | Yes |

**Queries** are read-only snapshots of in-memory state. They must be synchronous and must not schedule any work (no activity calls, no timers). Returning a Promise from a query handler will crash the worker.

```ts
// CORRECT
@Query(WorkflowQueries.QUERY_ORDER)
queryOrder(): Order | null {
  return this.workflowState?.order ?? null;
}

// WRONG — will crash the worker
@Query(WorkflowQueries.QUERY_ORDER)
async queryOrder(): Promise<Order | null> {
  return await getOrderById(this.workflowState?.orderId); // activity call inside query!
}
```

**Updates** are the right tool when you need to mutate state and return a result in a single operation. They can call activities.

**Signals** are fire-and-forget state mutations. They cannot return a value to the caller.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- A running MongoDB instance

### 1. Start Temporal locally

A `docker-compose.yml` is included that spins up everything you need:

| Service | Description | Port |
|---|---|---|
| `postgresql` | Temporal's persistence store | `5432` |
| `temporal` | Temporal server (auto-setup) | `7233` |
| `temporal-ui` | Temporal Web UI | `8080` |

Before starting, create the required dynamic config directory:

```bash
mkdir -p temporal-config
```

Then start the stack:

```bash
docker compose up -d
```

Once running, open the Temporal Web UI at [http://localhost:8080](http://localhost:8080) to monitor workflows.

To stop:

```bash
docker compose down
```

To stop and wipe all data (including Postgres volume):

```bash
docker compose down -v
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure

Create a `.env` file in the project root:

```bash
TEMPORAL_URL=localhost:7233
CONNECTION_STRING=mongodb://localhost:27017/orders
```

### 4. Run the worker

```bash
# development (watch mode)
npm run start:dev

# production
npm run start:prod
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `TEMPORAL_URL` | Address of your Temporal frontend | `localhost:7233` |
| `CONNECTION_STRING` | MongoDB connection string | `mongodb://localhost:27017/orders` |

These are loaded in `src/configuration/index.ts` and injected via `ConfigModule`.

---

## Registering a New Schema

Schemas are **auto-discovered** — you do not need to register them manually. Simply create a new file in `src/schemas/` following the naming convention `<name>.schema.ts`.

**1. Define the schema class:**

```ts
// src/schemas/product.schema.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';

@Schema()
export class Product extends BaseSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;
}
```

**2. (Optional) Add a configuration hook** for indexes, virtuals, etc.:

```ts
// same file — exported function named "configure" + class name
export function configureProduct(schema: any) {
  schema.index({ name: 1 });
}
```

The `loadSchemas()` function in `src/functions/load.schemas.ts` will automatically pick up the class, call `SchemaFactory.createForClass()`, apply any `configure*` hook it finds, and register it with Mongoose.

**3. Inject the model** in your activity:

```ts
@Injectable()
export class ProductActivities {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}
}
```

---

## Adding a New Activity

Activities are plain NestJS injectable classes decorated with `@Activity()`.

**1. Create the activity class:**

```ts
// src/activities/product-activities.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity } from 'nest-temporal-host';
import { Product } from 'src/schemas/product.schema';

@Activity()
export class ProductActivities {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async getProduct(productId: string): Promise<Product | null> {
    return this.productModel.findOne({ productId }).lean();
  }
}
```

**2. Register it in `AppModule`:**

```ts
// app.module.ts
providers: [OrderActivities, ProductActivities],
```

**3. Add it to the worker definition:**

```ts
TemporalHostModule.forRoot({
  workers: [
    {
      taskQueue: WorkflowTaskQueues.ORDER_TASK_QUEUE,
      workflowsPath: require.resolve('./workflows/order-workflow'),
      activities: [OrderActivities, ProductActivities],
    },
  ],
})
```

> Activities are resolved via NestJS DI using `moduleRef.get()` — they do **not** need to be registered inside `TemporalHostModule`. Register them only in `AppModule.providers`.

---

## Adding a New Workflow

**1. Create the workflow file:**

```ts
// src/workflows/product-workflow.ts
import {
  createWorkflow,
  Execute,
  Query,
  TemporalWorkflow,
  Workflow,
} from 'nest-temporal-host/workflow';
import { proxyActivities } from '@temporalio/workflow';
import type { ProductActivities } from 'src/activities/product-activities';
import type { Product } from 'src/schemas/product.schema';

const { getProduct } = proxyActivities<ProductActivities>({
  startToCloseTimeout: '1 minute',
});

@Workflow()
class ProductWorkflowClass extends TemporalWorkflow {
  private product: Product | null = null;

  @Execute()
  async run(productId: string): Promise<Product | null> {
    this.product = await getProduct(productId);
    return this.product;
  }

  @Query('getProduct')
  getProduct(): Product | null {
    return this.product;
  }
}

// Export as a plain function — Temporal uses the export name as the workflow type
export const ProductWorkflow = createWorkflow(ProductWorkflowClass);
```

**2. Register the worker in `AppModule`:**

```ts
workers: [
  {
    taskQueue: WorkflowTaskQueues.ORDER_TASK_QUEUE,
    workflowsPath: require.resolve('./workflows/order-workflow'),
    activities: [OrderActivities],
  },
  {
    taskQueue: 'PRODUCT_TASK_QUEUE',
    workflowsPath: require.resolve('./workflows/product-workflow'),
    activities: [ProductActivities],
  },
],
```

---

## Workflow Guidelines

### Importing into workflows

Always import from `nest-temporal-host/workflow`, never from `nest-temporal-host`:

```ts
// correct
import { Workflow, Execute, Signal, Query, Update, createWorkflow, TemporalWorkflow } from 'nest-temporal-host/workflow';

// wrong — pulls NestJS/core into the sandbox bundle
import { Workflow } from 'nest-temporal-host';
```

### No NestJS inside workflows

The workflow VM has no access to NestJS or Node.js core modules. Move all logic that needs them into an `@Activity()` and call it via `proxyActivities`.

### Exporting workflows correctly

Temporal identifies workflows by the **name of the exported function**. The class name is irrelevant. Always keep the internal class private and export the wrapped function with the name your clients expect:

```ts
@Workflow()
class OrderWorkflowClass extends TemporalWorkflow { ... }

// The exported name "OrderWorkflow" is what the Temporal client uses as workflowType
export const OrderWorkflow = createWorkflow(OrderWorkflowClass);
```

### Query handlers must be synchronous

Query handlers snapshot in-memory state — they must return a value directly, not a Promise. Returning a Promise or calling an activity from a query handler will crash the worker.

```ts
// correct
@Query('getStatus')
getStatus(): string {
  return this.status;
}

// wrong
@Query('getStatus')
async getStatus(): Promise<string> { ... }
```

### Signal handlers must be synchronous or void-returning async

Signals cannot return a value to the caller. If you need to return a value from the workflow in response to an incoming request, use `@Update()` instead.

---

## Running the Worker

```bash
# watch mode (recommended during development)
npm run start:dev

# production
npm run start:prod
```

On startup the worker will:
1. Connect to Temporal at `TEMPORAL_URL`
2. Connect to MongoDB at `CONNECTION_STRING`
3. Build and register the workflow bundle from `workflowsPath`
4. Resolve activity instances via NestJS DI
5. Begin polling the task queue

If the worker stops unexpectedly (e.g. due to a core Temporal error), the process will exit so your process manager (Docker, PM2, systemd) can restart it cleanly.
