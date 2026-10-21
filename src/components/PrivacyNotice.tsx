export function PrivacyNotice() {
  return (
    <div className="privacy-details">
      <p>
        Depthwise is operated by Ethernode, a project name used by its
        maintainer; it is not represented as a registered company. Contact{" "}
        <a href="mailto:das.saikat.in@gmail.com">das.saikat.in@gmail.com</a> for
        privacy, support or private security reports.
      </p>
      <h3>Your Markdown stays local</h3>
      <p>
        The app has no accounts, analytics, advertising, embedded AI service or
        document-upload server. It reads the folder you choose and processes
        Markdown in your browser. It does not fetch embedded Markdown images.
        External links open separately when you choose them.
      </p>
      <h3>What this browser remembers</h3>
      <p>
        With Remember enabled, IndexedDB stores raw Markdown, file and folder
        names, drafts, original text needed to detect external changes,
        exploration position, and a folder-access handle when connected. The app
        does not encrypt this data. Other people using the same browser profile,
        browser extensions with access, and code on the same web origin may
        access it. There is no app-level user isolation.
      </p>
      <p>
        Data remains until you use Forget saved session, disable Remember,
        replace the workspace, or clear site data. Browser storage can also be
        evicted. Export important work. With Remember disabled, new work stays
        in memory in this tab; this is not protection from operating-system
        memory, browser extensions or crash/session recovery.
      </p>
      <h3>Export, correction and deletion</h3>
      <p>
        Edit nodes to correct content. Download ZIP exports applied Markdown;
        finish a draft first to include it. Help → Forget saved session clears
        the app’s saved records and handle reference. Save &amp; export →
        Disconnect remembered folder removes the stored handle reference. Revoke
        the browser’s file access in site settings; the app cannot revoke that
        grant through a browser API.
      </p>
      <p>
        Folder saves may leave partial changes. Before overwriting an existing
        file, the app writes a recovery copy under{" "}
        <code>.depthwise-backups/</code> in that folder. These copies may
        contain older private text and remain until you delete them yourself.
        Forget does not delete files, ZIPs, recovery downloads, backups,
        clipboard contents, or copies held by the browser or OS.
      </p>
      <h3>Hosting and other services</h3>
      <p>
        Loading the website sends normal web-request metadata, such as IP
        address and user agent, to the hosting provider. The repository cannot
        establish the provider’s actual logging, retention or processing terms;
        those must be reviewed for the deployed service. The app does not send
        Markdown in those requests.
      </p>
      <p>
        Installing the separate authoring skill runs a third-party CLI (the
        copyable command pins skills 1.7.4). Its upstream documentation
        describes anonymous usage telemetry and security-audit requests; set
        DISABLE_TELEMETRY=1 or DO_NOT_TRACK=1 in your terminal environment to
        disable those requests. This does not disable the network access needed
        to download the CLI or skill. Any prompt, resume or other personal
        information you give your chosen AI agent is handled by that
        agent/provider under its terms, not uploaded by Depthwise. Review their
        settings and privacy terms before supplying private information.
      </p>
      <p>
        The intended first hostname is depthwise.saikat.in. Browser storage
        belongs to an origin: moving to depthwise.tech will not move saved work
        automatically. Export and reimport before moving.
      </p>
      <p>
        Last updated: 22 October 2026. This notice describes application
        behavior; it does not certify legal compliance or replace a review of
        the operator’s actual markets, users and hosting arrangements.
      </p>
    </div>
  );
}
