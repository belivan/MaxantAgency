import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/gmail.compose'];
const CREDENTIALS_PATH = path.resolve('./.credentials.json');

function getOAuth2Client() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI } = process.env;

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REDIRECT_URI) {
    throw new Error('Gmail OAuth2 credentials missing in environment (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI)');
  }

  return new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI
  );
}

export function generateAuthUrl() {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

export async function getTokenFromCode(code) {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  saveCredentials(tokens);
  return tokens;
}

export function saveCredentials(tokens) {
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(tokens, null, 2));
}

export function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) return null;
  try {
    const data = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function makeRawMessage({ from, to, subject, text, html }) {
  // Build a simple multipart MIME message
  let boundary = '----=_Part_' + Date.now();
  const nl = '\r\n';

  // Encode subject line for non-ASCII characters (RFC 2047)
  // This prevents em dashes, smart quotes, etc. from being corrupted
  const encodedSubject = /[^\x00-\x7F]/.test(subject)
    ? `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`
    : subject;

  let message = '';
  message += `From: ${from}${nl}`;
  message += `To: ${to}${nl}`;
  message += `Subject: ${encodedSubject}${nl}`;
  message += `MIME-Version: 1.0${nl}`;
  message += `Content-Type: multipart/alternative; boundary=${boundary}${nl}${nl}`;

  // Plain text part
  message += `--${boundary}${nl}`;
  message += `Content-Type: text/plain; charset=UTF-8${nl}`;
  message += `Content-Transfer-Encoding: 8bit${nl}${nl}`;
  message += `${text}${nl}${nl}`;

  // HTML part (optional)
  if (html) {
    message += `--${boundary}${nl}`;
    message += `Content-Type: text/html; charset=UTF-8${nl}`;
    message += `Content-Transfer-Encoding: 8bit${nl}${nl}`;
    message += `${html}${nl}${nl}`;
  }

  message += `--${boundary}--`;

  // Base64URL encode
  const encoded = Buffer.from(message, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encoded;
}

export async function createDraft({ from, to, subject, text, html }) {
  const tokens = loadCredentials();
  if (!tokens) throw new Error('Gmail credentials not found. Complete OAuth flow first.');

  const oAuth2Client = getOAuth2Client();
  oAuth2Client.setCredentials(tokens);

  // Refresh token if expired
  try {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const raw = makeRawMessage({ from, to, subject, text, html });

    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw
        }
      }
    });

    return res.data;
  } catch (error) {
    // If token expired or invalid, surface a friendly error
    throw new Error(`Failed to create Gmail draft: ${error.message}`);
  }
}
