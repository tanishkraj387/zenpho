---
name: react-19-vite-developer
description: Use when implementing or reviewing frontend features in Zenpho's React 19, Vite, TypeScript app, including routing, state, data fetching, accessibility, and Supabase client integration.
---

# React 19 Vite Developer - version 1.1 - last updated: 2026-04-12 - by Laurie and Patrick

For this repository, read [`references/zenpho-project-context.md`](references/zenpho-project-context.md) before frontend implementation. Its project-specific conventions override generic defaults below.

## Purpose

Use this skill to design, implement, review, and refine frontend features in React 19 with Vite and TypeScript.

This skill is meant to support work such as:
- SPA frontend architecture
- feature-based UI delivery
- routing and layout composition
- typed API integration
- authentication-aware frontend behavior
- accessible and responsive component design
- testable and maintainable React application structure
- internationalized frontend applications

The expected outcome is production-conscious frontend work that is clear, typed, accessible, secure, maintainable, and aligned with documented architecture and project conventions.

---

## Engineering Principles

- align with React and Vite best practices where applicable
- apply SRP (Single Responsibility Principle): components, hooks, and modules should have focused responsibilities
- apply DRY carefully: remove wasteful duplication without introducing premature abstraction
- apply YAGNI: do not build speculative components, hooks, abstractions, or state layers without present need
- prefer clean code that is readable, explicit, and intention-revealing
- keep code easy to understand, easy to test, and easy to evolve
- choose clarity over cleverness
- let simplicity survive unless complexity is truly justified

---

## When to Use

Use this skill when:
- the project uses React 19 with Vite
- the frontend is written in TypeScript
- SPA frontend features need to be created or modified
- routing, layouts, pages, hooks, typed API integration, or state management are involved
- frontend testing strategy must be defined or improved
- accessibility, responsiveness, and documentation impact should be considered alongside frontend changes
- i18n, auth-aware UX, or query-driven data fetching are involved

Do not use this skill when:
- the work is purely backend
- the task is primarily infrastructure automation unrelated to the React application
- the stack is not React / Vite / TypeScript
- the task is purely product discovery without implementation or frontend architecture impact

---

## Assumptions

Default assumptions for this skill:
- the project uses React 19 with Vite and TypeScript
- code should align with an existing documented architecture when one exists
- secure coding is required by default
- test coverage should reflect feature risk and impact
- major changes should remain traceable to documented requirements or feature scope
- the repository is the source of truth for architecture, standards, and delivery documentation

Unless explicitly stated otherwise:
- use TypeScript everywhere
- use `pnpm` as the package manager
- do not use `any`
- prefer explicit, readable code over magical abstractions
- keep responsibilities clearly separated
- avoid silent architecture drift
- treat documentation updates as part of the work when relevant
- prefer SPA architecture unless the application clearly requires slug-heavy or SEO-critical routes such as blog-like content
- prioritize mobile-first responsive design
- prioritize accessibility from the start, not as a finishing pass
- enforce ESLint and Prettier as part of normal development workflow

---

## Core Working Principles

- clarify the feature or task before major implementation
- keep changes scoped to the stated objective
- prefer maintainability over unnecessary cleverness
- align code with architectural boundaries
- use React idiomatically, but not performatively
- favor explicit contracts and predictable behavior
- design for testability
- treat secure coding as normal engineering discipline
- update documentation when the implementation changes the project truth
- surface tradeoffs clearly instead of hiding them in code
- prefer lazy-loaded routes to reduce bundle size when appropriate
- keep UX accessible and responsive by default

---

## Recommended Workflow

1. Clarify the frontend objective, scope, and constraints
2. Identify impacted features, layouts, routes, hooks, and documentation
3. Check architecture, conventions, and existing patterns
4. Propose the implementation approach before large changes
5. Implement in scoped, traceable steps
6. Refine naming, accessibility, responsiveness, and boundary clarity
7. Add or update the appropriate tests
8. Update related docs, ADRs, or standards when relevant

---

## Architecture and Design Expectations

Prefer a feature-first structure with layout-aware organization.

Typical organization expectations:
- organize the project by features and layouts
- inside each feature, colocate related DTOs, hooks, components, and tests
- keep layout-level concerns separate from feature-level concerns
- keep routing explicit and understandable
- do not scatter feature logic across unrelated folders without justification

Prefer:
- feature-based organization
- layout-driven composition where appropriate
- focused components
- focused hooks
- DTOs or typed contracts at API boundaries
- explicit mapping between transport data and UI-facing models when useful
- minimal leakage of raw backend response shapes into the rest of the UI
- clear ownership of data fetching, rendering, and interaction responsibilities

When relevant, document major architecture impact through ARD or ADR updates.

---

## React and TypeScript Standards

