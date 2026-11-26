import { Brand } from "@/components/Brand";

// The full policy text goes here once Adam has finished the draft
// (Claude Doc: "Impact Coaching Privacy Policy (draft)").
export default function PrivacyPage() {
  return (
    <main className="narrow">
      <Brand sub="COACHING" />
      <h1>
        Privacy
        <span>policy</span>
      </h1>
      <div className="card">
        <p className="alert">This is a draft and will be replaced with the final policy before the app goes live.</p>
        <p>
          Impact Coaching only uses your information to coach you. Your health details, photos and check-ins are seen only by you and your coach. We don&apos;t sell your
          information or use it for advertising. You can ask to see, correct or delete your information at any time.
        </p>
      </div>
    </main>
  );
}
