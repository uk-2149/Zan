# Zan User Guide

This guide describes the end-user workflow for submitting jobs and monitoring results in the Zan web app, and a brief overview of the provider desktop agent.

## Audience

- Clients who submit compute jobs using the web app
- Providers who run the desktop agent to offer GPU capacity

## Client Workflow (Web App)

### Create an Account

1. Open `/register`.
2. Choose a role (Client or Provider).
3. Enter your details and submit the form.
4. You will be signed in and redirected to your dashboard.

### Sign In

1. Open `/login`.
2. Sign in with email and password.
3. If Google sign-in is enabled for your environment, you can use the Google option.

### Submit a Job

1. Go to `/client/submit`.
2. Step 1: Choose a workload class.
3. Step 2: Provide job details (title, framework/model, input URI, and optional notes).
4. Step 3: Set requirements (budget, duration, minimum VRAM, priority, GPU trust tier).
5. Submit the job. You will be redirected to the job detail page.

### Monitor Jobs

- The client dashboard at `/client` shows recent jobs and summary metrics.
- Open a job from the list to view details at `/client/jobs/:id`.
- The job detail view shows status, assigned provider, I/O URIs, and an event timeline.

### Cancel a Job

- Jobs can be cancelled only when the status is `CREATED` or `FUNDED`.
- Use the cancel action in the job detail view.
- Current behavior: a cancelled job is shown as `FAILED` until a dedicated `CANCELLED` status is added.

## Job Status Overview

| Status      | Meaning                               |
| ----------- | ------------------------------------- |
| `CREATED`   | Job is created, not funded yet        |
| `FUNDED`    | Escrow locked, waiting for assignment |
| `ASSIGNED`  | Provider assigned to the job          |
| `RUNNING`   | Job is executing on provider          |
| `COMPLETED` | Job finished, output available        |
| `PAID`      | Payment released and confirmed        |
| `FAILED`    | Job failed or was cancelled           |
| `DISPUTED`  | Dispute raised by client              |
| `REFUNDED`  | Funds returned to client              |

## Provider Workflow (Desktop Agent)

- Download and install the Zan Provider Agent from GitHub Releases.
- Run the agent on a provider machine to participate in the compute network.
- For building the agent from source, see [apps/agent/README.md](apps/agent/README.md).

## Notes for Development Environments

- Escrow signatures are simulated in development and are not verified on-chain.
- Some form metadata (duration, priority, notes) is not persisted yet.

## Product Resources

- Product site: https://zan-web.vercel.app/
- Product demo video: https://youtu.be/8fufZY50o3Q
- Presentation video: https://youtu.be/aW1hg-2UpQ0
- Presentation slides (PPT): https://docs.google.com/presentation/d/11yXKKGzKZk45N5OK6miEZVdhNeodYCmdrd5FsoRi97U/edit?usp=sharing

## Where to Learn More

- Technical reference: [docs/CLIENT_PLATFORM.md](docs/CLIENT_PLATFORM.md)
- Media and links: [docs/PRODUCT_MEDIA.md](docs/PRODUCT_MEDIA.md)
