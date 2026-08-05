# FreshStart Bankruptcy Product Blueprint

## Purpose

FreshStart helps an individual understand and organize the financial facts that a bankruptcy attorney will need before advising whether bankruptcy, a non-bankruptcy alternative, Chapter 7, or Chapter 13 should be considered.

The system must never present a chapter recommendation as a legal conclusion. It presents verified figures, missing evidence, urgent facts, and questions for professional discussion.

## Client workflow

1. Start a private request.
2. Describe the financial goal and urgent collection activity.
3. Enter household and spouse information.
4. Build income sources with frequency and evidence.
5. Build a monthly expense template.
6. List every creditor and classify the debt for review.
7. List assets, values, ownership, and liens.
8. Add supporting evidence metadata.
9. Review financial totals, missing items, and warnings.
10. Submit the package to the attorney.
11. Follow the consultation and case-preparation timeline.

## Attorney workflow

1. Receive submitted requests in a single queue.
2. Prioritize lawsuits, garnishments, foreclosure, repossession, arrears, and transfers.
3. Review normalized monthly cash flow.
4. Review secured, priority, and unsecured debt totals.
5. Review asset value and liens.
6. Request missing evidence.
7. Validate current means-test data, exemptions, jurisdiction, local rules, and filing requirements.
8. Discuss bankruptcy and non-bankruptcy alternatives with the client.
9. Record the professional decision and next steps.
10. Move the timeline into consultation, decision, filing preparation, or closure.

## Intelligent financial template

### Income

- wages;
- self-employment;
- Social Security;
- pension or retirement;
- support received;
- rental income;
- other income.

Each source records gross amount, optional net amount, pay frequency, and linked evidence. Python converts weekly, biweekly, semimonthly, quarterly, and annual amounts to monthly equivalents.

### Expenses

- housing;
- utilities;
- food and housekeeping;
- clothing and laundry;
- medical and dental;
- transportation;
- insurance and taxes;
- childcare, education, and dependents;
- support paid;
- personal care and recreation;
- other expenses.

### Debts

- secured;
- priority;
- unsecured.

Each debt records creditor, description, balance, payment, delinquency, collateral, legal collection action, and evidence.

### Assets

- real estate;
- vehicles;
- bank accounts;
- retirement;
- personal property;
- insurance value;
- business interests;
- claims or rights to payment;
- other assets.

## Timeline

- request started;
- financial template in progress;
- evidence collection;
- request submitted;
- attorney review;
- consultation scheduled;
- professional decision pending;
- filing preparation, when authorized by counsel;
- closed or referred to another solution.

## Safety and legal boundaries

- No legal advice.
- No automatic chapter selection.
- No automatic eligibility determination.
- No official means-test result without current source data and attorney review.
- No court filing.
- No claim that the generated template replaces official forms.
- No storage of real files in the public demo.
- No silent alteration of client-provided financial information.

## Acceptance criteria

- Client and attorney roles use separate JWT identities.
- Client can create and complete a case.
- Income is normalized to monthly values.
- Expenses, debts, assets, and evidence can be added and removed.
- Python returns cash flow, debt composition, asset totals, completion, evidence coverage, missing items, warnings, questions, and next steps.
- Client can submit the request.
- Attorney can review the same case and update its status and notes.
- Timeline reflects every status transition.
- State survives page reloads and Vercel redeployments in the demo browser.
- Mobile layout exposes one workflow section at a time.
- All primary interactive patterns use Flowbite React components.
- Version, backend checks, frontend checks, build, and Playwright must pass before merge.
