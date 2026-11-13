import { Link } from "react-router-dom";

const LAST_UPDATED = "13 November 2026";
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "";

const sectionTitle = {
  fontSize: "1.1rem",
  fontWeight: 800,
  margin: "22px 0 8px",
  color: "#261f18",
};
const paragraph = { margin: "0 0 10px", lineHeight: 1.6, color: "#524436" };
const list = { margin: "0 0 10px", paddingLeft: "20px", lineHeight: 1.6, color: "#524436" };

export function PrivacyPage() {
  return (
    <div className="auth-page-container">
      <div
        className="auth-card deckle-card"
        style={{ maxWidth: "760px", textAlign: "left" }}
      >
        <div className="auth-header">
          <h1 className="auth-title">Privacy Policy</h1>
          <p className="auth-subtitle">Date Logger · Last updated {LAST_UPDATED}</p>
        </div>

        <p style={paragraph}>
          Date Logger is a private journal for recording dates: where you went, what it
          was like, and the photos and song that go with it. This page explains what the
          app and website store, why, and how you can remove it.
        </p>

        <h2 style={sectionTitle}>What we store</h2>
        <ul style={list}>
          <li>
            <strong>Account details:</strong> your email address and a password. The
            password is stored only as a one-way hash; we cannot read it.
          </li>
          <li>
            <strong>Your date logs:</strong> the venue, date, notes, rating, mood and
            category you enter.
          </li>
          <li>
            <strong>Photos and audio</strong> you attach to a date log.
          </li>
          <li>
            <strong>Soundtrack details:</strong> the title, artist, cover image link and
            preview link of a song you attach.
          </li>
          <li>
            <strong>Bucket list ideas</strong> you add.
          </li>
          <li>
            <strong>Partner link:</strong> if you link accounts with a partner, we store
            which account you are linked to.
          </li>
        </ul>
        <p style={paragraph}>
          We do not collect your location, contacts, advertising identifiers or analytics
          about how you use the app. There are no ads.
        </p>

        <h2 style={sectionTitle}>What stays on your device</h2>
        <p style={paragraph}>
          The mobile app keeps a copy of your date logs for offline viewing, an unsent
          draft of a date log, your light/dark theme choice and your reminder settings.
          Signing out clears the offline copy of your date logs.
        </p>

        <h2 style={sectionTitle}>Device permissions</h2>
        <ul style={list}>
          <li>
            <strong>Camera and photo library:</strong> only when you choose to take or
            pick a photo for a date log.
          </li>
          <li>
            <strong>Notifications:</strong> only if you turn on reminders. Reminders are
            scheduled on your device; nothing is sent to a notification service.
          </li>
        </ul>

        <h2 style={sectionTitle}>Who can see your data</h2>
        <ul style={list}>
          <li>Only you, by default.</li>
          <li>
            <strong>Your linked partner</strong>, if you choose to link accounts. They can
            see and edit your date logs and bucket list, and you can see theirs. Either of
            you can unlink at any time, which immediately ends the sharing.
          </li>
        </ul>
        <p style={paragraph}>We do not sell your data or share it for advertising.</p>

        <h2 style={sectionTitle}>Services we rely on</h2>
        <ul style={list}>
          <li>
            <strong>ImageKit</strong> stores the photos and audio files you upload.
            Anyone who has the direct link to a file can open it, so share links with
            care.
          </li>
          <li>
            <strong>MongoDB</strong> hosts the database holding your account and date
            logs.
          </li>
          <li>
            <strong>Deezer and Apple iTunes Search:</strong> when you search for a song,
            your search text is sent from your device to these services, and song
            previews and cover art are loaded from them. Their own privacy policies apply
            to those requests.
          </li>
        </ul>

        <h2 style={sectionTitle}>Security</h2>
        <p style={paragraph}>
          Data is sent over encrypted connections (HTTPS). Access to your date logs
          requires signing in. No system is perfectly secure, so please use a password
          you do not use elsewhere.
        </p>

        <h2 style={sectionTitle}>Deleting your data</h2>
        <ul style={list}>
          <li>You can delete any single date log or bucket list idea in the app.</li>
          <li>
            You can delete your whole account in the app under Settings, or on the web at{" "}
            <Link to="/delete-account" className="auth-link">
              Delete my account
            </Link>
            .
          </li>
        </ul>
        <p style={paragraph}>
          Deleting your account permanently removes your account, your date logs, their
          photos and audio, and your bucket list ideas. It cannot be undone. Date logs
          created by your partner belong to their account and stay with them.
        </p>

        <h2 style={sectionTitle}>Children</h2>
        <p style={paragraph}>
          Date Logger is not intended for children under 13, and we do not knowingly
          collect their data.
        </p>

        <h2 style={sectionTitle}>Changes</h2>
        <p style={paragraph}>
          If this policy changes, the updated version will be posted on this page with a
          new date.
        </p>

        <h2 style={sectionTitle}>Contact</h2>
        <p style={paragraph}>
          {CONTACT_EMAIL ? (
            <>
              Questions or requests about your data:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="auth-link">
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            <>
              For questions or requests about your data, use the developer contact
              details on the Date Logger app store listing.
            </>
          )}
        </p>

        <div className="auth-footer">
          <p>
            <Link to="/" className="auth-link">
              Back to Date Logger
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
