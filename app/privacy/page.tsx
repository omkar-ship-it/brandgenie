import { Clause, Important, LegalPage } from "@/components/legal";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Privacy Policy · LoyalGenie" };

const mail = (
  <a className="lnk" href={`mailto:${COMPANY.email}`}>
    {COMPANY.email}
  </a>
);

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`How ${COMPANY.legalName} collects, uses and protects personal data on ${COMPANY.product}. We collect as little as the product can work with, and we do not sell it.`}
    >
      <Clause n={1} id="who" title="Who we are">
        <p>
          {COMPANY.legalName} operates {COMPANY.product} and is the data fiduciary for the personal data
          described here. Contact us at {mail}.
        </p>
      </Clause>

      <Clause n={2} id="what" title="What we collect">
        <p>
          <strong>When you create an account:</strong> your email address. Customers are additionally asked once,
          on first sign-in, for a name and mobile number so a Brand can identify them at a counter.
        </p>
        <p>
          <strong>When you list a Brand:</strong> business name, category, description, service area, website and
          Instagram links, logo image, the Reward you offer, and your redemption instructions.
        </p>
        <p>
          <strong>When you pay:</strong> the bid amount, a payment reference, and the payment status. We do{" "}
          <strong>not</strong> receive or store card numbers, CVVs, UPI PINs, or banking credentials — those go
          directly to our payment gateway.
        </p>
        <p>
          <strong>When you use the platform:</strong> which Brand tiles you open, the rounds you play and their
          outcomes, Rewards issued to you and whether they were redeemed, and any wishes you post.
        </p>
        <p>
          <strong>Automatically:</strong> a random visitor identifier stored in a first-party cookie so a repeat
          visit on the same day is counted once, plus ordinary server logs. We do not use third-party advertising
          trackers, and we do not build advertising profiles.
        </p>
      </Clause>

      <Clause n={3} id="cookies" title="Cookies">
        <p>We use two cookies, both first-party and both strictly functional:</p>
        <ul>
          <li>
            <span className="mono">bg_session</span> — keeps you signed in. Opaque, HTTP-only, and meaningless
            outside our servers.
          </li>
          <li>
            <span className="mono">bg_vid</span> — a random identifier so the public visitor counter counts
            people rather than page loads. It is not linked to your account and carries no personal data.
          </li>
        </ul>
        <p>Clearing your browser data removes both. No advertising or analytics cookies are set.</p>
      </Clause>

      <Clause n={4} id="why" title="Why we use it, and on what basis">
        <p>
          To create and secure your account; to run the daily round and issue Rewards; to let a Brand verify a
          Reward at redemption; to take and confirm payments; to show Brands aggregate counts of tile opens,
          Rewards won and Rewards redeemed; to prevent fraud and abuse; and to meet legal and tax obligations.
        </p>
        <p>
          We process this data to perform our contract with you, to pursue our legitimate interest in operating
          and securing the platform, to comply with law, and — where required — on the basis of the consent you
          give when you provide it. You may withdraw consent at any time by deleting your account.
        </p>
      </Clause>

      <Clause n={5} id="sharing" title="Who we share it with">
        <Important>
          <p>
            <strong>We do not sell personal data, and we do not share it for anyone else&rsquo;s marketing.</strong>
          </p>
        </Important>
        <p>We share only what each of these needs to do its job:</p>
        <ul>
          <li>
            <strong>Razorpay</strong> — payment processing. Handles payment credentials directly; we never see
            them.
          </li>
          <li>
            <strong>MSG91</strong> — sends your sign-in codes and notification emails.
          </li>
          <li>
            <strong>Vercel</strong> — hosting and content delivery.
          </li>
          <li>
            <strong>Neon</strong> — managed database hosting.
          </li>
          <li>
            <strong>A Brand you won a Reward from</strong> — the Reward code and the details it needs to honour
            the Reward at redemption.
          </li>
          <li>
            <strong>Authorities</strong> — where we are legally required to disclose, or to establish or defend a
            legal claim.
          </li>
        </ul>
        <p>What a Brand does with data you give it directly is governed by that Brand&rsquo;s own privacy policy.</p>
      </Clause>

      <Clause n={6} id="location" title="Where it is stored">
        <p>
          Our database is hosted in the Asia-Pacific (Singapore) region, and some providers listed above operate
          globally, so your data may be processed outside India. Where that happens we rely on the provider&rsquo;s
          contractual safeguards for protection equivalent to that required by Indian law.
        </p>
      </Clause>

      <Clause n={7} id="retention" title="How long we keep it">
        <p>
          Account data is kept while your account is open. Sign-in codes expire in minutes and are stored only as
          a one-way hash — never in readable form. Sessions expire automatically. Reward and transaction records
          are retained for as long as required for accounting, tax and dispute-resolution purposes, typically
          eight years. Aggregate and anonymised counts, which cannot identify you, may be kept indefinitely.
        </p>
      </Clause>

      <Clause n={8} id="rights" title="Your rights">
        <p>
          Under the Digital Personal Data Protection Act, 2023 you may ask us to give you a copy of your personal
          data, correct or complete it, erase it, or tell you who we have shared it with. You may also nominate
          someone to exercise these rights if you are unable to.
        </p>
        <p>
          Write to {mail} from your registered email address. We respond to verified requests within 30 days.
          Some data must be retained where the law requires it.
        </p>
      </Clause>

      <Clause n={9} id="deletion" title="Deleting your account">
        <p>
          Email {mail} from your registered address asking for deletion. We remove your account and personal data
          within 30 days, apart from records we must keep by law.
        </p>
        <p>
          Deletion ends any active listing and forfeits unredeemed Rewards, and does not entitle you to a refund
          of amounts already paid — see our{" "}
          <a className="lnk" href="/terms#refunds">
            Terms &amp; Conditions
          </a>
          .
        </p>
      </Clause>

      <Clause n={10} id="security" title="Security">
        <p>
          Sign-in codes are stored as salted one-way hashes. Sessions use opaque, HTTP-only cookies. All traffic
          is encrypted in transit. Payment credentials never reach our servers. No system is perfectly secure; if
          a breach affects your personal data we will notify you and the Data Protection Board of India as the
          law requires.
        </p>
      </Clause>

      <Clause n={11} id="children" title="Children">
        <p>
          The platform is not for anyone under 18. We do not knowingly collect data from children. If you believe
          a child has given us personal data, write to {mail} and we will delete it.
        </p>
      </Clause>

      <Clause n={12} id="changes" title="Changes">
        <p>
          We may update this policy by posting a revised version with a new date. Where a change materially
          affects you, we will make reasonable efforts to notify you by email.
        </p>
      </Clause>

      <Clause n={13} id="grievance" title="Grievance Officer">
        <p>
          <strong>{COMPANY.grievanceOfficer}</strong>
          <br />
          {COMPANY.legalName}
          <br />
          {COMPANY.registeredAddress}
          <br />
          Email: {mail}
          <br />
          Phone:{" "}
          <a className="lnk mono" href={`tel:${COMPANY.phoneHref}`}>
            {COMPANY.phone}
          </a>
        </p>
        <p>
          Complaints about how we handle personal data are acknowledged within 48 hours and resolved within 30
          days. If you remain dissatisfied you may complain to the Data Protection Board of India.
        </p>
      </Clause>
    </LegalPage>
  );
}
