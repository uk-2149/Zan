## Local development

Use the Makefile to run the common local dev workflows:

```sh
make help
make install
make dev
```

Common targets:

- `make dev-web` - Next.js web app
- `make dev-server` - API server
- `make dev-agent` - Electron provider agent
- `make dev-db` - watch build for `@repo/db`
- `make db-generate` - Prisma client
- `make db-reset` - seed reset

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

- **Linux**: `.AppImage`, `.deb`, or `.snap` packages
- **Windows**: `.exe` installer
- **macOS**: `.dmg` disk image

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
# Use the release script
./scripts/release-agent.sh v1.0.0

# Or manually create and push a tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

The GitHub Actions workflow will automatically build binaries for all platforms and attach them to the release.
