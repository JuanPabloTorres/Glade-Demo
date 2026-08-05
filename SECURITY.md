# Security policy

MatterReady is an evaluation application and must use non-sensitive demonstration data only.

## Reporting

Report suspected vulnerabilities privately to the repository owner. Do not include credentials, access tokens, personal records, or exploit payloads in public issues.

## Controls

- No credentials or deployment tokens are committed to source control.
- Production deployment configuration is stored in Vercel or GitHub encrypted secrets and variables.
- Dependency graphs are locked and updated through Dependabot pull requests.
- CI runs dependency audit, linting, type checking, tests, production build, and browser validation.
- The public interface does not expose internal controller names, routing diagnostics, stack traces, or secrets.
- Production responses use restrictive browser security headers.
- Production verification checks the deployed release version before recording success.

## Data handling

Use invented names and documents. Do not upload real legal, financial, medical, identity, or client information to this demo.
