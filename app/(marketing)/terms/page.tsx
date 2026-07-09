import { LegalArticle } from "@/components/legal/legal-article";

export const metadata = {
  title: "Terms of Use · Spiral Nexus",
  description: "The terms governing use of the Spiral Nexus platform.",
};

export default function TermsPage() {
  return (
    <LegalArticle title="Terms of Use" lastUpdated="21 June 2026">
      <p>
        These Terms of Use govern your access to and use of the Spiral Nexus
        platform operated by <strong>[Spiral Nexus Ltd]</strong>. By using the
        service you agree to these terms. If you do not agree, do not use the
        service.
      </p>

      <h2>Eligibility &amp; accounts</h2>
      <p>
        Spiral Nexus is currently invite-only and intended for business users.
        You must provide accurate account information, keep your sign-in secure,
        and are responsible for activity under your account. You must be able to
        form a binding contract and use the service for lawful business purposes.
      </p>

      <h2>The service is an introduction platform</h2>
      <p>
        Spiral Nexus helps members discover intellectual-property assets and
        contact each other. <strong>We facilitate introductions only.</strong> We
        are not a party to, and take no responsibility for, any negotiation,
        licence, sale, or other agreement between members. Any deal is solely
        between the parties involved.
      </p>

      <h2>Listings &amp; ownership</h2>
      <p>
        You may only list intellectual property you own or are authorised to
        offer. <strong>We do not verify ownership, validity, or the right to
        license or sell any listed asset.</strong> You are responsible for the
        accuracy and legality of your listings, and you must not infringe or
        misrepresent rights you do not hold.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No unlawful, infringing, misleading, or harmful content.</li>
        <li>No harassment, spam, or misuse of messaging.</li>
        <li>
          No scraping, reverse engineering, or attempts to breach security or
          access data that is not yours.
        </li>
        <li>No impersonation or misrepresentation of identity or authority.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain your rights in the content you submit. You grant us a limited
        licence to host and display it as needed to operate the service. You are
        responsible for the content you publish and share.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; without warranties of any kind, to the fullest extent
        permitted by law. We do not warrant that listings are accurate or that
        the service will be uninterrupted or error-free.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for indirect,
        incidental, or consequential losses, or for any agreement or dispute
        between members. Nothing in these terms excludes liability that cannot be
        excluded by law.
      </p>

      <h2>Suspension &amp; termination</h2>
      <p>
        We may suspend or terminate access for breach of these terms or to
        protect the service and its members. You may stop using the service and
        delete your account at any time from your account settings.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of England and Wales, and the courts
        of England and Wales have exclusive jurisdiction, unless mandatory local
        law provides otherwise.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href="mailto:team@spiralnexus.io">team@spiralnexus.io</a>.
      </p>
    </LegalArticle>
  );
}
