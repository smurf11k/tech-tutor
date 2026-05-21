import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { extractList, formatMoney, getApiErrorMessage } from "@/lib/utils";

export default function PaymentsPage() {
  const { client, isAdmin, isInstructor } = useAuth();
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await client.get("/payments");
        setPayments(extractList(response.data));
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Failed to load payments."));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [client, toast]);

  const description = isAdmin
    ? "All platform payments with buyer details."
    : isInstructor
      ? "Payments for your courses."
      : "Payment history for your account.";

  return (
    <section>
      <PageHeader title="Payments" description={description} />
      {loading ? <LoadingState /> : null}
      <section className="space-y-3">
        {payments.map((payment) => (
          <Card key={payment.id} className="glass-panel">
            <CardHeader>
              <CardTitle className="text-base">
                {payment.course?.title || `Course #${payment.course_id}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {isAdmin || isInstructor ? (
                <p>
                  Student:{" "}
                  <span className="font-medium">
                    {payment.user?.name || "Unknown"}
                  </span>
                  {payment.user?.email ? (
                    <span className="text-muted-foreground">
                      {" "}
                      ({payment.user.email})
                    </span>
                  ) : null}
                </p>
              ) : null}
              <p>Status: {payment.status}</p>
              <p>
                Amount: {formatMoney(payment.amount, payment.currency || "USD")}
              </p>
              <p>Provider: {payment.provider}</p>
              <Link className="text-primary hover:underline" to={`/courses/${payment.course_id}`}>
                View course
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
      {!loading && payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      ) : null}
    </section>
  );
}
