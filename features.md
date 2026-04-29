# Rider Allocation Simulator — Frontend Build

You are building the frontend for an internal simulator that demonstrates an automated rider allocation algorithm. This is a working demo, not a production app — the goal is to make the algorithm's behaviour visible and interactive.

## Stack (already initialised)

The project has been created with:

- **Next.js 16** (App Router, Turbopack default)
- **TypeScript** (strict)
- **Tailwind CSS 4**

You should add and use:

- **shadcn/ui** — install components on demand via `npx shadcn@latest add <component>`
- **TanStack Query (React Query)** — for data fetching with polling
- **Leaflet + react-leaflet** — for map views (OpenStreetMap tiles, no API key)
- **lucide-react** — icons
- **zod** — runtime validation of API payloads
- **date-fns** — relative time formatting
- **clsx** + **tailwind-merge** — already shipped with shadcn

### Next.js 16 reminders

- `params` and `searchParams` in pages are **Promises** — always `await` them
- Use `async function Page(props: PageProps<'/route'>)` style with `await props.params`
- Turbopack is default — do not add `--turbopack` flags or webpack config
- If you need request-time middleware later, name the file `proxy.ts`, not `middleware.ts`

## Out of scope (do NOT build)

- Authentication / login screens — wide-open simulator
- Real WebSocket connections — use polling everywhere (2s default)
- Real push notifications — notifications are database rows the UI surfaces
- Tests, Storybook, i18n
- Real backend integration — see "Mock data layer" below

## Architecture: mock-first

The backend (NestJS + MongoDB + Temporal) is being built in parallel. **The frontend must run end-to-end against an in-memory mock layer** so it can be demoed before the backend exists. When the backend lands, swapping the data layer is a one-flag change.

Implement the data layer as:

```
lib/api/
  client.ts        // typed client interface
  mock/
    store.ts       // in-memory store + localStorage persistence
    seed.ts        // initial fixture data
    simulator.ts   // the dispatch algorithm running in-process
    handlers.ts    // mock implementations of each endpoint
  http/
    handlers.ts    // real HTTP implementations (fetches NEXT_PUBLIC_API_BASE_URL)
  index.ts         // exports the active client based on NEXT_PUBLIC_API_MODE
```

`NEXT_PUBLIC_API_MODE=mock` (default) uses the in-memory store. `NEXT_PUBLIC_API_MODE=real` hits the backend. Mock state persists in localStorage so refreshes don't lose seeded data; provide a "reset state" button on the dashboard.

The mock simulator must run the actual allocation algorithm (described below) so that creating an order produces real-looking dispatch behaviour without a backend.

---

## Data model

All entities have `id` (UUID), `createdAt`, `updatedAt`. Define these as TypeScript types in `lib/types/`.

### Retailer

- `name: string`
- `address: string`
- `latitude: number`
- `longitude: number`

### Tier

- `name: string` (e.g., "Gold", "Silver", "Bronze")
- `scoringWeight: number` (e.g., 1.5 / 1.0 / 0.7 — multiplier in scoring formula)
- `description: string`
- `colorHex: string` (UI badge colour)

### Rider

- `fullName: string`
- `phone: string`
- `photoUrl: string | null`
- `tierId: string`
- `state: RiderState` — enum: `Offline | OnlineIdle | OnlineAssigned | OnPickup | OnDelivery | OnBreak | Suspended`
- `isEligible: boolean`
- `ineligibilityReason: string | null` (e.g., "battery below threshold", "KYC suspended", "decline cap reached")
- `acceptanceRate: number` (0–100, **directly settable** in the simulator — not derived)
- `declinesToday: number`
- `currentLoad: number` (count of active assigned orders)
- `kycStatus: 'Pending' | 'Approved' | 'Rejected'`
- `location: { latitude: number; longitude: number; batteryPercent: number; gpsAccuracyMeters: number; lastUpdatedAt: string }`

### Order

