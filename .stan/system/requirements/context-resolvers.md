# Requirements Addendum — Context Resolvers (hybrid)

When updated: 2026-01-04T00:00:00Z

Purpose

- Define a DRY, per-event-type mechanism to enrich handler options with
  resolved contextual data (e.g., auth-derived user data) without bespoke
  handler wrappers.
- For HTTP, also surface the invoked SMOZ route context token (`public`,
  `private`, `my`) to the handler.

Runtime handler options

- Rename `HandlerOptions.securityContext` to `HandlerOptions.httpContext`.
  - For HTTP invocations, `httpContext` MUST be present and MUST be one of:
    - `public` | `private` | `my`
  - For non-HTTP invocations, `httpContext` MUST be absent/undefined.
- Add `HandlerOptions.resolvedContext`.
  - For any event type, if a context resolver is configured and runs, its
    return value MUST be passed to the handler as `options.resolvedContext`.
  - `resolvedContext` MUST be optional/undefined when no resolver is configured
    (or when the configured resolver does not apply to the invocation).

Resolver configuration (App.create)

- The runtime MUST support “hybrid” context resolvers configured per event type:
  - For HTTP event types (e.g., `rest`, `http`):
    - Configure resolvers per HttpContext token:
      - A resolver MAY exist for `my`, `private`, and/or `public`.
      - A resolver is invoked only for the invocation’s resolved `httpContext`.
  - For non-HTTP event types:
    - Configure a single resolver per event type.
- Resolver error policy:
  - Resolvers may perform any logic and may throw.
  - SMOZ MUST NOT impose claim-specific behavior or special-case error policy.
  - For HTTP, resolver-thrown errors MUST flow through the existing HTTP error
    handling pipeline and response shaping.

HTTP invocation context detection (path prefix only)

- For HTTP event types, the invoked `httpContext` MUST be determined by request
  path prefix only:
  - If the first path segment is `my` or `private`, that token is the
    invocation `httpContext`.
  - Otherwise the invocation `httpContext` is `public`.
- Reserved segments:
  - The first path segment tokens `my` and `private` are reserved for SMOZ
    context routing. Public routes MUST NOT use these tokens as their first path
    segment.

Serverless/OpenAPI route surface parity (hard invariant)

- The deployed Serverless HTTP event surface MUST be in sync with the published
  OpenAPI surface produced by SMOZ.
- Context routing:
  - `public` routes are unprefixed: `/resource/...`
  - non-public routes MUST be prefixed:
    - `private`: `/private/resource/...`
    - `my`: `/my/resource/...`
- Builders:
  - Serverless and OpenAPI MUST use the same normalization and context prefix
    logic for base paths and path parameters.
- Context event fragments:
  - Serverless generation MUST merge the configured
    `httpContextEventMap[httpContext]` fragment into each generated HTTP event
    for that context (e.g., Cognito authorizer for `my`, `private: true` for
    `private`).
- Uniqueness:
  - SMOZ MUST NOT attempt to publish multiple HTTP events with identical
    `(method, path)` pairs; context differentiation is via path prefixes.

Execution ordering (HTTP runtime)

- When schemas are present, resolver execution MUST occur after the incoming
  event has passed pre-handler validation and before the business handler runs.
- HEAD short-circuit:
  - Resolver execution MUST NOT occur if the HTTP request is HEAD and the
    handler is short-circuited (i.e., the business handler does not run).

Typing requirements

- The output type of a configured resolver MUST flow into the business handler’s
  third argument (`options.resolvedContext`).
- When an endpoint is published on multiple httpContexts, handler options may be
  a discriminated union keyed by `options.httpContext`.
