import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/utils";

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactSection() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/contact", form);
      setSuccess(response.data.message || "Message sent successfully.");
      setForm(initialForm);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not send your message."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Contact us</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Questions about courses, partnerships, or your account? Send us a
          message and we will respond as soon as we can.
        </p>
      </div>
      <Card className="glass-panel max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Get in touch</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorAlert message={error} />
          {success ? (
            <p className="mb-4 text-sm text-primary">{success}</p>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="block space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label className="block space-y-2">
              <Label htmlFor="contact-subject">Subject (optional)</Label>
              <Input
                id="contact-subject"
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                required
                rows={5}
                value={form.message}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
              />
            </label>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send message"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
