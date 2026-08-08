# Smoobu Integration

## Architecture

The portal treats Smoobu as the source of truth for booking data and stores a local read-only cache for operations. The Cleaning Jobs calendar reads from Supabase only, so day-to-day cleaning work continues if Smoobu is temporarily unavailable.

Server-only modules under `src/lib/smoobu` handle:

- HMAC request signing
- authenticated Smoobu HTTP calls
- reservation normalisation
- booking upsert and reconciliation
- webhook validation and processing
- safe message display formatting

Browser code never receives Smoobu credentials and never calls Smoobu directly.

## HMAC Authentication

Smoobu requests are signed server-side with:

- `X-API-Key`
- `X-Timestamp`
- `X-Nonce`
- `X-Signature`

The signature is HMAC-SHA256 over the documented canonical request fields. Query parameters are sorted alphabetically before signing. A fresh UUID v4 nonce is generated for each request.

The legacy `Api-Key` authentication is not used.

## Environment Variables

Set these in Vercel:

- `SMOOBU_API_KEY`
- `SMOOBU_API_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMOOBU_CRON_SECRET`

Do not create `NEXT_PUBLIC_` Smoobu variables.

## Smoobu Endpoints Used

- `GET /api/apartments`
- `GET /api/reservations`
- `GET /api/reservations/{reservationId}`
- `GET /api/reservations/{reservationId}/messages`

Documented but deliberately not exposed in this release:

- `POST /api/reservations/{reservationId}/messages/send-message-to-guest`
- `GET /api/threads`
- `GET /api/reservations/{reservationId}/price-elements`
- price element create/update/delete endpoints

## Local Data Model

Migration:

- `supabase/migrations/20260807205000_smoobu_booking_integration.sql`

Tables:

- `smoobu_property_mappings`
- `smoobu_bookings`
- `smoobu_booking_price_elements`
- `smoobu_sync_runs`
- `smoobu_webhook_events`

Existing table extension:

- `cleaning_jobs.smoobu_booking_id`
- `cleaning_jobs.booking_change_requires_review`
- `cleaning_jobs.booking_change_reason`
- `cleaning_jobs.booking_context`

Bookings are upserted by `smoobu_reservation_id`. Cancelled and deleted bookings are preserved locally and marked rather than physically deleted.

## Property Mapping

Administrators configure mappings from the property detail page:

`Admin -> Properties -> property -> Smoobu`

Mappings are explicit and use Smoobu apartment IDs. Property names are not used as the source of truth.

## Initial Sync

Administrators can trigger sync from the Cleaning Jobs page.

Default window:

- 90 days in the past
- 365 days in the future

The sync uses `GET /api/reservations` with:

- `showCancellation=true`
- `excludeBlocked=false`
- `includePriceElements=true`
- `pageSize=100`

Blocked bookings are stored locally but filtered out of the normal guest calendar.

## Incremental Sync

The cron endpoint is:

`GET /api/cron/smoobu-sync`

It uses the last successful sync time as `modifiedFrom` and the current time as `modifiedTo`.

Recommended Vercel Cron cadence:

```json
{
  "crons": [
    {
      "path": "/api/cron/smoobu-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

Send:

`Authorization: Bearer <SMOOBU_CRON_SECRET>`

## Webhooks

Webhook endpoint:

`https://portal.accoladestays.co.uk/api/smoobu/webhook`

Enter this in:

`Smoobu -> Settings -> Advanced/API settings`

Supported reservation actions:

- `newReservation`
- `updateReservation`
- `cancelReservation`
- `deleteReservation`

Recognised future actions:

- `newMessage`
- `priceElementCreated`
- `priceElementUpdated`
- `priceElementDeleted`
- `updateRates`

Smoobu does not document a webhook signature scheme, so webhook booking payloads are not treated as authoritative. Reservation create/update/cancel events trigger a server-side authenticated refetch before upserting local data.

## Calendar Behaviour

The Cleaning Jobs calendar displays:

- cleaning jobs
- cached active guest bookings

Bookings are visually distinct from cleans. Cancelled, deleted, and blocked bookings are not shown as normal stays.

Clicking a booking opens read-only details, including:

- summary
- contact details for admin/manager roles
- Smoobu notice
- linked clean status
- read-only messages
- source metadata

The calendar never displays guest email or telephone numbers directly in date cells.

## Messages

Messages are loaded on demand from:

`GET /api/reservations/{reservationId}/messages?onlyRelatedToGuest=true`

The UI displays incoming and outgoing messages. Plain text is preferred. If only HTML is present, tags and scripts are stripped and the result is rendered as text. There is no send button in this release.

## Create Clean From Booking

From booking details, administrators and cleaning managers can create a clean.

The form is pre-populated with:

- property from the booking mapping
- cleaning date from the departing booking departure date
- expected start from booking check-out time when available
- guest arrival deadline from same-day next booking check-in when available
- cleaning type as standard changeover
- linked local booking ID

Existing bedroom setup confirmation is reused. The clean still goes through the existing approval and assignment workflow.

If a linked clean already exists, the booking details show it instead of silently creating another.

## Failure Handling

If Smoobu sync fails:

- existing cached bookings remain available
- failure details are recorded in `smoobu_sync_runs`
- the Cleaning Jobs calendar remains usable

If messages fail to load:

- booking details still open
- the Messages section shows an inline retry option

## Privacy

Do not log:

- Smoobu credentials
- full booking payloads
- guest messages

Cleaner-role users do not have access to Smoobu booking tables, messages, guest contact data, booking prices, or integration settings.

## Future Work

Deliberately excluded:

- creating reservations in Smoobu
- editing reservations in Smoobu
- cancelling reservations in Smoobu
- sending guest messages
- rates management
- bookkeeping UI
- automatic cleaning-job creation
- automatic cleaner assignment

Future-ready areas:

- guest message sending through Smoobu
- portal-wide inbox using `GET /api/threads`
- detailed price-element bookkeeping
- response to price-element webhooks

## Deployment Checklist

1. Apply `supabase/migrations/20260807205000_smoobu_booking_integration.sql`.
2. Set `SMOOBU_API_KEY` and `SMOOBU_API_SECRET` in Vercel.
3. Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
4. Set `SMOOBU_CRON_SECRET` in Vercel.
5. Configure Vercel Cron for `/api/cron/smoobu-sync` hourly.
6. Enter `https://portal.accoladestays.co.uk/api/smoobu/webhook` in Smoobu API settings.
7. Map each Accolade property to its Smoobu apartment in the property detail screen.
8. Run an administrator manual sync from the Cleaning Jobs page.
9. Confirm bookings appear on the Cleaning Jobs calendar.
10. Open a booking and create a clean from a departure.
