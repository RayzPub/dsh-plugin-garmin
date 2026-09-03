# Contributing to dsh-plugin-garmin

Thank you for your interest in contributing to `dsh-plugin-garmin`! We welcome contributions, bug reports, feature proposals, and pull requests.

## Development Workflow

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Linux / macOS environment (Linux recommended for headless Connect IQ toolchain)
- OpenSSL (used for auto-generating developer_key.der)

### Setup
```bash
# 1. Clone the repository
git clone https://github.com/your-org/dsh-plugin-garmin.git
cd dsh-plugin-garmin

# 2. Install dependencies
npm install

# 3. Build TypeScript
npm run build

# 4. Run tests
npm test
```

## Pull Request Guidelines

1. **Keep Code Typed**: Ensure all TypeScript code compiles with strict mode enabled (`npm run build`).
2. **Add Tests**: If you introduce a new feature or fix a bug, please add corresponding unit tests under `test/`.
3. **MIP 64-Color Rule**: Any visual or color changes must adhere to the Garmin Fenix 7 MIP palette constraints.
4. **Memory Constraint**: Be mindful of Garmin Fenix 7's 128KB memory ceiling. Avoid heap allocations in runtime draw paths (`onUpdate`).
