# Student Digital Locker - Cloudflare R2 Storage API

This is the control-plane API for the Student Digital Locker, acting as the secure bridge between Firebase Auth, Firestore metadata, and Cloudflare R2 object storage.

## Architecture & Security Model
1. **Frontend:** Generates Firebase JWT tokens and orchestrates the multipart upload logic using S3 Presigned URLs.
2. **Worker:** Authenticates requests using Google's public JWKS. Generates and returns short-lived, explicitly scoped Presigned URLs to the client.
3. **Storage (R2):** Stores the actual file bytes. Configured with strict CORS to only allow the application origin.

### Authorization Design (Firestore vs Worker)
The Worker operates as a privileged backend. To prevent bypassing the Firestore security rules:
- **Owner Access:** The Worker extracts `uid` from the Firebase JWT and strictly enforces the object key format: `users/{uid}/{fileId}`. The Worker natively rejects any path traversal (e.g. `../`) or any access to `users/{otherUid}/*`.
- **Account Sharing / Link Sharing:** For sharing operations, the Worker will fetch the Firestore document via the Google Cloud Firestore REST API. The Worker evaluates the `status`, `expiresAt`, and `requiresLogin` fields directly from the trusted Firestore response before issuing a Presigned URL for the underlying R2 object.

### CPU & Performance
This Worker strictly issues authorization and presigned URLs. It **does not** buffer, proxy, or hash file bytes. This ensures CPU time remains extremely low (under the 10ms Free Tier limit) because the browser communicates directly with R2 for the heavy lifting.

## R2 Bucket Setup
1. Create an R2 bucket in your Cloudflare dashboard (e.g., `sdl-dev-bucket`).
2. Add the bucket binding to `wrangler.toml`.
3. Configure the R2 bucket CORS settings via the Cloudflare API or dashboard to allow `PUT`, `GET`, `HEAD` and expose the `ETag` header to the allowed origins.

## Required Secrets
Do NOT place these in `wrangler.toml` or the React `.env`.
Set them securely using `npx wrangler secret put <NAME>`:
- `R2_ACCOUNT_ID`: Your Cloudflare Account ID (for the S3 SDK).
- `R2_ACCESS_KEY_ID`: Cloudflare R2 API Access Key (must have object read/write permissions).
- `R2_SECRET_ACCESS_KEY`: Cloudflare R2 API Secret Key.

## Local Development
1. Run `npm install`
2. Run `npx wrangler dev`
This will simulate the Cloudflare edge and bind a local temporary R2 bucket for testing.

## Endpoints
* `GET /api/health` - Health check.
* `GET /api/auth-test` - Validates Firebase token.
* `POST /api/test/r2` - Tests native Worker-to-R2 binding.
* `POST /api/test/presign` - Tests AWS SDK presigning.
* `POST /api/test/multipart` - Tests multipart initialization.
