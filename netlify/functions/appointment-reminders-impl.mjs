export const config = {
  schedule: "0 * * * *",
};

export async function handler() {
  const baseUrl =
    process.env.PUBLIC_APP_URL ??
    process.env.URL ??
    "http://localhost:8888";
  const secret = process.env.NOTIFICATION_CRON_SECRET ?? "";
  const url = new URL("/api/notifications/process-reminders", baseUrl);

  if (secret) {
    url.searchParams.set("secret", secret);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const body = await response.text();
  return {
    statusCode: response.status,
    headers: {
      "Content-Type": "application/json",
    },
    body,
  };
}
