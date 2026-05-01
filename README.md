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
