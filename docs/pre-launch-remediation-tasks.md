# Pre-launch remediation tasks

**Status: proposals only; nothing in this backlog was implemented by the audit.**

Use this with [the audit report](pre-launch-audit.md), [evidence](audit-evidence.json) and [dependency inventory](audit-dependencies.csv). The audited state includes uncommitted changes based on `1eb1faa`. Reinspect the current tree before starting a task; its source line numbers may have moved.

Authorize **one task ID at a time**. Do not treat this document as permission to implement all tasks, change dependencies, contact third parties, deploy, or perform attacks. Preserve unrelated user changes and do not rewrite the historical audit to imply a fix has been verified. Record a task’s implementation, checks and residual limitations separately when it is authorized.

Effort is relative: S = localized change, M = coordinated change/tests, L = multiple operating/legal decisions. These are not delivery-time promises. “Required” reflects the audited full-feature, privacy-conscious public release; a narrower release requires an explicit product decision and accurate UI/docs.

## T01 — Make concurrent-tab writes conflict-aware

- **Finding:** AUD-001. **Priority:** P1, required. **Owner:** application/storage engineer. **Effort:** M. **Dependencies:** none.
- **Evidence:** [session.ts:112](../src/lib/session.ts#L112), [session.ts:126](../src/lib/session.ts#L126), [App.tsx:225](../src/App.tsx#L225).
- **Task:** introduce revision-aware content writes or an equivalent transactional conflict protocol. Reject changed-session and stale-revision updates with explicit results. Preserve a conflicting tab’s draft/recovery copy without overwriting the other session. Add freshness notification/cooperative locking if useful, but do not rely on notification alone for correctness. View-only stale writes may be intentionally ignored; content/draft writes must not falsely acknowledge success.
- **Acceptance:**
  - [ ] Two tabs edit different files from the same initial Pack: both edits survive, or the second tab receives an explicit conflict with its text recoverable.
  - [ ] Another tab replaces/forgets the active session: stale Apply and draft writes do not claim Saved and do not discard the user’s text.
  - [ ] Simultaneous writes cannot silently replace a newer Pack. Test the storage transaction boundary, not just a mocked happy-path callback.
  - [ ] Refresh, private/storage-denied modes, normal single-tab editing and browser view restore remain usable.

## T02 — Stop demo URLs from replacing saved work

- **Finding:** AUD-002. **Priority:** P1, required. **Owner:** frontend engineer. **Effort:** S–M. **Dependencies:** coordinate with T01 session identity rules.
- **Evidence:** [App.tsx:114](../src/App.tsx#L114), [session.ts:65](../src/lib/session.ts#L65).
- **Task:** make URL-based examples non-persistent until an explicit user decision, open them separately, or route replacement through the same protective workflow as folder import. Do not overwrite an existing saved Pack/draft merely because a query parameter is present. Handle effect remounts and repeated links idempotently.
- **Acceptance:**
  - [ ] An applied unexported edit and an unfinished draft survive navigating to `?example=database`, reopening that link, and refreshing it.
  - [ ] An empty first-time profile still opens the example successfully.
  - [ ] Any actual replacement is an explicit choice; keep/export options preserve the original data.
  - [ ] Update demo-oriented tests to use deliberate setup rather than relying on destructive URL reset behavior.

## T03 — Version pending editor operations and save acknowledgements

- **Finding:** AUD-003. **Priority:** P1, required. **Owner:** frontend/storage engineer. **Effort:** M. **Dependencies:** T01 conflict results.
- **Evidence:** [App.tsx:169](../src/App.tsx#L169), [App.tsx:201](../src/App.tsx#L201), [App.tsx:211](../src/App.tsx#L211), [NodeEditor.tsx:87](../src/components/NodeEditor.tsx#L87).
- **Task:** design an explicit pending-apply/draft revision model. Either disable relevant editing/discard/navigation actions while a commit is pending or retain any newer draft instead of clearing it. A completed save may acknowledge only the exact revision it stored. Make double Apply, Keep draft, Discard and close behavior deterministic.
- **Acceptance:**
  - [ ] With a bounded delayed IndexedDB transaction, type after clicking Update: newer text is preserved or typing is clearly unavailable before acceptance.
  - [ ] An older draft-write completion never marks newer, unpersisted text Saved.
  - [ ] Apply cannot later resurrect text the user explicitly discarded while that operation was pending.
  - [ ] Reload after an acknowledged save restores that acknowledged revision; failed storage retains a recovery path.

## T04 — Remove unintended duplicate draft retention

- **Finding:** AUD-004. **Priority:** P2, required for privacy-conscious release. **Owner:** application/privacy engineer. **Effort:** S–M. **Dependencies:** coordinate with T01/T08 record shape.
- **Evidence:** [session.ts:97](../src/lib/session.ts#L97), [App.tsx:215](../src/App.tsx#L215).
- **Task:** define explicit persisted record fields instead of spreading UI/restoration objects into storage. Keep drafts in one intentional location. Clear obsolete embedded `draft` fields in existing records without discarding valid current drafts or applied content. Review raw baselines/other duplicate copies and document necessary retention separately.
- **Acceptance:**
  - [ ] Create a marker in a draft, recover it after reload, discard it, then edit another file. No unrelated `active.draft` copy is reintroduced.
  - [ ] Removing sensitive text from a recovered draft before Apply does not retain the old draft in hidden session metadata.
  - [ ] Pending, kept and applied drafts still recover correctly; Forget clears all application records and the remembered handle reference.
  - [ ] Do not claim forensic secure erasure from browser/OS backups; state the application-level deletion boundary accurately.

## T05 — Define defensible direct-write concurrency and recovery

- **Finding:** AUD-005. **Priority:** P2, required before enabling direct overwrites of important files unless explicitly accepted/scoped out. **Owner:** filesystem/application engineer. **Effort:** M–L. **Dependencies:** T01, T04; retention decisions from T09.
- **Evidence:** [folder-access.ts:95](../src/lib/folder-access.ts#L95), [folder-access.ts:101](../src/lib/folder-access.ts#L101).
- **Task:** serialize cooperating app writers; use supported exclusive browser file locks where available; preserve a disclosed recovery copy and report partial effects. Define a realistic policy for an OS editor changing a file between the final read and commit. Browser locks must not be claimed to exclude every external OS writer. If acceptable protection/recovery cannot be supplied, choose ZIP/new-copy export for the first release and explicitly defer original-file overwrites.
- **Acceptance:**
  - [ ] Pre-existing external edits and new-file collisions remain protected.
  - [ ] Inject a change between the last comparison and writable creation/close: demonstrate the chosen recovery/conflict behavior and document unavoidable API limits.
  - [ ] Permission denial, revoked permission, disk-full and aborted streams retain recoverable edits and honest status.
  - [ ] Backup location, retention, deletion and any additional sensitive copies are disclosed. No unsupported promise of atomic multi-file save or zero overwrite risk remains.

## T06 — Order file saves by dependencies and recover incomplete copies

- **Finding:** AUD-006. **Priority:** P2. **Owner:** filesystem engineer. **Effort:** M. **Dependencies:** coordinate with T05 save plans.
- **Evidence:** [folder-access.ts:71](../src/lib/folder-access.ts#L71), [folder-access.ts:88](../src/lib/folder-access.ts#L88).
- **Task:** create a deterministic dependency-aware write plan for complete empty-folder copies and changed/all-new subtrees. For cyclic or invalid authored graphs, define explicit behavior rather than promising an impossible universal child-first ordering. Maintain precise completed/remaining records and safe retry baselines, including new empty files left by failed streams.
- **Acceptance:**
  - [ ] Acyclic root/child/grandchild packs save targets before references regardless of Map insertion order or `originals` representation.
  - [ ] Empty target, existing target, all-new subtree, existing parent, shared reference and cycle cases have intentional tested behavior.
  - [ ] Failure after each write position reports exact completed/remaining work and can resume without overwriting unexpected files.
  - [ ] UI/docs describe partial-copy limits accurately. This task alone is not a requirement for server-style atomic directory transactions.

## T07 — Bound authoring, scanning and comparison resources

- **Finding:** AUD-007. **Priority:** P2, strongly recommended before customer data. **Owner:** application/performance engineer. **Effort:** M. **Dependencies:** none.
- **Evidence:** [NodeEditor.tsx:27](../src/components/NodeEditor.tsx#L27), [editing.ts:110](../src/lib/editing.ts#L110), [drop.ts:27](../src/lib/drop.ts#L27), [folder-access.ts:38](../src/lib/folder-access.ts#L38).
- **Task:** enforce UTF-8 byte limits before draft persistence, preview and add-child parsing; keep total Pack limits coherent. Bound entry enumeration, directory/path depth, diagnostic/AST growth and disk comparison reads. Keep expensive parsing off the main UI thread where justified. Add cancellation/time-budget behavior without discarding an already valid workspace.
- **Acceptance:**
  - [ ] Just-over-limit multibyte drafts are rejected or safely handled before parse/store/preview; text is not silently truncated or lost.
  - [ ] Many unsupported entries and deep paths hit a documented budget rather than bypassing Markdown file-count limits.
  - [ ] A disk file that has grown beyond comparison limits is not loaded unboundedly or overwritten.
  - [ ] Test with bounded synthetic fixtures; do not run uncontrolled memory/CPU exhaustion or third-party attacks.

## T08 — Version and validate restored state; recover outside the renderer

- **Finding:** AUD-008. **Priority:** P2, strongly recommended before important files. **Owner:** application architect. **Effort:** M. **Dependencies:** align schema with T01/T04.
- **Evidence:** [session.ts:82](../src/lib/session.ts#L82), [App.tsx:453](../src/App.tsx#L453), [WorkspaceBoundary.tsx:4](../src/components/WorkspaceBoundary.tsx#L4).
- **Task:** add a versioned, validated persisted model and defined migration/fallback behavior. Validate document records, warnings, draft/view fields and finite geometry. Prefer restoring trusted parsed output by reparsing bounded raw source rather than trusting arbitrary saved HAST indefinitely across security updates. Provide an application/editor-level recovery boundary and a safe raw export/reset path outside the failing renderer. Do not automatically erase recoverable customer data.
- **Acceptance:**
  - [ ] Missing warnings, malformed views/documents/drafts, unknown schema versions and failed migrations cannot leave a permanently blank app.
  - [ ] Recovery/export/reset is available even when normal header/editor/tree rendering fails.
  - [ ] Valid previous-version data migrates or is preserved with a clear choice; corrupt parsed state can be rebuilt from valid raw source.
  - [ ] IndexedDB blocked/denied/quota/version-change cases close resources and produce accurate feedback. Browser storage eviction is disclosed, not represented as recoverable cloud backup.

## T09 — Resolve privacy facts and publish accurate local-data choices

- **Finding:** AUD-009; supports AUD-004/005/010. **Priority:** P2, required for privacy-conscious public release. **Owner:** product/privacy owner with qualified counsel as needed. **Effort:** M–L. **Dependencies:** operator decisions; coordinate T04/T05/T10/T11.
- **Task:** establish the actual operator/contact, countries offered to, intended ages, hosting/processor roles, monetization, and intended sensitive-data uses. Obtain jurisdiction-specific review where applicable. Publish accessible, accurate notices covering local raw/parsed data, old baselines, drafts, navigation, directory handles, retention, deletion/export, host metadata and separate external-agent workflows. Provide a sensible shared-device/private-session or remember choice and a way to disconnect a remembered handle without implying OS permission revocation.
- **Acceptance:**
  - [ ] Import-time wording and the full notice explain automatic persistence before a user inadvertently leaves sensitive material on a shared profile.
  - [ ] Forget/export/correction/retention behavior is described truthfully; external disk/ZIP/clipboard copies are outside app deletion.
  - [ ] Browser permission revocation instructions are accurate for supported platforms; no nonexistent revoke API is promised.
  - [ ] GDPR/UK/ePrivacy, India DPDP commencement/roles, US thresholds and children’s applicability are determined from real facts, not assumed from a checklist.
  - [ ] A DPA, consent banner, age collection or telemetry is added only if actually justified. Do not silently add collection as a purported compliance fix.

## T10 — Establish a trusted, dedicated production origin

- **Finding:** AUD-010. **Priority:** P1 verification gate. **Owner:** deployment/security owner. **Effort:** S–M plus hosting decision. **Dependencies:** actual production hostname.
- **Evidence:** [session.ts:32](../src/lib/session.ts#L32), [session.ts:18](../src/lib/session.ts#L18).
- **Task:** inventory code hosted on the same exact scheme/host/port. Treat URL paths and IndexedDB database names as organization, not security isolation. If using repository Pages under a shared account origin, use a dedicated custom origin or otherwise establish an acceptable trusted-code boundary for sensitive documents and remembered file handles.
- **Acceptance:**
  - [ ] The chosen origin, sibling-app trust model and administrator ownership are recorded.
  - [ ] An unrelated/untrusted sibling application cannot share the origin of sensitive browser storage/capabilities, or the risk is explicitly accepted under a restricted product model.
  - [ ] Test storage and directory-permission behavior using synthetic data on the actual deployment topology, only with authorization.
  - [ ] Do not propose unique database names or URL paths as an isolation fix. Explain any origin migration/reimport/export requirement without losing existing data.

## T11 — Verify actual deployment policies and transport

- **Finding:** AUD-011. **Priority:** P1 verification gate. **Owner:** SRE/deployment security engineer. **Effort:** M. **Dependencies:** T10 and chosen host; authorization for external requests.
- **Evidence:** [index.html:4](../index.html#L4), [vite.config.ts:4](../vite.config.ts#L4); no deployment/header policy was found.
- **Task:** verify HTTPS redirects, certificate/hostname/TLS policy, MIME/nosniff, referrer policy, anti-framing, CSP, domain ownership and safe artifact caching. Design CSP for the real app’s self-hosted assets, dynamic imports, style attributes and worker/ZIP behavior. Verify hosting capabilities instead of assuming a meta tag can implement every header; frame-ancestors is a response policy. Verify origin/DNS/domain claim protections and administrator permissions.
- **Acceptance:**
  - [ ] Preserve actual production response/configuration evidence after authorized verification; do not treat the temporary Python audit server as production.
  - [ ] CSP constrains scripts/connections/frames appropriately and does not break parsing, ZIP workers, fonts, dialogs or canvas transforms.
  - [ ] Reviewed static artifacts, not a development server, are published with sensible HTML-versus-hashed-asset cache policy.
  - [ ] Required policies that the chosen host cannot supply are explicitly resolved or risk-accepted, not invented as already configured.

## T12 — Ship dependency notices with the release artifact

- **Finding:** AUD-012. **Priority:** P1, required before distribution. **Owner:** release engineer with license reviewer. **Effort:** S–M. **Dependencies:** reviewed release dependency graph.
- **Evidence:** [package.json:16](../package.json#L16), [audit-dependencies.csv](audit-dependencies.csv), temporary build inventory in [audit-evidence.json](audit-evidence.json).
- **Task:** identify the dependencies actually bundled/distributed and include their required copyright/license texts and any applicable notices in an accessible shipped artifact. Preserve the two verified OFL font notices. Distinguish development-tool licensing from browser/runtime distribution; review MPL-covered tools if those tools/binaries/source are redistributed.
- **Acceptance:**
  - [ ] The built site/downloadable distribution includes the required React and other relevant MIT/ISC notices, not just package.json metadata or a link to a package manager.
  - [ ] Notices match the locked versions and the actual shipped graph; CI/release verification detects drift.
  - [ ] Font copyright/OFL terms remain intact. No unsupported GPL/AGPL compatibility conclusion is introduced.

## T13 — Decide application/skill licensing and attest provenance

- **Finding:** AUD-013. **Priority:** P3; required before claiming OSS reuse permissions. **Owner:** repository owner/legal reviewer. **Effort:** S–M. **Dependencies:** owner decision, not an engineer’s inferred license preference.
- **Evidence:** [package.json:1](../package.json#L1), [README.md:1](../README.md#L1), [skill metadata](../skills/depthwise-question-tree/SKILL.md#L1).
- **Task:** choose an explicit license for application and portable skill, identify ownership, verify asset/sample/contribution provenance, and decide contribution/IP terms. Do not assume the font licenses license the application or that public GitHub source grants general OSS reuse.
- **Acceptance:**
  - [ ] License terms and scope are owner-authorized and consistent across repository, skill download and docs.
  - [ ] Attribution/provenance records cover any copied/generated assets and code where needed; unresolved rights go to qualified counsel.
  - [ ] If keeping rights reserved, marketing/reuse invitations reflect that choice rather than implying an OSS grant.

## T14 — Authorize current advisory checks and establish a release gate

- **Finding:** AUD-014. **Priority:** P1 verification gate. **Owner:** security/release engineer. **Effort:** M, then ongoing ownership. **Dependencies:** authorization for external advisory/registry access; T12 graph.
- **Evidence:** [package.json:11](../package.json#L11), [package-lock.json:1](../package-lock.json#L1); 225 locked entries and no CI workflow found.
- **Task:** run an approved current dependency/advisory check, assess actual runtime/build reachability and upstream support, review optional lifecycle scripts, and document remediation/exception ownership. Establish clean, lockfile-based builds and automated meaningful unit/browser/security/license release checks. Use least-privilege deployment credentials, trusted/pinned automation and protected publishing paths. Do not install scanners or change versions without separate authorization.
- **Acceptance:**
  - [ ] Date, tool/database freshness, dependency scope, advisory IDs/reachability and owner-approved exceptions are recorded. A failed/unavailable scan is not zero vulnerabilities.
  - [ ] Reproduce the release in a clean controlled environment with a reviewed lockfile; validate artifact provenance and absence of embedded secrets.
  - [ ] High-impact reachable advisories are fixed or formally accepted before release; the update/recheck owner is named.
  - [ ] Build/test automation does not receive unnecessary secrets or publish untrusted changes. Review isolated headless-browser test settings appropriately.
  - [ ] Review the separately executed skills CLI command/version/telemetry boundary without presenting it as an application document-upload integration.

## T15 — Reconcile the failing browser acceptance check and evidence

- **Finding:** AUD-015. **Priority:** P2, release-assurance gate or explicit owner acceptance. **Owner:** frontend/test engineer. **Effort:** S–M. **Dependencies:** approved save-bar/node layout; recheck after T01/T02/T03 changes.
- **Evidence:** [tests/header_browser.py:39](../tests/header_browser.py#L39), [docs/verification.md:81](verification.md#L81).
- **Task:** determine whether the intended focus clearance is relative to the app header or the actual canvas below its save bar. Correct the implementation or assertion accordingly, preserving the user-approved layout and control clearance. Re-run current acceptance tests and replace ambiguous historical “passes” with dated/scoped evidence.
- **Acceptance:**
  - [ ] The current measured 149px root top / 76px header bottom discrepancy is explained and tested against the actual requirement.
  - [ ] Focused/expanded files stay within the real canvas and clear its controls across desktop/tablet/phone and short heights.
  - [ ] New branch plus controls, Edit placement, draft/export and keyboard flows have meaningful coverage.
  - [ ] No assertion is removed merely to make a test green. Record unrun/manual/browser-specific checks honestly.

## T16 — Resolve motion accessibility and verify the interaction model

- **Finding:** AUD-016. **Priority:** P2, likely WCAG issue; required before a WCAG conformance claim. **Owner:** frontend/accessibility engineer with specialist review. **Effort:** M. **Dependencies:** product decision on motion; T15 current layout.
- **Evidence:** [LandingTree.tsx:23](../src/components/LandingTree.tsx#L23), [style.css:397](../src/style.css#L397), [tests/landing_browser.py:25](../tests/landing_browser.py#L25).
- **Task:** provide an accessible in-page way to pause/stop/hide the automatic infinite demo, make it user-initiated, or substantiate a genuine essential-motion exception with an expert. Keep reduced-motion support. Preserve the restrained UI through a subtle control if desired; do not force OS settings as the only method. Review tab/arrow navigation, focus visibility/obscuration, drag alternatives, zoom/reflow, dialogs, announcements, contrast and semantics. Verify real supported browsers and file-access fallback behavior.
- **Acceptance:**
  - [ ] A keyboard/screen-reader user can control ongoing automatic motion while reading, unless a documented valid exception applies.
  - [ ] Landing tests no longer enforce the absence of a control that the accepted accessibility design requires.
  - [ ] Focus is visible and reachable in panned/zoomed trees, including Edit and add-plus controls; selected-node styling is evaluated rather than assumed sufficient.
  - [ ] Record named browser/AT combinations and test results. Do not claim complete WCAG 2.2 or legal compliance from automated checks alone.

## T17 — Establish release, support and incident ownership

- **Finding:** AUD-017. **Priority:** P2, required for a supported public service handling important files. **Owner:** product/SRE/security owner. **Effort:** S–M. **Dependencies:** T09 roles/contact and T10/T11/T14 deployment facts.
- **Evidence:** [README.md:99](../README.md#L99), [package.json:6](../package.json#L6); no repository security/incident/release runbook found.
- **Task:** document a vulnerability reporting/contact process, release approval, artifact rollback, frontend/IndexedDB compatibility, synthetic restore/export checks, static-site availability monitoring, host cost/quota ownership and incident triage. Existing external organizational procedures may satisfy this if evidenced. Define legal-notification assessment contacts without asserting every incident triggers every law.
- **Acceptance:**
  - [ ] Users/researchers have a safe reporting/support channel and a named owner.
  - [ ] A rollback drill using synthetic saved data establishes which app/storage versions remain compatible and how users recover/export data.
  - [ ] Uptime/asset checks and any alerts avoid collecting customer Markdown, file names, drafts, directory handles or exploration history by default.
  - [ ] Browser data is not represented as a server backup. Export/retention/eviction limitations are documented.
  - [ ] Hosting/repository least privilege, MFA/ownership, domain lifecycle and release/dependency monitoring responsibility are verified or explicitly left as open gates.

## Completion record template

For each authorized task record: task ID, selected scope, changed files, tests and evidence, any newly introduced data processing or permissions, residual limitations, reviewer/owner acceptance, and commit/release reference. Mark a task complete only when its acceptance criteria have been verified or a specific exception has been explicitly accepted. This audit grants no deployment, external scanning or remediation authorization.
