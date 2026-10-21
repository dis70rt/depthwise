# Depthwise pre-launch audit

**Date:** 2026-10-21. **Mode:** audit only; no remediation authorized or implemented.

**Audited baseline:** working tree based on commit `1eb1faa898cbb505a1fd06fbf48ac4ca265e7c8b`, including the uncommitted Markdown editor, ZIP export, direct folder writes, and related tests. This is not an audit of the committed revision alone. The source snapshot and check results are recorded in [audit-evidence.json](audit-evidence.json). The package inventory is in [audit-dependencies.csv](audit-dependencies.csv). Independently actionable tasks are in [pre-launch-remediation-tasks.md](pre-launch-remediation-tasks.md).

## 1. Executive summary

### Recommendation: NO-GO

Do not publicly release the current full-feature product for important or sensitive files yet. There are reproducible data-integrity defects, a privacy retention defect, and an incomplete distribution-license package. Deployment and current vulnerability exposure also have unresolved verification gates. No P0 exploit was established.

The most urgent findings are:

1. **AUD-001:** concurrent tabs can overwrite edits; a stale tab can report “Saved in browser” when nothing was saved.
2. **AUD-002:** visiting `?example=database` silently replaces the saved workspace, including unexported edits and drafts.
3. **AUD-003:** typing during an asynchronous Update tree operation can be discarded when the earlier update completes.
4. **AUD-004:** text from a discarded recovered draft can later remain in hidden saved-session metadata.
5. **AUD-012:** the built distribution includes JavaScript dependencies without their required license notices; only the font license files are shipped.
6. **AUD-010/011/014:** production origin isolation, hosting security, and current dependency advisories have not been verified.

There are **17 findings/gates**: 13 Confirmed, one Likely, and three Needs Verification. Severity distribution: seven P1, nine P2, one P3. Three P1 items are verification gates rather than proven vulnerabilities. Severity here is a release-priority classification, not CVSS: P0 emergency; P1 high-impact issue or unresolved essential release gate; P2 material weakness requiring planned remediation; P3 lower-risk clarification/hardening.

### Successfully verified, within the stated scope

- The repository implements a static browser application. No backend, HTTP API routes, authentication service, hosted database, payment integration, or application AI-provider API integration was found.
- All **35 existing unit tests** passed. TypeScript no-emit checking and a production build into a temporary directory passed.
- Selected raw HTML, script, SVG, iframe, `javascript:` and `data:` Markdown vectors did not execute in the local production build. Remote Markdown images became placeholders. External links used `noopener noreferrer`.
- Raw and percent-encoded parent traversal were rejected by the tested local-link resolver cases.
- Markdown imports enforce 1,000 Markdown files, 1 MiB per file and 20 MiB total; initial folder parsing uses a cancellable worker. These limits do not cover all authoring/scanning paths; see AUD-007.
- The linked-tree builder terminates ancestor references and limits visible linked occurrences to 2,000. This is not an AST or directory-enumeration limit.
- No third-party page requests were attempted during the final hostile-content and data-loss browser probes. Page routing also blocked any non-localhost requests if attempted.
- A **limited** redacted pattern screen found no matches in 69 current files and 156 reachable historical Git blobs. This was not a full secret-scanner assessment.
- All 225 locked package entries have integrity metadata and registry.npmjs.org URLs. All 183 installed package versions matched the lockfile. Both shipped font notices exactly matched their installed packages’ license files.

### Failed or unverified

- The existing header browser test **failed**, with root top 149px versus header bottom 76px and the test’s maximum permitted offset of 40px. This is likely an outdated assertion after the save bar was added, not evidence that content is obscured. The failure remains real and unresolved.
- The audit’s browser and in-memory probes reproduced the integrity/privacy defects described below. Passing these probes means the vulnerable behavior was reproduced, not that security passed.
- No live deployment, DNS, TLS, response headers, CDN policy, host logging, repository permissions, organization security process, or production billing configuration was examined.
- No live npm/OSV/GitHub advisory request was authorized or made. **Current dependency vulnerabilities are UNKNOWN, not zero.** No gitleaks, trufflehog, semgrep, OSV scanner, Syft, Grype or Trivy executable was available locally.
- The full browser regression suite, real native folder dialogs, real OS filesystem races, Firefox/Safari/mobile compatibility, screen-reader testing, and complete WCAG 2.2 conformance were not verified in this audit.
- No clean-room dependency installation, registry-content attestation, exhaustive dependency source review, exhaustive fuzzing, browser-profile disk forensics, or destructive stress testing was performed.

### Critical assumptions

The intended operator, business entity, actual launch markets, age groups, revenue model, production domain, hosting provider, and support/legal contacts are unspecified. GitHub Pages was discussed, but no deployed configuration was supplied. The privacy and legal assessment is conditional on those facts. Local-only processing reduces server-side exposure; it does not make browser storage, origin trust, file permissions, licensing, or legal responsibilities irrelevant.

### Architecture and trust boundaries

