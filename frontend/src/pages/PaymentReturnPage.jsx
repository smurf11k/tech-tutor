import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import {
  finalizeStripePaymentReturn,
  parsePaymentReturnFromUrl,
} from "@/hooks/usePaymentReturn";
import { getApiErrorMessage } from "@/lib/utils";

export default function PaymentReturnPage({ variant = "success" }) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(variant === "success");

  useEffect(() => {
    if (variant !== "success") {
      return;
    }

    const { sessionId, courseId } = parsePaymentReturnFromUrl(location.search);

    finalizeStripePaymentReturn({ sessionId, courseId })
      .then(setResult)
      .catch((err) =>
        setError(getApiErrorMessage(err, "Could not finalize payment.")),
      )
      .finally(() => setLoading(false));
  }, [location.search, variant]);

  const isPaid =
    result?.status === "paid" || result?.confirm?.payment?.status === "paid";

  return (
    <section className="mx-auto max-w-lg">
      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {variant === "success" ? (
              <CheckCircle2 className="size-5 text-primary" />
            ) : (
              <XCircle className="size-5 text-muted-foreground" />
            )}
            {variant === "success" ? "Payment return" : "Payment cancelled"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {variant === "cancel" ? (
            <p className="text-sm text-muted-foreground">
              Checkout was cancelled. You can try again from the course page.
            </p>
          ) : null}

          {!isAuthenticated && variant === "success" ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Log in with the same account you used for checkout to complete
              enrollment automatically.
            </p>
          ) : null}

          {loading ? (
            <LoadingState label="Confirming payment with Stripe..." compact />
          ) : null}

          {!loading && isPaid ? (
            <p className="text-sm text-muted-foreground">
              Payment confirmed. You are enrolled and can open the course from
              My learning.
            </p>
          ) : null}

          {!loading && result && !isPaid && variant === "success" ? (
            <p className="text-sm text-muted-foreground">
              Payment status: {result.status}. If this stays pending, ensure
              Stripe webhooks are configured or try again while logged in.
            </p>
          ) : null}

          <Button asChild>
            <Link to={isPaid ? "/learning" : "/payments"}>
              {isPaid ? "Go to My learning" : "View payments"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
