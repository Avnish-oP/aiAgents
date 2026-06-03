import { Resend } from 'resend';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const resend = new Resend(env.RESEND_API_KEY);
async function test() {
  console.log("Sending with from:", env.EMAIL_FROM);
  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: 'vineslol1245@gmail.com', // User's email
    subject: 'Test',
    html: '<p>test</p>'
  });
  console.log("Result:", JSON.stringify(result, null, 2));
}
test();
