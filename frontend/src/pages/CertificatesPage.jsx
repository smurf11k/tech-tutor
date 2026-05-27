import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  extractList,
  getApiErrorMessage,
  getCourseRouteKey,
} from "@/lib/utils";

// ─── Certificate preview thumbnail ───────────────────────────────────────────
function CertPreview({ courseName, recipientName, issuedAt }) {
  const formattedDate = issuedAt
    ? new Date(issuedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="cert-preview">
      <div className="cert-doc">
        <div className="cert-doc-top">
          <img src="/favicon.svg" alt="TechTutor" className="h-5 w-5 p-[2px]" />
          {/* ti-rosette icon via tabler-icons */}
          <i className="ti ti-rosette cert-rosette" />
        </div>
        <div className="cert-doc-title">Certificate of Completion</div>
        <div className="cert-doc-name">{recipientName || "—"}</div>
        <div className="cert-doc-course">{courseName || "—"}</div>
        <div className="cert-doc-date">Issued: {formattedDate}</div>
        <div className="cert-doc-stamp">
          <i className="ti ti-circle-check" />
        </div>
      </div>
    </div>
  );
}

// ─── Single certificate card ──────────────────────────────────────────────────
function CertCard({ certificate, showRecipient }) {
  const courseName =
    certificate.course?.title || `Course #${certificate.course_id}`;

  const recipientName = showRecipient
    ? certificate.user?.name || "—"
    : undefined; // students see their own name pulled from auth; omit for brevity in preview

  const issuedAt = certificate.issued_at;
  const formattedDate = issuedAt
    ? new Date(issuedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  // Rough learning-time placeholder — replace when the API provides it
  const learningHours = certificate.total_hours ?? null;

  function handleDownload() {
    // TODO: implement PDF download
    // e.g. window.open(`/api/certificates/${certificate.id}/download`, "_blank")
  }

  function handleShare() {
    // TODO: implement share (copy link / Web Share API)
    // e.g. navigator.share({ url: `…/certificates/${certificate.id}` })
  }

  function handleLinkedIn() {
    // TODO: implement LinkedIn credential add
    // LinkedIn Add to Profile URL requires: organizationId, name, issueYear/Month, certUrl, certId
    // See: https://www.linkedin.com/help/linkedin/answer/a567169
  }

  return (
    <div className="cert-card">
      <CertPreview
        courseName={courseName}
        recipientName={recipientName}
        issuedAt={issuedAt}
      />

      <div className="cert-body">
        <div className="cert-title">{courseName}</div>

        <div className="cert-meta">
          {issuedAt && (
            <span>
              <i className="ti ti-calendar cert-meta-icon" /> {formattedDate}
            </span>
          )}
          {learningHours && (
            <span>
              <i className="ti ti-clock cert-meta-icon" /> {learningHours}h
            </span>
          )}
          {showRecipient && certificate.user && (
            <span>
              <i className="ti ti-user cert-meta-icon" />{" "}
              {certificate.user.name}
              {certificate.user.email ? ` · ${certificate.user.email}` : ""}
            </span>
          )}
          <span className="badge badge-green cert-badge">VERIFIED</span>
        </div>

        <div className="cert-number">
          #{certificate.certificate_number || certificate.id}
        </div>

        <div className="cert-actions">
          <button className="btn btn-primary btn-sm" onClick={handleDownload}>
            <i className="ti ti-download btn-icon" /> Download PDF
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleShare}>
            <i className="ti ti-share btn-icon" /> Share
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleLinkedIn}>
            <i className="ti ti-brand-linkedin btn-icon" /> LinkedIn
          </button>
          <Link
            to={`/courses/${getCourseRouteKey(certificate.course) || certificate.course_id}`}
            className="btn btn-ghost btn-sm"
          >
            View course
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Empty slot card ──────────────────────────────────────────────────────────
function EmptyCertSlot() {
  return (
    <div className="empty-cert">
      <div className="empty-cert-icon">
        <i className="ti ti-certificate empty-cert-icon-glyph" />
      </div>
      <div className="empty-cert-label">More to unlock</div>
      <div className="empty-cert-sub">
        Complete a course to earn
        <br />
        your next certificate
      </div>
      <Link to="/courses" className="btn btn-outline btn-sm empty-cert-btn">
        Browse courses
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CertificatesPage() {
  const { client } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const showRecipient = true;

  useEffect(() => {
    async function load() {
      try {
        const response = await client.get("/certificates");
        setCertificates(extractList(response.data));
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [client]);

  const pageDescription = "Your issued certificates.";

  // Show an empty slot card when fewer than 3 earned (matches template's 3-col grid)
  const gridItems = [...certificates];
  if (!loading && certificates.length > 0 && certificates.length % 3 !== 0) {
    gridItems.push({ __empty: true });
  }

  return (
    <>
      {/* Scoped styles — mirrors _shared.css tokens + cert-specific rules */}
      <style>{`
        /* ── Cert card ── */
        .cert-card {
          background: var(--card, #0a0a0a);
          border: 1px solid var(--border, #1e1e1e);
          border-radius: 8px;
          overflow: hidden;
          transition: border-color .15s;
        }
        .cert-card:hover { border-color: #2a2a2a; }

        /* preview pane */
        .cert-preview {
          background: #0a0a0a;
          border-bottom: 1px solid var(--border, #1e1e1e);
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 160px;
        }
        .cert-doc {
          background: var(--card, #111);
          border: 1px solid #2a2a2a;
          border-radius: 4px;
          padding: 16px 20px;
          width: 220px;
          position: relative;
        }
        .cert-doc-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .cert-logo-mini {
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          color: #00e574;
          background: #001a0d;
          border: 1px solid #003a1a;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .cert-rosette {
          font-size: 14px;
          color: #00e574;
          opacity: .6;
        }
        .cert-doc-title {
          font-size: 10px;
          font-weight: 500;
          color: #888;
          margin-bottom: 6px;
          letter-spacing: -.01em;
        }
        .cert-doc-name {
          font-size: 12px;
          font-weight: 600;
          color: #e8e8e8;
          border-bottom: 1px solid #1e1e1e;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }
        .cert-doc-course {
          font-size: 9px;
          font-family: var(--font-mono, monospace);
          color: #3a3a3a;
          line-height: 1.5;
        }
        .cert-doc-date {
          font-size: 9px;
          font-family: var(--font-mono, monospace);
          color: #3a3a3a;
          margin-top: 8px;
        }
        .cert-doc-stamp {
          position: absolute;
          bottom: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid #003a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          color: #00e574;
          opacity: .5;
        }

        /* card body */
        .cert-body { padding: 16px; }
        .cert-title {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
          letter-spacing: -.01em;
        }
        .cert-meta {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #888;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 6px;
        }
        .cert-meta-icon { font-size: 11px; }
        .cert-badge { font-size: 9px !important; }
        .cert-number {
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          color: #3a3a3a;
          margin-bottom: 12px;
        }
        .cert-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .btn-icon { font-size: 12px; }

        /* empty slot */
        .empty-cert {
          background: var(--card, #0a0a0a);
          border: 1px dashed #2a2a2a;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
        }
        .empty-cert-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #111;
          border: 1px solid #1e1e1e;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
        }
        .empty-cert-icon-glyph { font-size: 20px; color: #3a3a3a; }
        .empty-cert-label { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
        .empty-cert-sub {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: #3a3a3a;
          line-height: 1.6;
        }
        .empty-cert-btn { margin-top: 14px; display: inline-flex; }

        /* certs grid */
        .certs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 900px) {
          .certs-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 580px) {
          .certs-grid { grid-template-columns: 1fr; }
        }

        /* badge (in case not globally available) */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-family: var(--font-mono, monospace);
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 3px;
          letter-spacing: .04em;
        }
        .badge-green {
          background: #001a0d;
          color: #00e574;
          border: 1px solid #003a1a;
        }

        /* buttons (in case not globally available) */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 500;
          padding: 0 14px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: .15s;
          white-space: nowrap;
          font-family: var(--font-mono, monospace);
          letter-spacing: .02em;
          text-decoration: none;
        }
        .btn-sm { height: 26px; font-size: 11px; padding: 0 10px; }
        .btn-primary { background: #00e574; color: #001a0d; border-color: #00e574; }
        .btn-primary:hover { background: #00ff80; }
        .btn-outline { background: transparent; border-color: #2a2a2a; color: #888; }
        .btn-outline:hover { border-color: #555; color: #e8e8e8; }
        .btn-ghost { background: transparent; border: none; color: #888; }
        .btn-ghost:hover { background: #111; color: #e8e8e8; }
      `}</style>

      <section className="home-shell py-9">
        <PageHeader title="Certificates" description={pageDescription} />

        {/* TODO: change to toast error */}
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {loading && <LoadingState />}

        {!loading && certificates.length === 0 && (
          <div className="certs-grid">
            <EmptyCertSlot />
          </div>
        )}

        {!loading && certificates.length > 0 && (
          <div className="certs-grid">
            {gridItems.map((cert, i) =>
              cert.__empty ? (
                <EmptyCertSlot key="__empty" />
              ) : (
                <CertCard
                  key={cert.id ?? i}
                  certificate={cert}
                  showRecipient={showRecipient}
                />
              ),
            )}
          </div>
        )}
      </section>
    </>
  );
}
