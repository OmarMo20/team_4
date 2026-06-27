const nodemailer = require("nodemailer");
const config = require("../config");

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
  tls: {
    // Bypass certificate validation for development
    // WARNING: Do not use in production!
    rejectUnauthorized: false,
  },
});

// Verify connection
transporter
  .verify()
  .then(() => console.log("✅ Email service connected"))
  .catch((err) => console.error("❌ Email service error:", err.message));

/**
 * Send OTP email for registration
 */
const sendRegistrationOTP = async (email, otp, name) => {
  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: "ClassTrack - Verify Your Email",
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #6B46C1;">ClassTrack</h1>
                </div>
                <h2 style="color: #333;">مرحباً ${name}!</h2>
                <p style="color: #666; font-size: 16px;">
                    شكراً لتسجيلك في ClassTrack. استخدم الكود التالي لتأكيد بريدك الإلكتروني:
                </p>
                <div style="background: linear-gradient(135deg, #6B46C1, #805AD5); padding: 20px; border-radius: 10px; text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: white; letter-spacing: 8px;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 14px;">
                    هذا الكود صالح لمدة <strong>5 دقائق</strong> فقط.
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    إذا لم تقم بإنشاء حساب، يرجى تجاهل هذا البريد.
                </p>
            </div>
        `,
  };

  return transporter.sendMail(mailOptions);
};

/**
 * Send OTP email for password reset
 */
const sendPasswordResetOTP = async (email, otp, name) => {
  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: "ClassTrack - Reset Your Password",
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #6B46C1;">ClassTrack</h1>
                </div>
                <h2 style="color: #333;">مرحباً ${name}!</h2>
                <p style="color: #666; font-size: 16px;">
                    لقد طلبت إعادة تعيين كلمة المرور. استخدم الكود التالي:
                </p>
                <div style="background: linear-gradient(135deg, #6B46C1, #805AD5); padding: 20px; border-radius: 10px; text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: white; letter-spacing: 8px;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 14px;">
                    هذا الكود صالح لمدة <strong>5 دقائق</strong> فقط.
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.
                </p>
            </div>
        `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendRegistrationOTP,
  sendPasswordResetOTP,
};