- use TypeScript throughout the codebase
- do not use `any`
- prefer precise types, discriminated unions, and explicit contracts
- keep props typed explicitly
- prefer readable component APIs over clever generic overdesign
- keep components focused and intention-revealing
- separate rendering concerns from data and orchestration concerns when useful
- avoid deeply nested prop-drilling when composition or context solves the problem more clearly
- use React Context deliberately and sparingly
- consider Redux only when state complexity, cross-feature coordination, or operational needs clearly justify it
- do not introduce a global state layer by reflex
- prefer hooks with clear responsibilities
- keep side effects explicit and well-scoped
- avoid giant “do everything” components
- avoid premature custom abstractions for every repeated UI pattern
- prefer functional components
- keep route-level code split with lazy loading where appropriate

---

## Tooling Standards

- keep dependency usage explicit and justified
- avoid mixing package manager conventions across the same project
- keep scripts consistent and predictable
- prefer lightweight and maintainable frontend tooling
- ensure linting and formatting are enforced in normal development workflow

---

## Vite Standards

- use Vite as the default frontend build tool
- keep the setup lightweight and explicit
- prefer lazy loading for route-level bundles
- keep bundle size under control through code-splitting and dependency discipline
- avoid unnecessary framework layering on top of Vite
- prefer fast, understandable build and dev workflows over unnecessary complexity

---

## Routing Expectations

- use `react-router-dom` for routing
- prefer SPA routing by default
- do not introduce Next.js-style patterns into this stack
- keep route definitions explicit and maintainable
- use lazy-loaded routes where appropriate to reduce bundle size
- organize routes in a way that reflects feature and layout boundaries
- only move away from SPA-first assumptions when the product clearly requires slug-heavy, SEO-sensitive, or content-driven behavior

---

## Data Fetching and State Expectations

- prefer TanStack Query (`useQuery` and related patterns) for server-state management
- keep server state and client UI state conceptually separate
- avoid reinventing caching and request lifecycle behavior unnecessarily
- use React Context for limited shared application concerns when appropriate
- evaluate Redux versus Context based on actual complexity, not habit
- prefer the lightest state solution that remains clear and maintainable
- avoid storing duplicated server authority in multiple frontend layers without reason
- keep loading, error, and empty states explicit

---

## Authentication and Security Expectations

- do not store JWT auth tokens in local storage
- prefer secure cookie-based auth flows using HttpOnly cookies
- ensure frontend auth behavior respects backend trust boundaries
- do not trust client-side checks as a substitute for backend authorization
- handle auth expiration, unauthorized states, and forbidden states explicitly
- be careful with sensitive data exposure in the UI
- avoid logging sensitive auth or user data in the browser
- consider CORS implications in frontend/backend integration
- do not weaken security posture for convenience

For security-sensitive features, explicitly review:
- auth state handling
- protected route behavior
- token/session assumptions
- trust boundaries
- user role assumptions
- sensitive data exposure in components or logs

---

## API Integration Expectations

- keep frontend-to-backend contracts typed
- use DTOs or typed response models at API boundaries
- validate assumptions about backend payloads
- avoid leaking transport inconsistencies across the codebase
- document authorization expectations clearly
- handle loading, success, empty, error, unauthorized, and forbidden states intentionally
- think about backward compatibility when backend contracts evolve

If the task affects API behavior, reflect the impact in docs and tests.

---

## Form Handling Expectations

- form state and validation should be explicit, consistent, and maintainable
- avoid ad hoc form handling patterns scattered across the application
- choose a form approach deliberately based on project needs
- ensure validation feedback is accessible and understandable
- keep submission, loading, success, and error states explicit
- TypeScript-friendly validation libraries such as Zod may be preferred when starting from scratch, but the project should not enforce a library dogmatically without context
- the chosen form strategy may vary depending on the adopted UI framework, design system, validation complexity, and project conventions

---

## Internationalization Expectations

- use `i18next` for internationalization
- keep locale handling aligned with current best practices
- ensure locale selection and persistence are implemented deliberately
- avoid scattering translation keys chaotically across the codebase
- keep translation namespaces or organization understandable
- ensure UI text is translation-friendly
- do not hardcode user-facing copy when it should be localizable
- verify that accessibility text is also internationalization-aware where relevant

---

## Styling Expectations

- use a styling approach that is consistent across the application
- avoid mixing multiple styling paradigms without clear justification
- prefer maintainable and explicit styling choices
- ensure styling decisions support responsiveness, accessibility, and long-term readability

---

## UI Framework Expectations

- the UI framework may be Material UI, Mantine UI, or a custom design system
- the choice should be validated based on product needs, accessibility, maintainability, delivery speed, and design constraints
- do not assume one framework is always correct
- keep framework usage consistent once chosen
- avoid mixing multiple UI paradigms carelessly across the same application
- regardless of the framework choice, prioritize accessibility, responsiveness, and composability

---

## Accessibility and Responsive Design Expectations

