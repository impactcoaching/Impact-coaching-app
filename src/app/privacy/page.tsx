import Link from "next/link";
import { Brand } from "@/components/Brand";

export const metadata = { title: "Privacy policy · Impact Coaching" };

// Approved by Adam on 27 Nov 2026 (NZ), from the Claude Doc "Impact Coaching Privacy Policy".
const CONTACT_EMAIL = "adamnugent.business@gmail.com"; // swap for hello@impactcoachingapp.com once Workspace is set up
const UPDATED = "27 November 2026";

export default function PrivacyPage() {
  return (
    <main className="narrow policy">
      <Brand sub="COACHING" />
      <h1>
        Privacy
        <span>policy</span>
      </h1>
      <p className="muted small" style={{ margin: 0 }}>
        Last updated {UPDATED}
      </p>

      <section className="card">
        <h2>1. Who we are</h2>
        <p>
          Impact Coaching (&quot;we&quot;, &quot;us&quot;) is an online coaching service for nutrition, training and habits, run by Adam Nugent, a sole trader based in New Zealand. We are
          responsible for (the &quot;controller&quot; of) the personal information you give us through the Impact Coaching app and our coaching service.
        </p>
        <p>
          <b>Contact:</b> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, or message Adam in the app.
        </p>
      </section>

      <section className="card">
        <h2>2. What we collect</h2>
        <h3>Information you give us</h3>
        <ul>
          <li>
            <b>Account details:</b> name, email, phone number, country, time zone and date of birth.
          </li>
          <li>
            <b>Coaching details:</b> goals, training history, availability, the gyms you train at and their equipment, food preferences, and competition federation and class.
          </li>
          <li>
            <b>Health information:</b> weight and body measurements, progress and posing photos, injuries and medical conditions, check-in answers (such as sleep, stress, energy
            and digestion), food logs, workout logs, step and cardio data, and menstrual cycle details if you choose to track them.
          </li>
          <li>
            <b>Videos and messages:</b> exercise videos you upload, and messages and check-in replies between you and your coach.
          </li>
          <li>
            <b>Photos for the stage look try-on,</b> if you choose to use it.
          </li>
          <li>
            <b>Data from other apps,</b> such as Apple Health, Garmin or Strava, but only if you connect them.
          </li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li>Basic technical data needed to run the app securely, such as device type, log-in times and error reports.</li>
          <li>We do not use advertising trackers.</li>
        </ul>
      </section>

      <section className="card">
        <h2>3. Why we use it</h2>
        <div className="ptbl">
          <table>
            <thead>
              <tr>
                <th>What we do</th>
                <th>Our lawful reason (UK GDPR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Set up your account and deliver your coaching: plans, check-ins, feedback</td>
                <td>Contract: we need it to provide the service you signed up for</td>
              </tr>
              <tr>
                <td>Use your health information, including photos, body data and cycle details</td>
                <td>Your explicit consent, which you give at sign-up and can withdraw at any time</td>
              </tr>
              <tr>
                <td>Send service messages such as check-in reminders</td>
                <td>Contract</td>
              </tr>
              <tr>
                <td>Keep the app secure and fix problems</td>
                <td>Legitimate interests</td>
              </tr>
              <tr>
                <td>Keep records for tax and accounting</td>
                <td>Legal obligation</td>
              </tr>
              <tr>
                <td>Use your photos or results in our marketing</td>
                <td>Only with separate consent for each item. Never by default.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>We only use your information to coach you and run the service. We do not sell it, and we do not use it for advertising.</p>
      </section>

      <section className="card">
        <h2>4. Who we share it with</h2>
        <p>Only your coach can see your information. We do not sell or rent your information to anyone.</p>
        <p>We use a small number of trusted suppliers to run the app. They store or process data on our instructions and are not allowed to use it for anything else:</p>
        <ul>
          <li>
            <b>Database, photo and video storage, and sign-in emails:</b> Supabase, with your data stored in London, UK.
          </li>
          <li>
            <b>App hosting:</b> Vercel, running the app from London, UK.
          </li>
          <li>
            <b>AI drafting and menu suggestions:</b> Anthropic (Claude), in the USA. Used to draft plans for your coach to check before you see them, and to read menu photos you
            choose to send. It doesn&apos;t receive your name or contact details, and Anthropic does not use this data to train its AI models.
          </li>
        </ul>
        <p>Some services the app uses never receive your personal information:</p>
        <ul>
          <li>
            <b>Exercise demo videos</b> come from WorkoutX.
          </li>
          <li>
            <b>Food search</b> uses public food databases such as Open Food Facts.
          </li>
        </ul>
        <p>The app only fetches content from these services; it sends them nothing about you.</p>
        <p>
          <b>Payments</b> are made by bank transfer, outside the app. The app never sees your bank details.
        </p>
        <p>
          <b>Stage look try-on:</b> if this ever uses an outside AI service, we will ask for your permission before any photo is sent, and name the service when we ask. Stage wear
          brands never see your photos.
        </p>
        <p>We may also share information if the law requires it, or to protect someone&apos;s safety.</p>
      </section>

      <section className="card">
        <h2>5. Where your information is stored</h2>
        <p>We store your information on servers in the UK. Your coach works from New Zealand and views it there.</p>
        <ul>
          <li>
            <b>UK clients:</b> the UK recognises New Zealand as giving adequate protection to personal data, so your information can be viewed there lawfully.
          </li>
          <li>
            <b>Other clients</b> (for example NZ, Australia or the USA): we protect your information to the same standard, wherever you live.
          </li>
        </ul>
        <p>
          When the app uses AI drafting or menu suggestions, the information needed for that request is processed by Anthropic in the USA, with proper safeguards such as standard
          contract terms. If we ever use another supplier that stores data in another country, we will make sure it has the same safeguards.
        </p>
      </section>

      <section className="card">
        <h2>6. How long we keep it</h2>
        <ul>
          <li>
            <b>While you are a client:</b> we keep everything so we can coach you and track your progress.
          </li>
          <li>
            <b>When you leave:</b> we keep your coaching data for 12 months in case you come back, then delete it. You can ask us to delete it sooner.
          </li>
          <li>
            <b>Progress and posing photos:</b> deleted with the rest of your coaching data, or straight away if you ask.
          </li>
          <li>
            <b>Payment and tax records:</b> kept for as long as tax law requires, usually up to 7 years. These contain no health information.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>7. Keeping it safe</h2>
        <ul>
          <li>Everything is encrypted when it is sent and when it is stored.</li>
          <li>Your photos and videos are private: they cannot be opened by a public link.</li>
          <li>Only you and your coach can sign in to see your information.</li>
          <li>Your coach&apos;s account uses two-step sign-in.</li>
          <li>
            If a data breach could put you at risk, we will tell you promptly. Where required, we will also tell the UK ICO within 72 hours, or the NZ Privacy Commissioner.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>8. Your rights</h2>
        <p>You can ask us to:</p>
        <ul>
          <li>see a copy of your information</li>
          <li>correct anything that&apos;s wrong</li>
          <li>delete your information</li>
          <li>send your information to you or another service in a common file format</li>
          <li>stop or limit how we use it</li>
        </ul>
        <p>
          You can also withdraw your consent for health data or marketing at any time, by messaging Adam in the app or emailing us. If you withdraw consent for health data, we may not
          be able to keep coaching you.
        </p>
        <p>We will reply within one month (UK) or 20 working days (NZ).</p>
        <p>
          If you are unhappy, please tell us first. You can also complain to the UK Information Commissioner&apos;s Office (
          <a href="https://ico.org.uk" target="_blank" rel="noopener">
            ico.org.uk
          </a>
          ), or to the NZ Office of the Privacy Commissioner (
          <a href="https://privacy.org.nz" target="_blank" rel="noopener">
            privacy.org.nz
          </a>
          ) if you live in NZ.
        </p>
      </section>

      <section className="card">
        <h2>9. Other things to know</h2>
        <ul>
          <li>
            <b>Age:</b> Impact Coaching is for adults aged 18 and over.
          </li>
          <li>
            <b>Cookies:</b> the app only uses the cookies it needs to keep you signed in. We do not use advertising or tracking cookies.
          </li>
          <li>
            <b>Changes:</b> if we change this policy in a way that affects you, we will tell you in the app before the change takes effect.
          </li>
        </ul>
      </section>

      <p className="small muted" style={{ textAlign: "center" }}>
        <Link href="/app">Back to the app</Link>
      </p>
    </main>
  );
}