- `retailerId: string` (pickup is the retailer's lat/lng)
- `dropLatitude: number`
- `dropLongitude: number`
- `dropAddress: string | null`
- `state: OrderState` — enum: `Created | Dispatching | Assigned | PickedUp | Delivered | Cancelled | FailedToDispatch`
- `assignedRiderId: string | null`
- `dispatchedAt: string | null`
- `assignedAt: string | null`
- `pickedUpAt: string | null`
- `deliveredAt: string | null`
- `cancelledAt: string | null`

### Notification (the offer envelope)

- `orderId: string`
- `riderId: string`
- `status: 'Pending' | 'Accepted' | 'Declined' | 'TimedOut' | 'Revoked'`
- `offerRank: number` (1-indexed position in candidate list)
- `score: number`
- `distanceMeters: number`
- `issuedAt: string`
- `timesOutAt: string` (issuedAt + offerTimeoutSeconds)
- `respondedAt: string | null`

### DispatchAttempt (one per order, log of the workflow)

- `orderId: string`
- `startedAt: string`
- `completedAt: string | null`
- `outcome: 'Succeeded' | 'Failed' | 'InProgress'`
- `candidates: Array<{ riderId: string; rank: number; score: number; distanceMeters: number; offerStatus: NotificationStatus; respondedAt: string | null }>`
- `winningRiderId: string | null`

### Campaign (placeholder — NOT consumed by allocation in this sim)

- `name: string`
- `kind: 'Promotion' | 'Campaign'`
- `description: string`
- `triggerType: 'OrdersCompleted' | 'DistanceTraveled' | 'AcceptanceRate'`
- `threshold: number`
- `rewardAmountGhs: number`
- `startDate: string`
- `endDate: string`
- `isActive: boolean`
- `targetTierId: string | null`

### SystemEvent (live feed)

- `type:` one of `RiderEligibilityChanged | RiderStateChanged | OrderCreated | OrderStateChanged | OfferIssued | OfferAccepted | OfferDeclined | OfferTimedOut | DispatchSucceeded | DispatchFailed | BatteryThresholdCrossed | ConfigUpdated`
- `timestamp: string`
- `summary: string` (one-line human-readable)
- `details: Record<string, unknown>` (relevant ids and context)

### Config (single document)

- `batteryThresholdPercent: number` (default 15)
- `gpsAccuracyThresholdMeters: number` (default 50)
- `declineCapPerDay: number` (default 3)
- `offerTimeoutSeconds: number` (default 30)
- `maxCandidatesPerDispatch: number` (default 10)
- `proximityRadiusMeters: number` (default 5000)
- `scoringWeights: { distance: number; acceptance: number; tier: number; load: number }` (must sum to 1.0)

---

## API contract

All endpoints under `/api/v1/`. Implement them in `lib/api/client.ts` as a typed interface; the mock and HTTP variants both implement it.

| Method | Path                           | Purpose                                                              |
| ------ | ------------------------------ | -------------------------------------------------------------------- |
| GET    | `/riders`                      | list (filterable: state, tierId, isEligible)                         |
| POST   | `/riders`                      | create                                                               |
| GET    | `/riders/:id`                  | detail                                                               |
| PATCH  | `/riders/:id`                  | update profile                                                       |
| DELETE | `/riders/:id`                  | delete                                                               |
| PATCH  | `/riders/:id/location`         | update lat/lng/battery/accuracy                                      |
| POST   | `/riders/:id/state`            | transition state `{ newState, reason? }`                             |
| POST   | `/riders/:id/eligibility`      | manual override `{ isEligible, reason }`                             |
| GET    | `/retailers`                   | list                                                                 |
| POST   | `/retailers`                   | create                                                               |
| GET    | `/retailers/:id`               | detail                                                               |
| PATCH  | `/retailers/:id`               | update                                                               |
| DELETE | `/retailers/:id`               | delete                                                               |
| GET    | `/orders`                      | list (filterable: state, retailerId)                                 |
| POST   | `/orders`                      | create — does NOT auto-dispatch; state starts as `Created`           |
| GET    | `/orders/:id`                  | detail                                                               |
| POST   | `/orders/:id/dispatch`         | trigger dispatch on a `Created` order                                |
| POST   | `/orders/:id/state`            | transition state (for forcing PickedUp / Delivered / Cancelled)      |
| GET    | `/orders/:id/dispatch-attempt` | the dispatch log                                                     |
| GET    | `/notifications`               | list (filterable: riderId, orderId, status)                          |
| POST   | `/notifications/:id/respond`   | `{ action: 'accept' \| 'decline' }`                                  |
| GET    | `/tiers`                       | list                                                                 |
| POST   | `/tiers`                       | create                                                               |
| PATCH  | `/tiers/:id`                   | update                                                               |
| DELETE | `/tiers/:id`                   | delete                                                               |
| GET    | `/campaigns`                   | list                                                                 |
| POST   | `/campaigns`                   | create                                                               |
| PATCH  | `/campaigns/:id`               | update                                                               |
| DELETE | `/campaigns/:id`               | delete                                                               |
| GET    | `/events`                      | system events (`?since=<iso-timestamp>` for cursor; default last 50) |
| GET    | `/config`                      | current config                                                       |
| PATCH  | `/config`                      | update config                                                        |

Validate request and response payloads with zod schemas in `lib/api/schemas/`.

---

## The allocation algorithm (mock simulator)

The mock layer must run this algorithm whenever `POST /orders/:id/dispatch` is called. The behaviour drives the entire demo.

### Pipeline

1. **Fetch eligible riders** — `isEligible === true` AND `state === 'OnlineIdle'`
2. **Apply dispatch-time filters:**
   - distance from rider's location to retailer's location ≤ `config.proximityRadiusMeters`
   - `currentLoad < 1` (single-load only for the simulator)
3. **Score each surviving rider** with the formula:

```
   score =
       weights.distance   * normalize(1 - distance / proximityRadius)  // closer is better
     + weights.acceptance * (acceptanceRate / 100)
     + weights.tier       * (tier.scoringWeight / maxTierWeight)
     + weights.load       * (1 - currentLoad)                          // 0 load is best
```

`normalize` returns a 0–1 value. Higher score = better candidate. 4. **Rank** descending by score; take top `config.maxCandidatesPerDispatch`. 5. **Open a `DispatchAttempt`** log with the full ranked list (status `InProgress`). 6. **Sequential offer loop:** for each candidate in order:

- Write a `Notification` row (status `Pending`, `timesOutAt = now + offerTimeoutSeconds`)
- Emit `OfferIssued` system event
- Transition the order's `dispatchedAt` if first offer
- Wait for the notification to be accepted, declined, or timed out
- On `Accepted`: order → `Assigned`, rider → `OnlineAssigned`, increment rider's `currentLoad`, log winner, emit `DispatchSucceeded`, exit
- On `Declined`: increment rider's `declinesToday`, if `>= declineCapPerDay` flip eligibility to false with reason `"decline cap reached"`. Emit `OfferDeclined`. Continue to next candidate.
- On `TimedOut`: emit `OfferTimedOut`. Continue to next candidate.

7. **List exhausted:** order → `FailedToDispatch`, emit `DispatchFailed`, mark `DispatchAttempt` as `Failed`.

### Mock simulator implementation note

The mock runs in the browser. Use `setTimeout` to simulate the offer timeout. Provide a UI mechanism (the per-rider notification inbox) to accept or decline a pending offer; this resolves the timeout early and advances the loop. The simulator must also auto-progress: if no human response within `offerTimeoutSeconds`, the timeout fires and the next candidate gets the offer.

### Eligibility side-effects

When the user PATCHes `/riders/:id/location` with a `batteryPercent`:

- If new value < `config.batteryThresholdPercent` and rider was eligible → flip `isEligible = false`, set `ineligibilityReason = "battery below threshold"`, emit `BatteryThresholdCrossed` and `RiderEligibilityChanged`
- If new value ≥ threshold and rider's only block was battery → flip eligibility back to true (clear reason) and emit `RiderEligibilityChanged`

Same shape for KYC status changes (PATCH on rider): KYC `Suspended` or `Rejected` flips eligibility off; `Approved` flips it back if no other reason holds.

---

## Pages and screens

### `/` — Dashboard

- Top: stat cards — **Total riders**, **Eligible now**, **Active orders**, **Today's dispatches**, **Success rate**
- Left two-thirds: full-width Leaflet map showing all retailers (blue pins), eligible riders (green dots), ineligible riders (grey dots), active orders (orange pins on retailer locations). Click a pin → side panel detail.
- Right third: live `SystemEvent` feed (poll 2s, newest on top, max 50 visible, color-coded by event type, relative time)
- Top-right: "Reset state" button (clears localStorage, re-seeds)

### `/riders` — Riders list

- Filter bar: state (multiselect), tier (multiselect), eligibility (eligible/ineligible/all), text search by name
- Table: avatar, name, state badge, eligibility pill (with reason on hover), tier badge, battery (with icon), acceptance %, current load, last location update (relative time)
- Row click → `/riders/[id]`
- Top-right: "Add rider" (modal), "Bulk seed riders" (creates 10 random riders for demo speed)

### `/riders/[id]` — Rider detail

- Two columns. Left: profile form (all fields editable, save). Right: map mini showing rider's current location with a draggable pin (drag → PATCH location).
- Below: location/battery sub-form (battery slider, GPS accuracy input, manual lat/lng)
- State machine control: dropdown of valid next states (compute from current state), "Transition" button
- Eligibility manual override: toggle + reason input
- Recent notifications table: order id, status, rank, score, response time
- Activity log: this rider's `SystemEvents` (filter by riderId)

### `/retailers` — Retailers list + map

- Split view: table on left, map on right with all retailer pins
- Add/edit retailer modal (name, address, lat/lng with map picker)
- Click retailer → highlights on map and shows recent orders

### `/orders` — Orders list

- Filter by state, by retailer
- Table: short id, retailer name, state, assigned rider name, age (relative), dispatch attempts count, drop address
- Top-right: "Create order" — modal with retailer dropdown and a Leaflet map for picking drop location (click to place pin)
- Row click → `/orders/[id]`

### `/orders/[id]` — Order detail

- Header: state badge, age, retailer name
- State timeline: visual progression `Created → Dispatching → Assigned → PickedUp → Delivered`
- Two-column body:
  - Left: pickup (retailer card with map) + drop (mini map) + assigned rider card if any
  - Right: **dispatch attempt panel** — the ranked candidate list as it played out, each row showing rider name, rank, score breakdown (tooltip), distance, offer status, response time. This is the centrepiece. If still in progress, show pending offer with countdown.
- State transition controls: "Mark picked up", "Mark delivered", "Cancel" (only if state allows)

### `/dispatch` — Dispatch simulator (the showpiece)

- Big screen for the demo. Three-pane layout:
  - **Left:** orders queue (Created + Dispatching). Click an order → focuses it.
  - **Centre:** active dispatch visualisation. The selected order's ranked candidate list, with the current offer highlighted, countdown timer, score bars. As offers resolve, rows update live.
  - **Right:** system events feed scoped to the focused order.
- "Trigger dispatch" button on any `Created` order in the queue.
- This page should poll every 1s (faster than the rest) for tightness.

### `/notifications` — Notifications feed

- Cross-rider feed (filter by rider, status). Used by the demo to show offer flow at a glance.

### `/notifications/[riderId]/inbox` — Per-rider inbox (the rider's view)

- Mimics what the rider mobile app would show. Pending offers at top with countdown bar, big Accept / Decline buttons.
- Past offers below (status, response time).
- This is how the demo person plays the role of a rider responding to offers.

### `/tiers` — Tiers CRUD

- Simple table. Create/edit modal. Show rider count per tier.

### `/campaigns` — Campaigns and promotions

- Tabs: Campaigns, Promotions. List with active/inactive toggle. Create/edit modal.
- Banner at top of page: "Campaigns and promotions are managed here for completeness; in the simulator they do not currently affect the allocation algorithm."

### `/config` — System configuration

- Form with all `Config` fields. Sliders for thresholds, number inputs for limits, scoring-weight inputs that validate they sum to 1.0.
- Save button → PATCH `/config`, emits `ConfigUpdated` event.

### Navigation

- Persistent left sidebar: Dashboard, Dispatch (showpiece), Riders, Retailers, Orders, Notifications, Tiers, Campaigns, Config
- Top bar: title, breadcrumbs, "Reset state" button, mock/real mode badge

---

## UI conventions

- **Visual style:** clean admin dashboard. Light theme primary; dark mode supported via shadcn defaults. Feel similar to Linear / Vercel — not playful, not corporate.
- **Colours:** Tailwind defaults. State badges: green (online/eligible/success), blue (in-progress), amber (pending/warning), red (failed/declined/suspended), grey (offline/inactive).
- **Tables:** shadcn `Table` with sticky headers, hover row highlight, row-click to detail page.
- **Forms:** shadcn `Form` + `react-hook-form` + zod resolvers.
- **Modals:** shadcn `Dialog` for create/edit.
- **Toasts:** shadcn `Sonner` for action feedback (don't be noisy — only on errors and meaningful state changes).
- **Empty states:** every list page has a friendly empty state with a CTA.
- **Loading:** skeleton loaders on initial load, subtle inline spinners on subsequent polls (do not block the UI).

## Polling

Use TanStack Query. Default `refetchInterval`:

- Dispatch page: 1000ms
- Dashboard, Riders, Notifications, Orders: 2000ms
- Detail pages: 3000ms
- Tiers, Campaigns, Config, Retailers: no polling (manual refetch only)

Pause polling when the tab is hidden (`refetchIntervalInBackground: false`).

## Map (Leaflet)

- Wrap react-leaflet components in dynamic imports with `ssr: false`
- Tile layer: OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- Default centre: Accra, Ghana — `[5.6037, -0.1870]`, zoom 12
- Custom marker icons: blue pin for retailers, coloured dots for riders (green/grey/orange by state), orange pin for orders
- Build a reusable `<MapView>` component that takes typed `markers` and an optional `onMarkerClick`

## Project structure

```
app/
  layout.tsx              // root + QueryClientProvider + Sonner
  page.tsx                // /
  riders/
    page.tsx              // list
    [id]/page.tsx         // detail (await params)
  retailers/
    page.tsx
    [id]/page.tsx
  orders/
    page.tsx
    [id]/page.tsx
  dispatch/page.tsx
  notifications/
    page.tsx
    [riderId]/inbox/page.tsx
  tiers/page.tsx
  campaigns/page.tsx
  config/page.tsx
components/
  ui/                     // shadcn components
  layout/                 // Sidebar, TopBar, AppShell
  domain/                 // RiderCard, OrderTimeline, DispatchPanel, MapView, EventFeed, etc.
  forms/                  // RiderForm, OrderForm, RetailerForm, etc.
lib/
  api/
    client.ts             // typed interface
    mock/                 // store + simulator + handlers
    http/                 // real handlers
    schemas/              // zod
    index.ts              // active client export
  types/
    index.ts
  hooks/
    useRiders.ts
    useOrders.ts
    useDispatch.ts
    ...
  utils/
    distance.ts           // Haversine
    scoring.ts            // shared between mock simulator and detail panel display
    state-machines.ts     // valid transitions for Rider and Order
public/
  rider-icons/            // marker images
```

## Seed data

Seed the mock store with:

- 3 tiers (Gold w=1.5 #FFD700, Silver w=1.0 #C0C0C0, Bronze w=0.7 #CD7F32)
- 8 retailers around Accra (real-ish locations: East Legon, Osu, Adabraka, Tema, Madina, Dansoman, Achimota, Spintex)
- 25 riders: spread of states (mostly OnlineIdle, some OnDelivery, a few Offline), spread of tiers, spread of locations within ~10km of central Accra. Around 80% eligible. Vary acceptance rates 40–95%.
- 5 sample orders in mixed states (1 Created, 1 Dispatching, 1 Assigned, 1 Delivered, 1 FailedToDispatch — so all states are visible in the UI immediately)
- 3 campaigns and 2 promotions (placeholder content)
- Default config

## Acceptance criteria

The build is done when:

1. `pnpm dev` (or `npm run dev`) boots, every page loads without console errors, and seeded data is visible.
2. Creating an order from `/orders` and clicking "Dispatch" triggers the algorithm; the `/orders/:id` page shows the ranked candidate list populating live; opening that rider's `/notifications/[riderId]/inbox` lets you accept/decline; the order transitions correctly.
3. The `/dispatch` page is presentation-quality — picking an order in the queue and triggering dispatch should be visually compelling enough to demo.
4. Map view renders in the dashboard without SSR errors.
5. PATCHing a rider's battery below 15 flips their eligibility (visible on `/riders` and in the events feed).
6. "Reset state" restores seed and clears localStorage.
7. Switching `NEXT_PUBLIC_API_MODE=real` makes the app hit the configured backend (it'll error since the backend doesn't exist yet, but the wiring must be in place).

## Working notes

- Build the data layer (`lib/api/`, types, schemas) and the mock simulator first. Get the algorithm running headlessly (verify in unit-test-style ad-hoc scripts if helpful).
- Then build the layout shell, sidebar, the dashboard.
- Then `/riders` and `/orders` (the most-used screens).
- Then `/orders/:id` and `/dispatch` (the showpiece).
- Then the rest in priority order: `/notifications/[riderId]/inbox`, `/retailers`, detail pages, `/config`, `/tiers`, `/campaigns`.
- Commit small and often.

If anything in the spec is ambiguous or you discover something that needs a decision I haven't given you, **make the choice that keeps the demo legible and the algorithm visible** — and add a one-line `// DECISION:` comment explaining what you picked and why.

Begin.
