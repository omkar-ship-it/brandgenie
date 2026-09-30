import { Clause, Important, LegalPage } from "@/components/legal";
import { COMPANY } from "@/lib/company";
import { BOARD_SIZE, LISTING_FEE_PAISE, rupees } from "@/lib/rules";

export const metadata = { title: "Terms & Conditions · LoyalGenie" };

const mail = (
  <a className="lnk" href={`mailto:${COMPANY.email}`}>
    {COMPANY.email}
  </a>
);

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro={`These terms govern your use of ${COMPANY.product}, operated by ${COMPANY.legalName}. By using the platform, listing a brand, or playing a round, you agree to them. If you do not agree, do not use the platform.`}
    >
      <Clause n={1} id="definitions" title="Definitions">
        <p>
          <strong>Platform</strong> means the {COMPANY.product} website and services operated by{" "}
          {COMPANY.legalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;).{" "}
          <strong>Brand</strong> or <strong>Merchant</strong> means a business that pays to list on the Board.{" "}
          <strong>Customer</strong> or <strong>Player</strong> means an individual who plays a round.{" "}
          <strong>Board</strong> means the ranked list of up to {BOARD_SIZE} listed positions.{" "}
          <strong>Reward</strong> means the offer a Brand chooses to make available.{" "}
          <strong>Listing Fee</strong> means the flat, one-time amount a Brand pays us to become eligible for the
          Board. <strong>Vote</strong> or <strong>Upvote</strong> means a Customer&rsquo;s endorsement of one
          Brand, which moves that Brand&rsquo;s position on the Board.
        </p>
      </Clause>

      <Clause n={2} id="role" title="What we are, and what we are not">
        <p>
          We operate a listing and discovery platform. We are an intermediary. We do not manufacture, sell,
          supply, or deliver any product or service offered as a Reward.
        </p>
        <Important>
          <p>
            <strong>Every Reward is provided by the Brand, not by us.</strong> The Brand alone bears the cost of
            the Rewards it lists, sets the conditions attached to them, and is solely responsible for honouring
            them. A Reward is a contract between the Customer and the Brand. We are not a party to it and accept
            no liability arising from it.
          </p>
        </Important>
      </Clause>

      <Clause n={3} id="eligibility" title="Eligibility">
        <p>
          You must be at least 18 years old and legally capable of entering a contract under the Indian Contract
          Act, 1872. If you use the platform for a business, you confirm you are authorised to bind that
          business. We may refuse, suspend, or remove any account at our discretion.
        </p>
      </Clause>

      <Clause n={4} id="free-to-play" title="Playing is free">
        <p>
          Customers pay nothing. No purchase, payment, deposit, stake, or consideration of any kind is required
          or accepted from a Customer to play a round or receive a Reward. Rounds are limited to one per
          Customer per day.
        </p>
        <p>
          Nothing on the platform is a lottery, prize competition, wager, or game of chance played for stakes.
          No Customer risks anything of value and no Customer payment is taken at any point.
        </p>
      </Clause>

      <Clause n={5} id="board" title="The Board, the Listing Fee and voting">
        <p>
          A Brand becomes eligible for the Board by paying the Listing Fee: currently a flat{" "}
          <strong>{rupees(LISTING_FEE_PAISE)}</strong>, the same for every Brand, paid once. The Listing Fee does
          not buy a position — it buys eligibility. We may change the Listing Fee at any time for new listings; a
          change does not affect a Brand already listed.
        </p>
        <p>
          Position on the Board is determined solely by Customer votes, highest first; where two Brands are tied
          on votes, whichever paid the Listing Fee earlier ranks higher. A Customer may cast at most one Vote per
          Brand; a Vote, once cast, is final and cannot be withdrawn or transferred.
        </p>
        <Important>
          <p>
            <strong>Positions are not guaranteed and are not permanent.</strong> If another Brand earns more votes
            than you, you move down, and if you are displaced beyond position {BOARD_SIZE} you leave the Board
            entirely and your Reward leaves the reward pool. This can happen at any time, without notice, as
            Customers keep voting, and does not entitle you to any refund, credit, or compensation. Earning more
            votes later may return you to the Board without any further payment.
          </p>
        </Important>
        <p>
          We may display all Brands that have paid the Listing Fee on a given day, whatever their vote count. Being
          displayed is not the same as holding a position: only the top {BOARD_SIZE} Brands by vote count appear on
          the Board and are available in the reward pool.
        </p>
        <p>
          The Listing Fee buys eligibility only. It does not buy votes, better odds, or any particular position —
          the round is identical for every Brand on the Board — and it is not an advertisement booking, an
          impression guarantee, a click guarantee, or a promise of any commercial outcome. We do not manufacture,
          endorse, or guarantee the authenticity of any Vote, and we may remove Votes we reasonably believe are
          fraudulent, automated, or otherwise manipulated, which may change a Brand&rsquo;s position without
          entitling anyone to a refund.
        </p>
      </Clause>

      <Clause n={6} id="payments" title="Payments">
        <p>
          The Listing Fee is payable to the Platform and is consideration for the listing service, not for any
          particular position or outcome. Payments are processed by a third-party payment gateway; we do not
          receive or store your card, UPI, or banking credentials. A listing becomes live only once payment is
          confirmed to us by the gateway.
        </p>
        <p>
          All amounts are in Indian Rupees and are exclusive of applicable taxes unless stated otherwise. You are
          responsible for any taxes arising on your side of the transaction.
        </p>
      </Clause>

      <Clause n={7} id="refunds" title="No refunds and no cancellation">
        <Important>
          <p>
            <strong>All payments are final. No refunds are issued and there is no cancellation policy.</strong>{" "}
            This includes, without limitation: being out-voted or displaced from the Board; a Reward going
            unclaimed; fewer Customers voting or playing than you expected; ending your listing early; or
            dissatisfaction with results.
          </p>
        </Important>
        <p>
          The only exception is a payment we can verify was taken in error by us or duplicated by the gateway,
          which we will return to the original payment method. Write to {mail} within 7 days of the charge.
        </p>
      </Clause>

      <Clause n={8} id="rewards" title="Rewards and redemption">
        <p>
          Rewards are subject to the terms, conditions, and availability set by the issuing Brand, which may
          include expiry dates, minimum spend, location limits, and limits on combining with other offers.
        </p>
        <Important>
          <p>
            <strong>A Brand may decline to honour a Reward</strong>, including for reasons outside anyone&rsquo;s
            control. We do not control, guarantee, underwrite, or insure any Reward. We are not liable for a
            Reward that is refused, withdrawn, expired, out of stock, mis-described, or of unsatisfactory quality,
            and we owe no cash or substitute in its place.
          </p>
        </Important>
        <p>
          Rewards hold no cash value and cannot be exchanged for money. A Reward is personal to the Customer who
          won it, save where the platform expressly allows it to be gifted. Winning is never guaranteed: a round
          may end on a position with no Reward remaining.
        </p>
        <p>
          A dispute about a Reward is between the Customer and the Brand. We may, without obligation, pass on
          information to help the parties resolve it.
        </p>
      </Clause>

      <Clause n={9} id="brand-obligations" title="Brand obligations and warranties">
        <p>If you list a Brand, you represent and warrant that:</p>
        <ul>
          <li>you own or are licensed to use every name, logo, and mark you upload;</li>
          <li>your listing and Reward are accurate, lawful, and not misleading;</li>
          <li>you will honour every Reward you issue, on the terms you published;</li>
          <li>you hold the stock, licences, and permissions your Reward requires; and</li>
          <li>you will not list anything prohibited by law, including alcohol, tobacco, drugs, weapons, or any product requiring an authorisation you do not hold.</li>
        </ul>
        <p>
          You are responsible for the cost of every Reward you issue. We may remove any listing that breaches
          this clause, without refund.
        </p>
      </Clause>

      <Clause n={10} id="conduct" title="Acceptable use">
        <p>You must not:</p>
        <ul>
          <li>use bots, scripts, or automation to play rounds, cast Votes, inflate clicks, or otherwise manipulate the Board;</li>
          <li>open multiple accounts to take more than one round per day, or to cast more than one Vote for the same Brand;</li>
          <li>pay, offer, or solicit payment or reward of any kind in exchange for a Vote;</li>
          <li>vote for a Brand you own, operate, are employed by, or are otherwise materially connected to;</li>
          <li>interfere with, probe, or attempt to bypass any security or rate-limiting measure;</li>
          <li>resell, trade, or commercialise a Reward; or</li>
          <li>use the platform for anything unlawful, fraudulent, or abusive.</li>
        </ul>
        <p>
          We may suspend or terminate an account, void a Reward, and withhold a position without refund where we
          reasonably believe this clause has been breached.
        </p>
      </Clause>

      <Clause n={11} id="availability" title="Availability">
        <p>
          The platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We do not
          warrant uninterrupted or error-free operation. We may change, suspend, or discontinue any part of the
          platform, including the Board and the daily round, at any time. To the extent permitted by law, all
          implied warranties are excluded.
        </p>
      </Clause>

      <Clause n={12} id="liability" title="Limitation of liability">
        <Important>
          <p>
            To the maximum extent permitted by law, our total aggregate liability to you for all claims arising
            out of or relating to the platform is limited to the amount you actually paid us in the three months
            immediately preceding the event giving rise to the claim. Where you have paid us nothing, our
            aggregate liability is limited to ₹1,000.
          </p>
        </Important>
        <p>
          We are not liable for indirect, incidental, special, consequential, punitive, or exemplary losses, nor
          for loss of profit, revenue, goodwill, business opportunity, anticipated savings, or data, however
          arising, even if advised of the possibility.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot lawfully be excluded, including liability for
          fraud or for death or personal injury caused by negligence.
        </p>
      </Clause>

      <Clause n={13} id="indemnity" title="Indemnity">
        <p>
          You agree to indemnify and hold harmless {COMPANY.legalName}, its directors, officers, employees, and
          agents against any claim, demand, loss, liability, cost, or expense (including reasonable legal fees)
          arising from your use of the platform, your listing or Reward, your breach of these terms, or your
          infringement of any third party&rsquo;s rights.
        </p>
      </Clause>

      <Clause n={14} id="ip" title="Intellectual property">
        <p>
          The platform, its design, text, and software are owned by {COMPANY.legalName} and protected by law. You
          may not copy, scrape, reproduce, or create derivative works from it. By uploading a logo or listing
          content, you grant us a non-exclusive, royalty-free licence to display it on the platform and in
          materials describing the platform, for as long as you are listed.
        </p>
        <p>
          Brand names and marks shown on example or demonstration boards are fictional unless expressly stated.
          They do not indicate any partnership, endorsement, or commercial relationship.
        </p>
      </Clause>

      <Clause n={15} id="deletion" title="Account deletion">
        <p>
          Customers and Merchants may request deletion of their account at any time by writing to {mail} from the
          email address registered on the account. We will action verified requests within 30 days.
        </p>
        <p>
          Deletion ends any active listing and forfeits any unredeemed Reward, and{" "}
          <strong>does not entitle you to a refund</strong> of amounts already paid. We may retain records we are
          required to keep by law, including transaction and tax records.
        </p>
      </Clause>

      <Clause n={16} id="changes" title="Changes to these terms">
        <p>
          We may amend these terms at any time by posting an updated version with a new date. Continued use after
          that date is acceptance. Where a change is material, we will make reasonable efforts to notify
          registered users by email.
        </p>
      </Clause>

      <Clause n={17} id="force-majeure" title="Force majeure">
        <p>
          We are not liable for failure or delay caused by events beyond our reasonable control, including acts of
          God, war, civil unrest, epidemic, strike, fire, flood, failure of telecommunications or internet
          services, power failure, change in law, or failure of a third-party provider.
        </p>
      </Clause>

      <Clause n={18} id="law" title="Governing law and jurisdiction">
        <p>
          These terms are governed by the laws of India. The courts at {COMPANY.jurisdiction} have exclusive
          jurisdiction over any dispute, and you consent to that jurisdiction.
        </p>
        <p>
          If any provision is held unenforceable, it is severed and the rest remains in force. Our failure to
          enforce a provision is not a waiver of it.
        </p>
      </Clause>

      <Clause n={19} id="grievance" title="Grievance Officer">
        <p>
          In accordance with the Information Technology Act, 2000 and rules made under it, the Grievance Officer
          is:
        </p>
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
        <p>Complaints are acknowledged within 48 hours and resolved within 30 days of receipt.</p>
      </Clause>

      <Clause n={20} id="contact" title="Contact">
        <p>
          {COMPANY.legalName} — {mail} ·{" "}
          <a className="lnk mono" href={`tel:${COMPANY.phoneHref}`}>
            {COMPANY.phone}
          </a>
        </p>
      </Clause>
    </LegalPage>
  );
}
