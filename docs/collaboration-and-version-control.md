# Collaboration and Version Control

## Branching Strategy
We follow a simplified Git Flow model:
- `main`: Production-ready code.
- `develop`: Ongoing development.
- `feature/*`: New features and bug fixes.

## Commit Message Standards
Use clear and descriptive commit messages following the Conventional Commits specification:
- `feat: add patient SMS notifications`
- `fix: resolve queue position calculation bug`
- `docs: update deployment instructions`

## Pull Request Process
1. Create a branch from `develop`.
2. Implement changes and add tests if applicable.
3. Open a Pull Request addressing the objective of the changes.
4. Wait for approval from Peter Thairu Muigai before merging.

## Onboarding
New collaborators should:
1. Review the [Code Conventions](./conventions.md).
2. Follow the [Developer Workflow](./workflows.md) to set up their environment.
3. Study the [System Architecture](./architecture.md) to understand the data flow.

---
*Author: Peter Thairu Muigai*
*Version: 1.0.0*