- design mobile-first
- ensure responsive behavior across common screen sizes
- prioritize accessibility from the start
- use semantic HTML where possible
- ensure keyboard accessibility
- ensure visible focus states
- use accessible labels and roles
- do not rely on color alone to communicate meaning
- handle error messages and validation feedback accessibly
- ensure loading and empty states remain understandable
- verify dialogs, menus, and interactive elements are navigable and screen-reader-friendly

---

## Testing Expectations

### Testing Stack Preferences

Preferred defaults:
- Vitest
- React Testing Library
- V8 coverage
- Playwright, Cypress, or Selenium where end-to-end validation is required

For test structure:
- always use `/* arrange */`, `/* act */`, `/* assert */`
- never use `/* given */`, `/* when */`, `/* then */`
- `given/when/then` is considered less clear in this context and too closely tied to Cucumber / BDD-style conventions
- test phases should remain immediately readable and explicit

For testability hooks:
- add `data-testid`, `data-cy`, and other stable test attributes where appropriate
- prefer stable selectors over brittle CSS- or text-only targeting
- do not add meaningless attributes everywhere without purpose
- test-facing attributes should support Cypress, Playwright, Selenium, or other UI automation tools cleanly

Testing should reflect real risk, not just satisfy a ritual.

High code coverage does not guarantee that a feature is fully tested.
100% coverage can still miss:
- edge cases
- failure paths
- invalid input scenarios
- authorization problems
- accessibility regressions
- business rule gaps
- regression-prone behaviors

Coverage is only one signal.
Tests should be designed to validate meaningful behavior, including edge cases and non-happy-path scenarios.

### Unit Tests
Use for:
- pure UI logic
- mappers and formatters
- utility functions
- focused hooks
- focused component behavior with isolated dependencies where appropriate

### Integration Tests
Use for:
- route-aware rendering
- component interaction across boundaries
- query-driven flows
- i18n-aware rendering
- auth-aware rendering behavior
- form behavior
- error and empty state handling

### Functional / End-to-End Tests
Use when relevant for:
- authentication flows
- route transitions
- user-critical journeys
- regression-prone frontend workflows
- frontend/backend interaction through real interfaces

Also validate:
- invalid input
- unauthorized and forbidden access
- loading states
- empty states
- not found routes
- accessibility-sensitive interactions
- responsive behavior where relevant
- failure modes with meaningful UI behavior

---

## Documentation Expectations

Update documentation when relevant, including:
- feature docs
- PRD sections impacted by behavior changes
- architecture docs when boundaries, layouts, or flows change
- ADRs when a meaningful technical decision is made
- UI framework decisions
- i18n notes
- setup or operational notes
- testing or security standards if the change introduces new patterns

Do not let frontend implementation drift away from the documented project truth without acknowledgment.

---

## What to Avoid

- using `any`
- organizing the codebase in a way that scatters a single feature across unrelated folders without reason
- introducing Redux before state complexity justifies it
- treating React Context as a universal replacement for all state needs
- storing JWT auth tokens in local storage
- ignoring CORS implications in frontend/backend integration
- skipping accessibility until the end
- treating responsive behavior as optional
- overengineering simple UI features
- introducing abstractions before they are justified
- mixing multiple UI framework styles carelessly
- using unstable selectors for automated tests
- omitting stable test attributes when automation reliability depends on them
- changing architecture without documenting the impact
- assuming that 100% code coverage means the feature is fully tested
- ignoring edge cases because line coverage looks high
- using `/* given */`, `/* when */`, `/* then */` comments in tests
- adding broad refactors inside a narrowly scoped feature without explicit justification
- mixing `npm`, `yarn`, and `pnpm` conventions in the same project

---

## Definition of Done

A task using this skill is closer to done when:
- the frontend objective is met
- implementation follows React 19, Vite, and TypeScript conventions
- responsibilities remain clear across features, layouts, hooks, and components
- security-sensitive aspects were considered
- accessibility and responsive behavior were considered
- appropriate tests were added or updated
- test coverage is meaningful, not just numerically high
- important edge cases and failure paths were considered
- routing, state, and API integration implications were handled deliberately
- relevant documentation was updated
- known limitations or follow-ups were made explicit

---

## Example Tasks

- implement a protected SPA route with lazy loading and auth-aware rendering
- create a feature-first React module with typed DTOs, hooks, components, and tests
- integrate a paginated API using `useQuery` with loading, empty, and error states
- implement an accessible form flow with validation and responsive behavior
- review whether React Context or Redux is more appropriate for the current state complexity
- add i18next-based localization with deliberate locale persistence and typed usage patterns
- refactor a frontend flow to improve accessibility, testability, and feature-level organization

---

## Example Prompts

- "Implement a React 19 + Vite feature in TypeScript using feature-first organization, typed DTOs, hooks, components, and Vitest coverage."
- "Review this React frontend and identify architecture, accessibility, testing, and secure coding concerns."
- "Design the frontend structure for this feature in React 19 with Vite, including routing, layouts, hooks, query usage, and test strategy."
- "Refactor this SPA flow to improve responsiveness, accessibility, testability, and state management clarity."
