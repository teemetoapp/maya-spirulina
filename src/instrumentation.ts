import type { Instrumentation } from "next";

// خطاهای سرور به هشدار تلگرامی مدیران (ماژول «هشدار خرابی سرویس‌ها»)
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportServerError } = await import("@/lib/monitoring");
  await reportServerError(err, request.path);
};
