// ==============================================================
// Iranian SMS Service Interface & Providers (sms.ir / Kavenegar / FarazSMS)
// ==============================================================

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ISmsProvider {
  sendOtp(phone: string, code: string): Promise<SmsSendResult>;
  // متن آزاد برای سرویس اعلان‌ها (src/lib/notifications)
  // marketing: پیامک تبلیغاتی از خط تبلیغاتی جدا ارسال می‌شود (در صورت تعریف)
  sendText(phone: string, text: string, marketing?: boolean): Promise<SmsSendResult>;
  sendOrderNotification?(phone: string, orderNumber: string, trackingCode?: string): Promise<SmsSendResult>;
}

/**
 * A provider without credentials only logs in development. In production it
 * reports a failure instead of pretending the message was delivered.
 */
function missingCredentials(provider: string, phone: string, text: string): SmsSendResult {
  if (process.env.NODE_ENV === "production") {
    return { success: false, error: `${provider}: API key is not configured` };
  }
  console.warn(`⚠️ [${provider}] API key not set. Dev log → ${phone}: ${text}`);
  return { success: true, messageId: `${provider}-dev-${Date.now()}` };
}

function normalizePhone(phone: string): string {
  let clean = phone.trim().replace(/^\+98/, "0");
  if (!clean.startsWith("0")) clean = "0" + clean;
  return clean;
}

// --------------------------------------------------------------
// ۱. سامانه هوشمند پیامک ایران (sms.ir - UltraFast Verification v2)
// --------------------------------------------------------------
export class SmsIrProvider implements ISmsProvider {
  private apiKey: string;
  private templateId: number;

  constructor(apiKey?: string, templateId?: number) {
    this.apiKey = apiKey || process.env.SMSIR_API_KEY || "";
    this.templateId =
      templateId || Number(process.env.SMSIR_TEMPLATE_ID || "100000");
  }

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    try {
      if (!this.apiKey) return missingCredentials("sms.ir", phone, `OTP ${code}`);

      // Format mobile number to 11-digit Iranian standard (e.g. 0912xxxxxxx)
      let cleanPhone = phone.trim().replace(/^\+98/, "0");
      if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

      const response = await fetch("https://api.sms.ir/v1/send/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          mobile: cleanPhone,
          templateId: this.templateId,
          parameters: [
            {
              name: "Code",
              value: code,
            },
          ],
        }),
      });

      const data = await response.json();

      if (response.ok && data?.status === 1) {
        return {
          success: true,
          messageId: String(data?.data?.messageId || ""),
        };
      }

      return {
        success: false,
        error: data?.message || "خطا در ارسال پیامک با سامانه sms.ir",
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  }

  async sendOrderNotification(
    phone: string,
    orderNumber: string,
    trackingCode?: string
  ): Promise<SmsSendResult> {
    try {
      if (!this.apiKey) return missingCredentials("sms.ir", phone, `order ${orderNumber}`);

      const orderTemplateId = Number(process.env.SMSIR_ORDER_TEMPLATE_ID || this.templateId);
      let cleanPhone = phone.trim().replace(/^\+98/, "0");
      if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

      const response = await fetch("https://api.sms.ir/v1/send/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          mobile: cleanPhone,
          templateId: orderTemplateId,
          parameters: [
            { name: "OrderNumber", value: orderNumber },
            { name: "TrackingCode", value: trackingCode || "در حال آماده‌سازی" },
          ],
        }),
      });

      const data = await response.json();
      return {
        success: response.ok && data?.status === 1,
        messageId: String(data?.data?.messageId || ""),
        error: data?.message,
      };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  }
  async sendText(phone: string, text: string, marketing = false): Promise<SmsSendResult> {
    try {
      const lineNumber = Number((marketing && process.env.SMSIR_MARKETING_LINE_NUMBER) || process.env.SMSIR_LINE_NUMBER || "0");
      if (!this.apiKey || !lineNumber) return missingCredentials("sms.ir", phone, text);

      const response = await fetch("https://api.sms.ir/v1/send/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/plain", "x-api-key": this.apiKey },
        body: JSON.stringify({ lineNumber, messageText: text, mobiles: [normalizePhone(phone)] }),
      });
      const data = await response.json();
      return response.ok && data?.status === 1
        ? { success: true, messageId: String(data?.data?.packId || "") }
        : { success: false, error: data?.message || "خطا در ارسال پیامک با سامانه sms.ir" };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

// --------------------------------------------------------------
// ۲. کاوه‌نگار (Kavenegar Pattern Verification)
// --------------------------------------------------------------
export class KavenegarProvider implements ISmsProvider {
  private apiKey: string;
  private template: string;

