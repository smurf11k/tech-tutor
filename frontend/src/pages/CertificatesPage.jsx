import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { extractList, getApiErrorMessage } from "@/lib/utils";

export default function CertificatesPage() {
  const { client, isAdmin, isInstructor } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const showRecipient = isAdmin || isInstructor;

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

  const pageDescription = showRecipient
    ? isAdmin
      ? "All certificates issued on the platform."
      : "Certificates issued for your courses."
    : "Your earned course certificates.";

  return (
    <section>
      <PageHeader title="Certificates" description={pageDescription} />
      {loading ? <LoadingState /> : null}
      <section className="grid gap-4 md:grid-cols-2">
        {certificates.map((certificate) => (
          <Card key={certificate.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {certificate.course?.title ||
                  `Course #${certificate.course_id}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {showRecipient && certificate.user ? (
                <p>
                  <span className="text-muted-foreground">Student: </span>
                  {certificate.user.name} ({certificate.user.email})
                </p>
              ) : null}
              <p>Number: {certificate.certificate_number}</p>
              <p>Issued: {certificate.issued_at}</p>
              <Link
                className="underline"
                to={`/courses/${certificate.course_id}`}
              >
                View course
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </section>
  );
}
