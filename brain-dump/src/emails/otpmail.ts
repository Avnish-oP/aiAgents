export const otpMailTemplate = (otp: string) => `
  <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
    <h2 style="color: #333;">Your One-Time Password (OTP)</h2>
    <p style="font-size: 18px; color: #555;">Use the following OTP to complete your login:</p>
    <div style="font-size: 24px; font-weight: bold; color: #000; margin: 20px 0;">
      ${otp}
    </div>
    <p style="font-size: 14px; color: #999;">This OTP is valid for 10 minutes.</p>
  </div>
`;
