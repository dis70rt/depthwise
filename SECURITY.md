# Security policy

Ethernode’s Depthwise maintainer handles security reports at **das.saikat.in@gmail.com**. Ethernode is a project name, not a representation that a company is registered. Do not post private Markdown, resumes, directory handles, recovery archives or credentials in public issues.

Send a concise description, affected version/commit and browser, impact, and a minimal synthetic reproduction. Email is the private reporting channel; GitHub private reporting is not assumed to be enabled. No bounty, response-time guarantee or legal safe-harbor promise is offered by this document. The maintainer will review reports, coordinate disclosure where practical, and record release fixes without exposing customer content.

Test only your own local installation with synthetic files unless the maintainer separately authorizes another scope. Do not attack hosting providers, send other users’ data, or test availability destructively.

Only the current reviewed release is maintained. Browser storage is not an encrypted backup or an app account. Use exports for important work, and avoid concurrent edits of the same workspace in multiple tabs: conflict-aware tab handling is an explicitly deferred audit finding (AUD-001). OS editors can still race browser folder writers; recovery copies do not guarantee exclusion of every external writer.

Release and incident procedures: [docs/release-runbook.md](docs/release-runbook.md). Reporting metadata is used to investigate/respond; the maintainer must keep access restricted and avoid retaining unnecessary personal data. The actual mailbox-provider retention/access configuration needs operator review.
