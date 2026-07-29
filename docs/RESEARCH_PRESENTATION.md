# PKM-DES Research Presentation

## System Diagrams

The following system diagrams illustrate the architecture, domain models, and key workflows of the PKM-DES prototype. These diagrams should be used during research presentations to explain the technical implementation boundaries and behaviors.

### Context & Component Architecture
- **[System Context Diagram](diagrams/pkm-des-system-context.puml)**: High-level overview of actors (Student, Registrar) and external systems (Supabase Auth/DB). *Show this first to establish system boundaries and deployment separation.*
- **[Component Diagram](diagrams/pkm-des-component.puml)**: Deep dive into the internal modules, Server Actions, auth layers, and domain logic. *Show this to technical audiences to explain Next.js App Router boundaries and database interaction.*

### Database Schema
- **[Domain Model](diagrams/pkm-des-domain-model.puml)**: Visualizes the PostgreSQL relational schema, including profiles, students, programs, subjects, enrollments, and audit logs. *Show this when explaining data structure and the separation of official records from active accounts.*

### Key Workflows (Sequence Diagrams)
- **[Account Claim Sequence](diagrams/pkm-des-account-claim-sequence.puml)**: Details the official record lookup, signed proof validation, and atomic Supabase user creation. *Show this when explaining the secure onboarding process.*
- **[Student Enrollment Sequence](diagrams/pkm-des-enrollment-sequence.puml)**: Traces the atomic enrollment submission and subject attachment for standard loads. *Show this to demonstrate duplicate protection and data integrity.*
- **[Admin Review Sequence](diagrams/pkm-des-admin-review-sequence.puml)**: Explains the admin approval/rejection process, including audit logging and stale concurrent review protection. *Show this when discussing concurrency handling and administrative controls.*
- **[Registration Form Sequence](diagrams/pkm-des-registration-form-sequence.puml)**: Shows how approved enrollments are transformed into the browser-print Draft Registration Form. *Show this to highlight the presentation mapping and access rules.*

### Deployment
- **[Deployment Diagram](diagrams/pkm-des-deployment.puml)**: Maps the temporary Vercel client-preview boundary against the Supabase cloud infrastructure. *Show this to clarify that the current environment is a fictional-data preview and not a production deployment.*

## Email Delivery & Health Requirement Architecture
- **Server-Only Email Abstraction**: Provides a pluggable `EmailAdapter` (Resend adapter for live, Mock adapter for preview).
- **One-Time Setup Link**: Generates a secure recovery/setup link to set account password without exposing raw secrets.
- **Requirement Verification Gate**: Gated enrollment approval in database RPC level using `student_requirements` table.
