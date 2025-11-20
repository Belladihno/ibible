# Contributing to REA Interactive Bible Backend

Thank you for your interest in contributing! Please read the following guidelines to ensure a smooth and consistent contribution process.

---

## Pull Request Guidelines

- **Issue Based:** Every PR must link to an issue or ticket. If there is no existing issue, please create one and link it before submitting your PR.
- **Use the PR Template:** When opening a pull request, use the template provided in `PULL_REQUEST_TEMPLATE.md`. This ensures all required information is included for reviewers.
- **Target Branch:** All pull requests must be made against the `staging` branch. Do not open PRs directly to `main`.
- **Branch Management:**
  - **No direct branches on the main repo:** Do not create new branches directly on this repository.
  - **Use forks:** Create your feature or fix branches on your own fork of the repository, then open a pull request from your fork to the `staging` branch of the main repository.

---

## Pre-Commit Guidelines

-  **Enforced by Husky & Commitlint:**
- **Conventional Commits:** All commit messages must follow the [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/) specification.
  - All commits must pass tests and linting checks before being accepted.
  - Commits that do not follow the Conventional Commit format and commits that fail tests and linting check will be rejected.

---

## Code Quality & Standards

- **Linting & Formatting:**
  - Please run `npm run lint` and `npm run format` before submitting your PR.
  <!-- - Ensure your code passes all tests (`npm run test`). -->
- **Documentation**
  - Update or add swagger documentation for any endpoint modified or added.
- **Tests:**
  - Run `npm run test` to ensure all tests pass. 
  - Add or update tests for any new features or bug fixes.
  - PRs without adequate test coverage may be rejected.

---

## General Contribution Process

1. **Fork the repository** and clone your fork locally.
2. **Create a new branch** on your fork for your feature or fix.
3. **Make your changes** following the coding standards and commit guidelines.
4. **Push your branch** to your fork.
5. **Open a pull request** from your fork/branch to the `staging` branch of the main repository.
6. **Fill out the PR template** and ensure all CI checks pass.

---

## Additional Notes

- Be respectful and constructive in code reviews and discussions.
- If you have questions, open an issue or ask in the relevant discussion thread.
- Large or breaking changes should be discussed with maintainers before starting work.

Thank you for helping make REA Interactive Bible Backend better!
