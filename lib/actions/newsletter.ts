"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type NewsletterActionState = {
  error?: string;
  success?: string;
  email?: string;
};

export async function subscribeNewsletter(
  prevState: NewsletterActionState,
  formData: FormData
): Promise<NewsletterActionState> {
  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const organization = (formData.get("organization") as string)?.trim() || "N/A";
  const topics = formData.getAll("topics") as string[];
  const frequency = (formData.get("frequency") as string)?.trim() || "Weekly";

  if (!fullName) {
    return { error: "Please enter your name." };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  try {
    const topicList = topics.length > 0 ? topics.join(", ") : "All Topics";

    // If Resend API key is configured, send notification
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: "Agunwami Enterprise <arigbojesse@gmail.com>",
          to: ["arigbojesse@gmail.com"],
          subject: `New Newsletter Subscriber: ${fullName}`,
          html: `
            <h2>New Newsletter Subscription</h2>
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Organization:</strong> ${organization}</p>
            <p><strong>Topics of Interest:</strong> ${topicList}</p>
            <p><strong>Cadence:</strong> ${frequency}</p>
          `,
        });
      } catch (emailErr) {
        console.warn("Resend notification error (non-fatal):", emailErr);
      }
    }

    return {
      success: `Thank you for subscribing, ${fullName}! You're now on our mailing list.`,
      email,
    };
  } catch (err) {
    console.error("Newsletter subscription error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
