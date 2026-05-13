# Zan : The Uber For GPUs

Zan is a decentralized compute network with a web client for job submission, an API server, and a provider desktop agent. This repository is a pnpm and Turbo monorepo.

## Documentation

- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) - End-user workflow for clients and providers
- [docs/CLIENT_PLATFORM.md](docs/CLIENT_PLATFORM.md) - Technical reference for client-facing flows
- [docs/PRODUCT_MEDIA.md](docs/PRODUCT_MEDIA.md) - Product links and media

## Product Resources

- Product site: https://zan-web.vercel.app/
- Product demo video: https://youtu.be/8fufZY50o3Q
- Presentation video: https://youtu.be/aW1hg-2UpQ0
- Presentation slides (PPT): https://docs.google.com/presentation/d/11yXKKGzKZk45N5OK6miEZVdhNeodYCmdrd5FsoRi97U/edit?usp=sharing

## Repository Layout

- `apps/agent` - Electron provider agent
- `server` - Express API server
- `web` - Next.js web app
- `packages/contracts` - Solana programs
- `packages/sdk` - TypeScript SDK
- `packages/db` - Prisma models and client
- `packages/ui` - Shared UI components
- `packages/crypto` - Crypto utilities
- `packages/types` - Shared types

## Prerequisites

- Node.js >= 18
- pnpm 9.x
- Make (recommended for local workflows)

## Local Development

Use the [Makefile](Makefile) to run the common local dev workflows:

```sh
make help
make install
make dev
```

Common targets:

- `make dev-web` - Next.js web app
- `make dev-server` - API server
- `make dev-agent` - Electron provider agent
- `make dev-db` - Watch build for `@repo/db`
- `make db-generate` - Prisma client
- `make db-reset` - Seed reset

### Windows: install `make`

Pick one option:

```powershell
# Chocolatey
choco install make

# Scoop
scoop install make

# Winget (GnuWin32)
winget install -e --id GnuWin32.Make
```

Then run `make` from PowerShell or Git Bash.

## Desktop App

The Zan Provider Agent is an Electron-based desktop application that allows GPU providers to participate in the decentralized compute network.

### Download Latest Release

Download the latest version from [GitHub Releases](https://github.com/uk-2149/Zan/releases):

- Linux: `.AppImage`, `.deb`, or `.snap` packages
- Windows: `.exe` installer
- macOS: `.dmg` disk image

### Building from Source

```sh
# Install dependencies
pnpm install

# Build all dependencies
pnpm --filter @repo/provider-agent --include-dependencies build

# Build for your platform
cd apps/agent
npm run build:linux    # Linux
npm run build:win      # Windows
npm run build:mac      # macOS
```

### Creating Releases

To create a new release with downloadable binaries:

```sh
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

The GitHub Actions workflow will automatically build binaries for all platforms and attach them to the release.
