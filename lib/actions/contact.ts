"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type ActionState = {
  error?: string;
  success?: string;
};

export async function sendContactEmail(
  state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const fullName = formData.get("fullName") as string;
  const organization = formData.get("organization") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const projectType = formData.get("projectType") as string;
  const message = formData.get("message") as string;

  if (!fullName || !email || !message) {
    return { error: "Please fill in all required fields." };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Agunwami Enterprise <arigbojesse@gmail.com>", // Replace with your verified domain in production
      to: ["arigbojesse@gmail.com"], // Replace with your destination email
      subject: `New Inquiry: ${projectType} from ${fullName}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Full Name:</strong> ${fullName}</p>
        <p><strong>Organization:</strong> ${organization || "N/A"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Project Type:</strong> ${projectType}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    if (error) {
      console.error("Resend Error Detail:", JSON.stringify(error, null, 2));
      return { error: `Resend Error: ${error.message || "Failed to send message. Please try again later."}` };
    }


    return { success: "Your message has been sent successfully!" };
  } catch (err) {
    console.error("Server Action Error:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }
}