  constructor(apiKey?: string, template?: string) {
    this.apiKey = apiKey || process.env.KAVENEGAR_API_KEY || "";
    this.template = template || process.env.KAVENEGAR_OTP_TEMPLATE || "verify";
  }

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    try {
      if (!this.apiKey) return missingCredentials("kavenegar", phone, `OTP ${code}`);

      const url = `https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json`;
      const params = new URLSearchParams({
        receptor: phone,
        token: code,
        template: this.template,
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: "GET",
      });

      const data = await response.json();

      if (data?.return?.status === 200) {
        return {
          success: true,
          messageId: String(data?.entries?.[0]?.messageid || ""),
        };
      }

      return {
        success: false,
        error: data?.return?.message || "خطا در ارسال پیامک با کاوه‌نگار",
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  }
  async sendText(phone: string, text: string): Promise<SmsSendResult> {
    try {
      if (!this.apiKey) return missingCredentials("kavenegar", phone, text);
      const params = new URLSearchParams({ receptor: normalizePhone(phone), message: text });
      if (process.env.KAVENEGAR_SENDER) params.set("sender", process.env.KAVENEGAR_SENDER);
      const response = await fetch(`https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json?${params.toString()}`);
      const data = await response.json();
      return data?.return?.status === 200
        ? { success: true, messageId: String(data?.entries?.[0]?.messageid || "") }
        : { success: false, error: data?.return?.message || "خطا در ارسال پیامک با کاوه‌نگار" };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

// --------------------------------------------------------------
// ۳. فراز اس‌ام‌اس / آی‌پی‌پنل (FarazSMS Pattern Service)
// --------------------------------------------------------------
export class FarazSmsProvider implements ISmsProvider {
  private apiKey: string;
  private patternCode: string;
  private originator: string;

  constructor(apiKey?: string, patternCode?: string, originator?: string) {
    this.apiKey = apiKey || process.env.FARAZSMS_API_KEY || "";
    this.patternCode = patternCode || process.env.FARAZSMS_PATTERN_CODE || "";
    this.originator = originator || process.env.FARAZSMS_ORIGINATOR || "+983000505";
  }

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    try {
      if (!this.apiKey || !this.patternCode) return missingCredentials("farazsms", phone, `OTP ${code}`);

      const response = await fetch("https://api2.ippanel.com/api/v1/sms/pattern/normal/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          code: this.patternCode,
          sender: this.originator,
          recipient: phone,
          variable: {
            code: code,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && (data?.status === "OK" || data?.data?.message_id)) {
        return {
          success: true,
          messageId: String(data?.data?.message_id || ""),
        };
      }

      return {
        success: false,
        error: data?.message || "خطا در ارسال پیامک با فراز اس‌ام‌اس",
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  }
  async sendText(phone: string, text: string): Promise<SmsSendResult> {
    try {
      if (!this.apiKey) return missingCredentials("farazsms", phone, text);
      const response = await fetch("https://api2.ippanel.com/api/v1/sms/send/webservice/single", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.apiKey },
        body: JSON.stringify({ recipient: [normalizePhone(phone)], sender: this.originator, message: text }),
      });
      const data = await response.json();
      return response.ok && (data?.status === "OK" || data?.data?.message_id)
        ? { success: true, messageId: String(data?.data?.message_id || "") }
        : { success: false, error: data?.message || "خطا در ارسال پیامک با فراز اس‌ام‌اس" };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

// --------------------------------------------------------------
// ۴. شبیه‌ساز توسعه و تست لوکال (Mock Provider)
// --------------------------------------------------------------
export class MockSmsProvider implements ISmsProvider {
  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    console.log(`\n==================================================`);
    console.log(`📱 [MAYA SPIRULINA SMS SERVICE DEV LOG]`);
    console.log(`سامانه: Mock Development Service`);
    console.log(`گیرنده: ${phone}`);
    console.log(`کد تایید OTP: >>> ${code} <<<`);
    console.log(`زمان: ${new Date().toLocaleTimeString("fa-IR")}`);
    console.log(`==================================================\n`);

    return {
      success: true,
      messageId: "mock-" + Math.floor(Math.random() * 1000000),
    };
  }
  async sendText(phone: string, text: string): Promise<SmsSendResult> {
    console.log(`📱 [MAYA SMS DEV LOG] ${phone}: ${text}`);
    return { success: true, messageId: "mock-" + Date.now() };
  }
}

/**
 * Factory to get active SMS Provider based on environment configuration
 */
export function getSmsProvider(): ISmsProvider {
  const provider = (process.env.SMS_PROVIDER || "mock").toLowerCase().replace(/[^a-z]/g, "");

  switch (provider) {
    case "smsir":
      return new SmsIrProvider();
    case "kavenegar":
      return new KavenegarProvider();
    case "farazsms":
    case "ippanel":
      return new FarazSmsProvider();
    default:
      return new MockSmsProvider();
  }
}
