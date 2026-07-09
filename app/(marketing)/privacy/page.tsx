import { LegalArticle } from "@/components/legal/legal-article";

export const metadata = {
  title: "Privacy Policy · Spiral Nexus",
  description: "How Spiral Nexus collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalArticle title="Privacy Policy" lastUpdated="21 June 2026">
      <p>
        This Privacy Policy explains how <strong>[Spiral Nexus Ltd]</strong>
        (&ldquo;Spiral Nexus&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects,
        uses, and protects personal data when you use the Spiral Nexus
        platform. We are the data controller. Contact us at{" "}
        <a href="mailto:team@spiralnexus.io">team@spiralnexus.io</a>,
        [registered address].
      </p>

      <h2>Who this applies to</h2>
      <p>
        Spiral Nexus is offered to invited users during a pre-launch phase. It
        is intended for business users (IP owners, buyers, licensees, and
        investors), not consumers, and is operated from the United Kingdom.
      </p>

      <h2>Data we collect</h2>
      <ul>
        <li>
          <strong>Account &amp; authentication:</strong> email address and
          sign-in metadata (we use passwordless magic links and Google sign-in;
          we do not store passwords).
        </li>
        <li>
          <strong>Profile:</strong> name, organisation, headline, bio, location,
          links, photo, and your stated roles, sectors, jurisdictions, and
          trademark-class interests.
        </li>
        <li>
          <strong>Listings:</strong> the trademark details you publish.
        </li>
        <li>
          <strong>Messages:</strong> the content of conversations you start or
          take part in.
        </li>
        <li>
          <strong>Activity:</strong> listings you save and members you follow.
        </li>
        <li>
          <strong>Technical:</strong> essential session cookies and standard
          server logs needed to operate and secure the service.
        </li>
      </ul>

      <h2>How and why we use it (legal bases)</h2>
      <p>
        Under the UK GDPR and the EU GDPR we rely on: <strong>contract</strong>
        (to provide your account and the platform), <strong>legitimate
        interests</strong> (to keep the service secure, prevent abuse, and
        improve it), and <strong>consent</strong> where required. We do not sell
        your personal data.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only essential cookies required for authentication and session
        management. We do not use advertising or third-party tracking cookies in
        this pre-launch phase.
      </p>

      <h2>Subprocessors</h2>
      <p>
        We share data with vetted providers strictly to operate the service. See
        our <a href="/terms">Terms of Use</a> and current subprocessor list
        (available on request): Supabase (database, authentication, storage),
        Vercel (hosting), Google (optional sign-in), and our transactional email
        provider.
      </p>

      <h2>International transfers</h2>
      <p>
        Where data is processed outside the UK/EEA, we rely on appropriate
        safeguards such as the UK International Data Transfer Agreement / Addendum
        and the EU Standard Contractual Clauses.
      </p>

      <h2>Retention</h2>
      <p>
        We keep personal data for as long as your account is active and as needed
        to provide the service, then delete or anonymise it within a reasonable
        period, subject to legal obligations.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the UK/EU GDPR you have rights of access, rectification, erasure,
        restriction, portability, and objection. You can export your data and
        delete your account from your account settings; you may also contact us
        to exercise any right, and you can complain to the UK ICO or your local
        EU supervisory authority.
      </p>

      <h2>United States</h2>
      <p>
        For users in the United States, applicable state privacy laws (for
        example the CCPA/CPRA in California) may give you rights to know, delete,
        correct, and opt out of &ldquo;sharing&rdquo; of personal information. We
        do not sell personal information. Contact us at the address above to
        exercise these rights.
      </p>

      <h2>Changes</h2>
      <p>
        We will update this policy as the product evolves and post the revised
        version here with a new &ldquo;last updated&rdquo; date.
      </p>
    </LegalArticle>
  );
}