```text
Local selected/dropped folder (untrusted Markdown, paths and metadata)
  -> browser file filtering / UTF-8 decoding / worker parser
  -> Markdown AST -> sanitized HAST -> React reader / heading outline
  -> Pack and tree navigation in browser memory
  -> IndexedDB: active Pack, original file baselines, directory handle,
     independent draft, focused/expanded nodes, scroll/zoom/pan state

Node editor -> draft persistence -> apply -> rebuilt Pack
  -> ZIP download of raw Markdown, or
  -> user-selected, permission-checked filesystem directory -> Markdown writes

Browser -> deployment host: HTML, JS, CSS, fonts, favicon, skill download
User click -> external Markdown links / GitHub
User independently runs install command -> npm / skills CLI / GitHub / agent
```

The host supplies executable code and therefore sits inside the trust boundary for all remembered content and file capabilities. IndexedDB isolation is by **origin**, not application URL path. Browser profiles and operating-system accounts are the effective local user boundaries; there is no application account or tenant boundary. The skill is instructions for a separate user-controlled agent, not an embedded AI service. Uploaded/imported files are not sent to a backend by the reviewed application code. Exported Markdown retains its raw source, including any raw HTML; safe rendering inside this app does not certify safety in another renderer.

### Method, evidence and standards coverage

Repository inventory, application/dependency/configuration/documentation inspection, redacted reachable-history pattern screening, existing unit tests, type checking, a temporary production build, bounded in-memory probes, isolated Chrome/IndexedDB probes, and one existing browser acceptance test were performed. Test fixtures and profiles were temporary; browser page requests were limited to localhost. The existing browser script was executed through a temporary wrapper that changed only artifact destinations and installed the network restriction; its assertions were unchanged.

OWASP Top 10 themes and **ASVS 5.0** were used as topic coverage, not as a claim of full ASVS verification or a certified assurance level. No authoritative versioned checklist was fetched because third-party requests were prohibited.

| Framework area | Evidence-based assessment |
| --- | --- |
| ASVS encoding/sanitization, validation, file handling | Sanitizer and URL/path controls present; selected negative probes passed. Authoring/resource limits and concurrent writes need work: AUD-005/006/007. Exhaustive XSS/parser assurance not established. |
| ASVS authentication, authenticated sessions, authorization, tokens, OAuth/API | Not applicable to absent backend/accounts/APIs. Browser work-session integrity remains applicable: AUD-001/002/003. |
| ASVS data protection, secure communication, configuration | Local persistence and file capabilities require explicit disclosure and origin isolation: AUD-004/009/010. Deployed communication/configuration unknown: AUD-011. |
| ASVS architecture, error handling and dependency integrity | Restore recovery, release evidence and advisory gates incomplete: AUD-008/014/015/017. |
| NIST SSDF — Prepare the Organization | Operator, risk ownership, release criteria and privacy/legal applicability need documented decisions. |
| NIST SSDF — Protect the Software | Lockfile integrity present. Repository/CI access, artifact provenance and deployment controls unverified. |
| NIST SSDF — Produce Well-Secured Software | Sanitization and meaningful tests exist; demonstrated state races and incomplete resource controls remain. |
| NIST SSDF — Respond to Vulnerabilities | Current advisory status and a documented reporting/response process are missing or unverified. |

**Not applicable controls:** SQL/NoSQL injection, server command/template injection, SSRF, API BOLA/IDOR, password storage/reset, account recovery, server CSRF/session cookies, database network ACLs, container privileges, payment/refund/tax flows and model-provider API authentication were not found in the product architecture. They were not “passed.” Hosting/repository administrator security still requires separate verification. No runtime document analytics, advertising SDK, email delivery service, or credential storage was found.

## 2. Findings table

“Verified” refers to observed code or a completed local probe. “Suspected” identifies a plausible but unconfirmed production/standards risk. “Not tested” is a verification gap, not evidence of a vulnerability. Source links point at the audited working tree; absence of a policy/configuration file has no fabricated line reference.

