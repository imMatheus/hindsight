# Claude Code Configuration

## Package Manager

- Use `bun` instead of `npm` for all package management and script execution
- Run `bun install` instead of `npm install`
- Run `bun run <script>` instead of `npm run <script>`

## Build Commands

- Frontend: `bun run build`
- Development: `bun run dev`
- Linting: `bun run lint` (if available)
- Type checking: `bun run typecheck` (if available)

## Project Structure

- Backend: Go server in `/server` directory
- Frontend: React/TypeScript app in `/web` directory using Vite + bun

## Development Notes

- Always use bun for TypeScript operations in the `/web` directory
- The server uses Go modules for dependency management
- **NEVER** build or compile the Go backend files - the Go server is managed separately
