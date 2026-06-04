// Email notifications via Gmail SMTP (configured in Supabase Auth SMTP settings)
// All emails sent via Supabase Auth email or direct nodemailer calls.
// All text in Spanish.

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_SMTP_USER,
    pass: process.env.GMAIL_SMTP_APP_PASSWORD,
  },
});

// Colombia time helper (UTC-5)
function toColombiaTime(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'long',
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"La Polla de Pompy" <${process.env.GMAIL_SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[notifications] Failed to send email to', to, err);
  }
}

// 1. Welcome email on registration
export async function sendWelcomeEmail(email: string, displayName: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://polla-pompy.vercel.app';
  await sendEmail(
    email,
    '¡Bienvenido a La Polla de Pompy! 🏆',
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h1 style="color: #0a4a2e;">¡Hola, ${displayName}! 🏆</h1>
      <p>Tu registro en <strong>La Polla de Pompy</strong> fue confirmado.</p>
      <p>Recuerda que tienes hasta el <strong>10 de junio de 2026 a las 11:59 PM (hora Colombia)</strong>
      para registrarte y enviar tus picks especiales.</p>
      <a href="${appUrl}/onboarding"
         style="background:#0a4a2e;color:#f5c842;padding:12px 24px;
                border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">
        Completar mi registro →
      </a>
      <p style="color:#666;font-size:12px;">¡Buena suerte en el Mundial!</p>
    </div>
    `
  );
}

// 2. Pick reminder (2h before lock)
export async function sendPickReminder(
  email: string,
  displayName: string,
  homeTeam: string,
  awayTeam: string,
  kickoffUtc: string,
  matchId: string
): Promise<void> {
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://polla-pompy.vercel.app';
  const kickoffCo = toColombiaTime(kickoffUtc);
  await sendEmail(
    email,
    `⏰ ¡Faltan 2 horas! — ${homeTeam} vs ${awayTeam}`,
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #0a4a2e;">⏰ Hola ${displayName}, aún no has ingresado tu pick</h2>
      <p style="font-size:18px;"><strong>${homeTeam}</strong> vs <strong>${awayTeam}</strong></p>
      <p>El partido comienza a las <strong>${kickoffCo} (hora Colombia)</strong>.</p>
      <p>Tu pick cierra <strong>1 hora antes del pitazo</strong>. ¡Date prisa!</p>
      <a href="${appUrl}/picks/${matchId}"
         style="background:#0a4a2e;color:#f5c842;padding:12px 24px;
                border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">
        Ingresar mi pick →
      </a>
    </div>
    `
  );
}

// 3. Auto-assigned pick notification
export async function sendAutoPickEmail(
  email: string,
  displayName: string,
  homeTeam: string,
  awayTeam: string,
  homePick: number,
  awayPick: number,
  matchId: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://polla-pompy.vercel.app';
  await sendEmail(
    email,
    `⚠️ Pick automático — ${homeTeam} vs ${awayTeam}`,
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #e65100;">⚠️ Hola ${displayName}, te asignamos un pick automático</h2>
      <p>No ingresaste tu pick para <strong>${homeTeam} vs ${awayTeam}</strong> antes del cierre.</p>
      <p style="font-size:24px;font-weight:bold;text-align:center;
                background:#f5f5f5;padding:16px;border-radius:8px;">
        ${homeTeam} <span style="color:#0a4a2e;">${homePick} – ${awayPick}</span> ${awayTeam}
      </p>
      <p>Te asignamos <strong>${homePick}–${awayPick}</strong> automáticamente. ¡Buena suerte!</p>
      <a href="${appUrl}/picks/${matchId}"
         style="background:#0a4a2e;color:#f5c842;padding:12px 24px;
                border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">
        Ver mi pick →
      </a>
    </div>
    `
  );
}

// 4. Points updated after match finishes
export async function sendPointsUpdatedEmail(
  email: string,
  displayName: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  pointsEarned: number,
  currentRank: number,
  matchId: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://polla-pompy.vercel.app';
  const emoji  = pointsEarned > 0 ? '🎉' : '😔';
  await sendEmail(
    email,
    `🏆 ${homeTeam} ${homeScore}–${awayScore} ${awayTeam} — Ganaste ${pointsEarned} pts`,
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #0a4a2e;">${emoji} Hola ${displayName}, resultado actualizado</h2>
      <p style="font-size:24px;font-weight:bold;text-align:center;
                background:#f5f5f5;padding:16px;border-radius:8px;">
        ${homeTeam} <span style="color:#0a4a2e;">${homeScore} – ${awayScore}</span> ${awayTeam}
      </p>
      <p style="font-size:18px;">
        Ganaste <strong>${pointsEarned} punto${pointsEarned !== 1 ? 's' : ''}</strong> en este partido.
      </p>
      <p>Tu posición actual en la tabla: <strong>#${currentRank}</strong></p>
      <a href="${appUrl}/match/${matchId}"
         style="background:#0a4a2e;color:#f5c842;padding:12px 24px;
                border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">
        Ver tabla de posiciones →
      </a>
    </div>
    `
  );
}

// 5. API usage alert to admin
export async function sendApiUsageAlert(callCount: number): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  await sendEmail(
    adminEmail,
    `⚠️ Alerta: Uso de API-Football al ${callCount}%`,
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #e65100;">⚠️ Alerta de uso de API</h2>
      <p>Ya has usado <strong>${callCount} de 100</strong> llamadas diarias a API-Football.</p>
      ${callCount >= 95
        ? '<p style="color:red;font-weight:bold;">⛔ Se ha detenido el polling automático.</p>'
        : '<p>El sistema ha cambiado a polling cada 15 minutos para conservar llamadas.</p>'
      }
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin"
         style="background:#0a4a2e;color:#f5c842;padding:12px 24px;
                border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">
        Ir al panel admin →
      </a>
    </div>
    `
  );
}