| ID | Category | Severity / confidence / status | Exact evidence | Impact and recommended action | Blocks launch? |
| --- | --- | --- | --- | --- | --- |
| AUD-001 | Integrity / concurrency | P1 / Confirmed / VERIFIED | [session.ts:112](../src/lib/session.ts#L112), [session.ts:126](../src/lib/session.ts#L126), [App.tsx:225](../src/App.tsx#L225) | Whole-Pack last-writer-wins updates lose another tab’s edits. Different active IDs silently no-op yet resolve successfully. Add revision/CAS checks and explicit conflicts, retaining recovery drafts. | Yes |
| AUD-002 | Destructive navigation | P1 / Confirmed / VERIFIED | [App.tsx:114](../src/App.tsx#L114), [App.tsx:126](../src/App.tsx#L126), [session.ts:65](../src/lib/session.ts#L65) | Example query immediately persists a new session and deletes saved view/draft without the normal replacement guard. Make URL demos non-destructive or require a choice before replacement. | Yes |
| AUD-003 | Editor data loss | P1 / Confirmed / VERIFIED | [App.tsx:211](../src/App.tsx#L211), [App.tsx:225](../src/App.tsx#L225), [App.tsx:236](../src/App.tsx#L236), [NodeEditor.tsx:87](../src/components/NodeEditor.tsx#L87), [NodeEditor.tsx:111](../src/components/NodeEditor.tsx#L111) | Apply captures old text, awaits storage, then clears the current draft, including newer typing. Version or lock pending editor operations; ignore stale save completions. | Yes |
| AUD-004 | Privacy / retention | P2 / Confirmed / VERIFIED | [App.tsx:130](../src/App.tsx#L130), [App.tsx:215](../src/App.tsx#L215), [session.ts:97](../src/lib/session.ts#L97), [session.ts:118](../src/lib/session.ts#L118) | Recovered `session.draft` is copied into later active-session snapshots, retaining discarded private text outside the draft key. Persist a whitelisted DTO and remove duplicate/stale draft fields. | Yes for privacy-conscious release |
| AUD-005 | Local file integrity | P2 / Confirmed / VERIFIED model probe | [folder-access.ts:95](../src/lib/folder-access.ts#L95), [folder-access.ts:101](../src/lib/folder-access.ts#L101) | A writer changing disk content after the final comparison can still be overwritten. There is no recovery backup. Add supported cooperative locking/recovery and accurate residual-risk disclosure, or defer direct overwrites. | Yes for direct overwrite mode until mitigated/explicitly accepted |
| AUD-006 | Partial-write consistency | P2 / Confirmed / VERIFIED | [folder-access.ts:71](../src/lib/folder-access.ts#L71), [folder-access.ts:88](../src/lib/folder-access.ts#L88) | Complete copies to empty folders can write parents before children; all-new linked files also lack dependency ordering. Fix ordering and truthful partial-copy recovery/claims. | Not alone; cannot retain unconditional child-first claims |
| AUD-007 | Resource limits / local DoS resistance | P2 / Confirmed / VERIFIED limits gap | [NodeEditor.tsx:27](../src/components/NodeEditor.tsx#L27), [App.tsx:169](../src/App.tsx#L169), [editing.ts:110](../src/lib/editing.ts#L110), [drop.ts:27](../src/lib/drop.ts#L27), [folder-access.ts:38](../src/lib/folder-access.ts#L38) | Oversized drafts are saved/previewed before size enforcement; unsupported entries and disk comparison reads have no equivalent budgets. Add early UTF-8 limits, scan/depth budgets and bounded reads. | Strongly recommended; severe resource exhaustion NOT TESTED |
| AUD-008 | Restore / error recovery | P2 / Confirmed / VERIFIED | [session.ts:82](../src/lib/session.ts#L82), [App.tsx:453](../src/App.tsx#L453), [WorkspaceBoundary.tsx:4](../src/components/WorkspaceBoundary.tsx#L4) | Malformed saved metadata passes minimal validation, crashes outside the workspace boundary and removes recovery UI. Version/validate records and provide safe export/reset outside the failed renderer. | Strongly recommended before important customer data |
| AUD-009 | Privacy / product disclosure | P2 / Confirmed absence; legal applicability UNKNOWN | [LandingPage.tsx:96](../src/components/LandingPage.tsx#L96), [App.tsx:884](../src/App.tsx#L884), [session.ts:32](../src/lib/session.ts#L32), [README.md:5](../README.md#L5) | No dedicated operator privacy/contact notice; automatic indefinite local persistence and remembered file capabilities are not explained at import. Define roles/retention and provide accurate accessible disclosures/choices. | Yes before privacy-conscious public release; legal specifics require facts |
| AUD-010 | Origin isolation / confidentiality | P1 / Needs Verification / SUSPECTED deployment risk | [session.ts:32](../src/lib/session.ts#L32), [session.ts:18](../src/lib/session.ts#L18), [vite.config.ts:6](../vite.config.ts#L6) | A different path on the same origin can read the saved documents. Shared account-level Pages hosting may expose data to sibling applications. Verify topology and use a dedicated trusted origin for sensitive data. | Conditional gate; production topology UNKNOWN |
| AUD-011 | Deployment security | P1 / Needs Verification / NOT TESTED | [index.html:4](../index.html#L4), [vite.config.ts:4](../vite.config.ts#L4), [package.json:6](../package.json#L6); no deployment/header configuration found | Actual HTTPS/TLS, CSP, anti-framing, referrer, MIME and cache policies have no deployment evidence. Select a host, configure compatible policies and verify its real responses. | Verification gate |
| AUD-012 | Dependency distribution licensing | P1 / Confirmed / VERIFIED | [package.json:16](../package.json#L16), [public/licenses/jetbrains-mono-OFL.txt:1](../public/licenses/jetbrains-mono-OFL.txt#L1); temporary build inventory | Only two font license files ship; full MIT permission text is absent from emitted JS. Bundled React and other runtime dependencies require notice review and inclusion. Generate notices for the shipped graph. | Yes before distributing this build |
| AUD-013 | Own-code IP / OSS permissions | P3 / Confirmed absence / VERIFIED; rights UNKNOWN | [package.json:1](../package.json#L1), [README.md:1](../README.md#L1), [skills/depthwise-question-tree/SKILL.md:1](../skills/depthwise-question-tree/SKILL.md#L1); no root LICENSE found | Public source is not itself an OSS license grant. Choose the intended application/skill license and confirm contribution/asset rights. `private: true` is not a license. | Blocks OSS licensing claims/reuse invitation, not necessarily owner-operated hosting |
| AUD-014 | Supply chain / release assurance | P1 / Needs Verification / NOT TESTED advisory status | [package.json:11](../package.json#L11), [package.json:16](../package.json#L16), [package-lock.json:1](../package-lock.json#L1); no CI workflow found | No authorized current advisory check or automated security/release gate. Perform approved SCA, review lifecycle/toolchain dependencies, establish update and provenance controls. | Verification gate; no CVE asserted |
| AUD-015 | Regression assurance | P2 / Confirmed / VERIFIED failure | [tests/header_browser.py:39](../tests/header_browser.py#L39), [docs/verification.md:81](verification.md#L81), [App.tsx:522](../src/App.tsx#L522) | Existing header test fails after toolbar/layout changes. Reconcile the intended geometry and acceptance tests, then publish current evidence. Do not turn off assertions merely to obtain green checks. | Resolve or explicitly accept before release; not proof of a visual security defect |
| AUD-016 | Accessibility / motion | P2 / Likely / SUSPECTED WCAG issue; behavior VERIFIED | [LandingTree.tsx:23](../src/components/LandingTree.tsx#L23), [style.css:397](../src/style.css#L397), [tests/landing_browser.py:25](../tests/landing_browser.py#L25) | Automatic 9-second infinite motion runs alongside content without an in-page pause/stop/hide control. Likely WCAG 2.2.2 issue; OS reduced-motion support alone should not be assumed sufficient. Add an accessible control or make motion user-initiated; verify the essential-motion question and broader accessibility. | Before claiming WCAG conformance; applicability/legal scope needs review |
| AUD-017 | Operational ownership / response | P2 / Confirmed documentation gap; external process UNKNOWN | [package.json:6](../package.json#L6), [README.md:99](../README.md#L99); no SECURITY.md, release/rollback or incident runbook found | Public vulnerability reporting, support, incident ownership, rollback and browser-data compatibility procedures are undocumented in the repository. Establish a minimal privacy-preserving operating process. | Before a supported public service handling important files; internal process may satisfy if evidenced |

### Safe reproduction and technical detail

Only use synthetic folders and isolated profiles. The final audit probes are retained temporarily under `/tmp/depthwise-launch-audit-20261021/`; manual steps below remain usable if temporary artifacts are removed.

#### AUD-001 — tab conflicts and false successful saves

Import a two-file synthetic tree and open the same site in a second tab. Edit the root in tab A and a child in tab B. Reload: B’s entire stale Pack replaced A’s root change. Then open a third stale tab, replace the active workspace in another tab, and apply an edit in the stale tab. The UI reports Saved in browser while IndexedDB still contains the other workspace and no stale edit. `updateSession` has an ID check but no revision check, and an ID mismatch resolves without indicating that the write was skipped. `saveDraft` has the same silent-skip pattern. This is a data-integrity defect, not an authentication/session-token attack.

#### AUD-002 — demo URL replacement

Make and apply an unexported synthetic edit. Open the same origin with `?example=database`. The browser record becomes database-preparation and no replacement prompt is shown. `saveSession` replaces active data and deletes the draft and view keys. A public demo link can therefore destroy the only application copy of unexported work. No source-disk file was changed by this probe.

#### AUD-003 — update clears newer typing

In an isolated profile, hold a same-origin IndexedDB read/write transaction for approximately 900ms using bounded requests. Click Update tree, then type another marker while the editor remains enabled. Release the temporary transaction and wait. The click-time version is saved, newer text disappears, and the draft key is removed. Controls permit edits while the awaited operation captures old state; unconditional `changeDraft(undefined)` then discards the newer state. A separate observed harness run also showed an old draft-write completion reporting Saved before the latest draft had become durable; version all draft acknowledgements as part of the fix. The confirmed primary probe is the pending-apply loss, not a general assertion that every unload loses data.

#### AUD-004 — discarded data retained in hidden metadata

Create an unfinished synthetic private marker, wait for durable draft storage, reload, and discard the recovered draft. Edit/apply a different file. Inspect IndexedDB in the isolated profile: the independent draft key is gone and current root content does not contain the marker, but `active.draft.text` does. The restore result merges a draft into the App session; subsequent object spreads persist that transient property. Clearing only the independent key is insufficient. A complete Forget saved session clears the object store; this finding is not a claim that Forget failed.

#### AUD-005 — write comparison is not atomic

Use an in-memory directory handle with initial `index.md`, grant its synthetic permission, and change the fake file inside `createWritable()` after `readAt` returns. The current helper overwrites that intervening change and reports success. This verifies the algorithmic race; it was not an attack against a real OS directory. Existing preflight checks correctly stop changes that happened earlier. Supported browser locks do not prove exclusion of arbitrary OS editors. Require a realistic recovery strategy and qualified conflict claims, or launch without direct overwrites.

#### AUD-006 — copying an empty folder

Use a two-file Pack inserted as root then child, an empty fake directory and `originals = {}`. The observed write order is `index.md`, then `child.md`. The comparator only recognizes explicitly tracked `null` baselines; complete-copy entries have undefined baselines. This contradicts the child-before-parent comment/description. Newly created parents and grandchildren also need a dependency-aware plan. The helper does track partial failures; the defect is not a claim of atomic multi-file guarantees that the API cannot provide.

#### AUD-007 — bypassed resource budgets

A synthetic draft of **1,048,597 UTF-8 bytes** was saved and previewed despite the 1 MiB supported file limit. Update tree eventually validates via buildPack, but preview, draft storage and add-child pre-parsing occur earlier. A bounded fake drop containing 1,100 non-Markdown files was fully enumerated because only Markdown entries count toward the scanner budget. Disk comparison reads also call `.text()` before applying an independent disk-file size guard. No maximum-memory, browser-kill, adversarial parser-complexity or production DoS test was performed. The confirmed finding is the missing control, not a measured denial of service.

#### AUD-008 — malformed local state disables recovery

In an isolated profile containing a synthetic valid Pack, remove `pack.warnings` from the stored active record and reload. The record passes loadSession’s Map/entry/mode checks. Rendering throws `Cannot read properties of undefined (reading 'length')`, `.app` disappears, and Forget saved session is unavailable. This manually malformed record models a compatibility/corruption/recovery scenario; no spontaneous browser corruption or remotely reachable injection was demonstrated. The workspace-only boundary cannot catch a failure in App’s header or the editor outside it.

#### AUD-009/010/011 — privacy and hosting checks

Review the actual landing import copy and Help text against stored fields listed below; search the repository’s policy/configuration inventory. For the origin boundary, a synthetic page at another path on the same localhost origin read the active document through IndexedDB. This proves browser path isolation is absent, not that the production site has an attacker-controlled sibling. Remembered directory handles may additionally expose already-granted capabilities to same-origin code; unauthorized cross-path disk writes were not tested. Only a deployment review can establish whether the real origin is suitably isolated and its headers/TLS are secure.

#### AUD-012/013/014 — licensing and dependencies

Build to a temporary directory. Inspect the distribution: only the two OFL notice files are present; full MIT permission text is absent from emitted JavaScript. Compare runtime dependencies’ actual license requirements, starting with installed React’s LICENSE, against shipped materials. Inspect the source root for an application/skill license: none exists. Review the lockfile and inventory for exact versions and integrity metadata. A live advisory lookup requires separate authorization; do not interpret the lack of an offline finding as a clean scan.

#### AUD-015/016/017 — release evidence and usability

Run the existing header browser test unchanged against the local build with artifacts redirected to temporary storage. It fails at line 39: `149 <= 76 + 40` is false. The separate observation that content still clears the canvas controls means remediation should first reconcile the test with the approved save-bar layout.

Inspect the landing animation with normal motion preferences: CSS repeats every 9 seconds, while the component’s pause state only follows visibility/intersection. There is no in-page pause/stop/hide control; the test explicitly requires zero buttons. A likely WCAG 2.2.2 issue should be resolved or evaluated by a qualified accessibility reviewer; a full WCAG claim has not been tested. Broader keyboard focus, zoom, screen-reader and real-browser checks remain open. Finally, request evidence of release/incident ownership and host/repository access controls; their absence from the repository does not prove no external process exists.

## 3. Privacy and compliance matrix

### Actual data inventory and lifecycle

| Data | Collection / processing | Storage and retention | Recipients / deletion |
| --- | --- | --- | --- |
| Markdown text, questions, headings, authored links | User selects/drops files or writes in editor; worker parses; sanitized HAST renders | In-memory raw + parsed content and active Pack in IndexedDB; no TTL found | No application upload observed. Latest session replacement or Forget clears the store; browser site-data deletion also clears it. Disk files/ZIPs are separate copies. |
| Previous file contents | Captured as edit baselines for conflict checks | `originals` persists until successful folder-save tracking removes entries or whole session is cleared | No app network recipient found. Correcting current text does not by itself remove these old baselines. This necessary conflict-check retention must be disclosed. |
| Unfinished drafts | Editor input, independently saved | IndexedDB draft key, plus the unintended duplicate in AUD-004 | Keep/Discard/Apply should manage lifetime; hidden retention currently breaks that model. |
| Folder name, Markdown relative paths, ignored-file count | Picker/drop metadata; unsupported file contents are not parsed | Folder/path data in Pack; counts persist. Drop scanning temporarily obtains metadata for unsupported entries | No application upload observed; a folder name/path can itself contain personal information. |
| Exploration state | Focus, expanded occurrences, headings/scroll positions, zoom/pan, detached file view | IndexedDB view key; overwritten over time, no TTL | Local same-origin code/profile users can access it. No account separation. |
| Writable directory handle | Explicit native picker requesting read/write permission | Saved with session; permissions rechecked on save | A capability reference, not a password. Forget removes the app’s stored reference; browser permission grants and handles copied elsewhere may require browser-side revocation. No independent disconnect control found. |
| Exported ZIP and written Markdown | Explicit user Save/export actions | User-controlled downloads or selected filesystem directory | Local OS/apps and any destination the user subsequently shares. Forget cannot delete those copies. |
| Clipboard text | User clicks static install/prompt copy controls | OS clipboard/history, outside app retention control | Only the fixed command/prompt is copied by these components; app does not read the clipboard. |
| Hosting request metadata | Browser must request app assets from the eventual host | Host logs, IP/referrer/user-agent retention are UNKNOWN | Hosting/CDN operator and contract/roles UNKNOWN. This is separate from document processing. |
| External links / agent workflow | User explicitly clicks a link or independently installs/runs a skill with an agent | Third-party behavior outside this repository | GitHub, destination sites, npm/skills CLI, and the user’s agent/provider can have their own processing. No embedded agent/provider upload exists in this app. |

The Markdown may contain personal or highly sensitive information, but the product has no fixed personal-data form. Do not invent collected categories such as payment cards, biometrics or location. File contents and names can contain those categories at the user’s discretion; actual customer use is unknown.

**Encryption:** there is no application-level encryption/key management for stored documents or drafts. IndexedDB objects are readable by authorized same-origin JavaScript and the browser profile. OS/browser disk encryption is NOT VERIFIED. Static asset TLS is NOT VERIFIED for a production deployment. Local document processing itself has no application backend transport to encrypt. Application encryption, if considered for a threat model, must not be represented as protection from compromised code executing while keys are available.

**Claims:** README’s no-account/no-backend/no-answer-generation/no-document-telemetry statements match reviewed code and selected local observations. “Files stay in your browser” needs qualification about persistent copies, host request metadata, explicit disk/ZIP export and external agent workflows. It must not become a promise of zero personal-data processing by every hosting/provider participant. “Saved in browser” is demonstrably unreliable in AUD-001/003. No defensible claim of comprehensive external-edit protection or always-child-first writes should be made yet.

| Jurisdiction / requirement | Applicability and assumptions | Evidence | Gap / required human review |
| --- | --- | --- | --- |
| EEA GDPR / UK GDPR | Potential if territorial criteria, offering/monitoring and the actual controller/processor role apply. Local-only software does not settle those roles. No target markets or operator facts provided. | Raw local content, navigation and file handles persist; no operator-accessible document backend found. Host metadata unknown. | Privacy counsel must determine roles, lawful basis/notices, rights handling, security obligations, international transfers and whether any high-risk/special-category use requires further assessment. Do not assume a DPIA or DPA is automatically required for every deployment. |
| ePrivacy / UK PECR and local storage rules | Potential for terminal-equipment storage/access. Functional user-requested session restore may qualify for a necessity exemption; not determined here. | IndexedDB work-session storage; no advertising/cookie tracking found. | Determine applicable rules and necessity. Explain storage and give meaningful choices; do not add a blanket cookie banner without a legal/product basis. |
| India DPDP Act / Rules and related transition | Potential depending on India nexus, processing roles and provisions actually in force for the operator. Current commencement/transition dates were not externally verified. | Arbitrary digital personal data may be in files; no India-market/child targeting facts or operator notice/contact. | Qualified Indian counsel should verify official notifications, effective dates, role/territorial scope, notices/consent or other permitted grounds, user/grievance rights, children’s rules and host/provider arrangements. No legal violation is asserted solely from this repository. |
| US state privacy laws, including CCPA/CPRA | Conditional on business/model/threshold/territorial facts not supplied. No sale/sharing/ads SDK observed. | Local files and unknown hosting metadata. No payments/accounts or revenue data. | Determine whether thresholds and roles apply, then notices/rights/vendor duties. Do not assume all US laws apply or that local processing creates an exemption. |
| Children’s privacy, including COPPA / local age rules | Age groups and intentional child-directed use are UNKNOWN; general learning capability is not proof of child targeting. | No age screen, guardian flow, advertising or child-specific collection found. | Decide audience; obtain specialist advice if targeting/knowingly serving children. Do not automatically collect dates of birth as a purported fix. |
| Accessibility laws / WCAG 2.2 | Legal applicability depends on markets, service/business type and customer contracts. WCAG can independently be a product standard. | Reduced-motion support, Radix dialogs and keyboard controls exist; AUD-016 motion issue and unverified AT/cross-browser behavior remain. | Accessibility specialist review and a defined conformance target. No full WCAG or legal compliance certificate is warranted. |
| Copyright / OSS / font licenses | Distribution of bundled dependencies and fonts is applicable regardless of user-data roles. Own-code rights depend on authorship/ownership. | Installed licenses and built artifacts inspected; font notices correct; AUD-012/013 open. | Include required shipped notices; choose own-code/skill license; confirm provenance. Counsel should review any unusual distribution or contribution questions. |
| Consumer/contract, Terms, support, UGC responsibilities | Public-service representations and responsibilities need owner decisions. Specific mandatory terms depend on the actual offering/jurisdiction. | No Terms/operator contact or ownership declaration found; user retains local content in practice. | Define content rights/responsibilities, local-storage/file-write limits, support/contact and truthful claims. Missing Terms alone is not proof of a statutory violation. |
| Payments, refunds, subscriptions, tax and marketing email | NOT APPLICABLE to the observed product; no charging or email system found. | No corresponding code/integrations. | Reassess if these features are introduced. Do not introduce financial compliance work for nonexistent flows. |

DPA/subprocessor obligations cannot be determined without identifying the host and operator’s legal role. There is no evidence that the application itself sends customer documents to an AI provider. A user’s separate agent/provider relationship should not be confused with an application subprocessor relationship.

## 4. Dependency and license report

The complete declared inventory contains **225 locked entries**; **183 are installed** on this Linux environment: 141 production and 42 development entries. The other 42 are optional platform variants. Their absence is not an installation failure. Versions of all installed entries matched the lockfile. A clean-room install was not performed.

| Declared license | Locked entries | Assessment |
| --- | ---: | --- |
| MIT | 183 | Include relevant copyright/license notices for bundled/distributed code. |
| Apache-2.0 | 23 | Includes development/native TypeScript/tooling variants; determine obligations for anything actually redistributed. |
| MPL-2.0 | 12 | Lightning CSS and native variants, development/build tooling. This is file-level copyleft, not evidence that the application must become GPL/AGPL or that CSS output automatically inherits MPL. Review if redistributing those tools/binaries or modifying covered source. |
| ISC | 3 | Notice requirements for applicable distributed code. |
| OFL-1.1 | 2 | Fonts; provided notices exactly match installed originals. No font modification was identified. |
| BSD-3-Clause | 1 | Development source-map-js; notice requirements if distributed. |
| 0BSD | 1 | Runtime tslib; record alongside the shipped graph. |

No GPL, AGPL, proprietary-only or unknown license designation was found in this lock/installed-metadata inventory. This is not proof that every file has correct provenance or that package metadata alone satisfies all licensing duties. The application and skill have **no declared root license**. No third-party image/dataset download pipeline was found; icons are repository SVG/code and fonts are local. Provenance/ownership of generated code, sample prose, branding and future contributions still needs owner attestation.

Examples of locked direct/runtime versions: React/react-dom 19.3.1; rehype-sanitize 6.0.0; remark-parse 11.0.0; remark-rehype 11.1.2; remark-gfm 4.0.1; unified 11.0.5; fflate 0.8.3; Motion 14.4.0; react-zoom-pan-pinch 4.2.0; Radix Dialog 1.3.1. Toolchain: Vite 8.3.4, Vitest 5.0.5, TypeScript 7.0.2. Read the CSV rather than assuming a declared caret range equals a future installed version.

**Vulnerabilities identified by current advisory scan: NOT DETERMINED.** No authorized online scan or offline advisory database was available. No deprecated flag was present in the lockfile, which does not establish upstream support or absence of known CVEs. Unsupported/EOL status remains unverified. All resolutions point to registry.npmjs.org and all have integrity metadata; downloaded package provenance and contents were not revalidated against the registry. Optional `fsevents` 2.3.3 is marked as having an install script, but is not installed on this Linux environment. This is a lifecycle review item, not evidence of malicious behavior.

Required changes/reviews: generate notices for the actual shipped graph, choose own-code/skill license, authorize current vulnerability scanning, review actual runtime/build reachability and support status, use a reviewed lockfile in a reproducible release, and establish dependency/CI update ownership. The copyable `npx skills add ...` command independently runs an unpinned third-party CLI; document that boundary and consider a tested/pinned CLI version. It is not a runtime application dependency and was not executed in this audit.

## 5. Launch checklist

### Required before public launch of the audited full-feature product

- [ ] Close AUD-001/002/003 with regression proofs for stale tabs, URL demos and pending editor operations.
- [ ] Close AUD-004 and review application record serialization for unnecessary retained copies.
- [ ] Close AUD-012 for the actual release artifact; preserve verified font notices.
- [ ] Decide/document the actual operator, production origin and hosting model; resolve AUD-010/011 with production evidence.
- [ ] Authorize current dependency advisory/support review and a reproducible release gate: AUD-014.
- [ ] Provide accurate privacy/storage/file-write disclosures and a contact route, with legal applicability assessed from real facts: AUD-009.
- [ ] For direct overwrites, mitigate/accept AUD-005 explicitly and correct AUD-006 claims/recovery, or defer that feature through a separately authorized change.
- [ ] Resolve or explicitly document the existing failing browser check and publish current release-test evidence: AUD-015.
- [ ] Name release/incident/support owners and verify an actual rollback/compatibility procedure: AUD-017.

### Strongly recommended before important customer files

- [ ] Early editor/draft/disk-read limits, scan budgets, resource/cancellation tests: AUD-007.
- [ ] Versioned restore records, top-level/editor recovery and safe export/reset: AUD-008.
- [ ] Accessible control over automatic motion and broader keyboard/AT testing: AUD-016.
- [ ] Verify real native file operations on supported Windows/macOS/Linux browsers and the promised unsupported-browser fallback. The local directory-handle tests are not substitutes for OS dialog and permission testing.
- [ ] Provide a shared-device/private-session choice and clear instructions for local copies, directory permissions and browser-data deletion.

### Safe to defer only with stated scope

- Cloud sync, accounts, authentication, payment systems, analytics, and multi-region backend recovery are unnecessary for this static local-first release. Their absent controls are not security bugs in nonexistent services.
- Real-time multi-tab collaboration can be deferred; **conflict detection and preventing silent loss cannot**.
- Direct disk overwrites can be deferred only if disabled by an authorized change and UI/docs accurately offer browser drafts plus ZIP. Their current risks cannot be accepted by silently assuming ZIP will be used.
- Detailed optional telemetry is not a prerequisite. Host uptime/asset-health checks can avoid collecting file names, contents, drafts or exploration history.
- OSS reuse permission can be deferred only if the owner intentionally makes no OSS license grant or reuse claim. Third-party distribution notices cannot be deferred on that basis.

### Requires external/human verification

Operator/market/age/business facts; jurisdiction-specific current legal commencement and role analysis; hosting/CDN contracts and request-log retention; real DNS/TLS/headers/domain ownership; repository/host access/MFA/branch and deployment permissions; authorized current dependency advisories and support status; license/asset ownership questions; real OS file dialogs/concurrency; WCAG 2.2 and assistive-technology review. No external penetration test or compliance certificate is implied by this report.

## 6. Remediation roadmap

The [task backlog](pre-launch-remediation-tasks.md) defines scopes, dependencies and acceptance tests for one-at-a-time authorization.

1. **Stop silent loss:** T01 transactional revisions/conflicts, T02 non-destructive demo navigation, T03 versioned pending editor state. These offer the greatest immediate risk reduction.
2. **Remove unintended retention and recover safely:** T04 whitelisted saved state, T08 versioned restore/recovery. T07 bounds reduce new crash/resource cases.
3. **Set the publication boundary:** T10 dedicated origin decision, T11 deployed security policies, T12 distribution notices, T14 current advisory/release gate. T09 privacy facts and disclosures can be prepared while technical fixes are reviewed.
4. **Make filesystem saves defensible:** T05 concurrency/recovery guarantees and T06 dependency-aware partial-write plans. Direct writing should not be part of the initial release until this risk is addressed or explicitly scoped out.
5. **Close assurance and operating gaps:** T15 acceptance regression, T16 motion/accessibility/browser verification, T17 release/incident/support ownership; T13 own-code/skill license and asset attestation before OSS reuse invitations.
6. Rebuild a reviewed, committed release candidate; rerun the selected abuse, integrity, browser and license checks; obtain owner/legal/operations acceptance for remaining conditional risks. Do not overwrite this audit’s historical observations with claims of remediation that have not been verified.

## 7. Final verdict

**Is the application technically ready for production?** No, not the current full-feature version for important/sensitive files. It builds and passes unit tests, but demonstrated data-loss cases and a failing browser acceptance check remain.

**Are there unresolved security vulnerabilities?** There are confirmed integrity/privacy weaknesses and a direct-file-write race. No successful XSS vector was found in the selected probes, and no P0 issue was established. Dependency CVEs, production configuration and broader attack coverage are not verified.

**Could user information be leaked or destroyed?** Unexported work can be lost through the reproduced cases. Discarded text can remain hidden in storage. Other same-origin code can read saved content; whether production has such untrusted neighbors is unknown. No application document upload/exfiltration was observed. Concurrent disk writes have a residual overwrite window.

**Are privacy claims supported?** The core local-processing/no-document-telemetry model is supported by inspected code and selected observations. Automatic retention, duplicate draft data, capability persistence, external workflows, hosting metadata and false save acknowledgements need corrected disclosures or behavior. This is not a claim of GDPR/DPDP compliance.

**Are there IP/license or compliance concerns?** Yes: missing JavaScript distribution notices, no own-code/skill license grant, missing operator/privacy/contact decisions and unresolved jurisdictional applicability. These are not a finding that GPL/AGPL is present or that every privacy law applies.

**What cannot be assessed from the repository alone?** Actual deployment security and isolation, host/provider processing/contracts, real user markets and ages, legal roles/current statutory commencement, administrator access controls, runtime OS permission/concurrency behavior, current external advisories, and complete accessibility conformance.

**What exactly must be done before launch?** Close the three confirmed P1 data-loss defects, eliminate the hidden discarded-draft copy, ship correct dependency notices, resolve deployment/origin/advisory verification gates, publish accurate privacy/contact/file-write disclosures, reconcile the browser acceptance failure, and establish accountable release/response procedures. Mitigate or defer direct overwrites explicitly. Do not describe untested areas as passed. No fixes were implemented as part of this audit.
