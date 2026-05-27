import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/contexts/ToastContext";

import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/utils";

const SUBJECT_OPTIONS = [
  "General Question",
  "Course Feedback",
  "Teach at Tech Tutor",
  "Business / Partnership",
  "Bug Report",
  "Account Support",
  "Billing Question",
  "Feature Request",
];

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactSection() {
  const [form, setForm] = useState(initialForm);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const toast = useToast();

  async function handleSubmit(event) {
    event.preventDefault();

    // Client-side validation
    if (!form.subject) {
      toast.error("Please select a subject before sending your message.");

      return;
    }

    if (!form.message.trim()) {
      toast.error("Please enter a message.");

      return;
    }

    setLoading(true);
    setSuccess("");

    try {
      const response = await api.post("/contact", form);

      toast.success(
        response.data.message || "Your message has been sent successfully.",
      );

      setSuccess(response.data.message || "Message sent successfully.");
      setForm(initialForm);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Something went wrong. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="scroll-mt-24 space-y-6">
      <div>
        <p className="text-[10px] tracking-[0.12em] text-primary mono-ui uppercase">
          // SUPPORT
        </p>

        <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">
          Contact us
        </h2>

        <p className="mt-2 max-w-2xl text-xs text-[#555] mono-ui">
          Questions about courses, partnerships, or your account? Send us a
          message and we will respond as soon as we can.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-[13px] mono-ui">Get in touch</CardTitle>
        </CardHeader>

        <CardContent>
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
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
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
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>

            <label className="block space-y-2">
              <Label htmlFor="contact-subject">Subject</Label>

              <select
                id="contact-subject"
                required
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a subject</option>

                {SUBJECT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
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
