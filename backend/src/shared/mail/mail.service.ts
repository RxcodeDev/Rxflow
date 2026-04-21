import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private get transporter() {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST   ?? 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT  ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
      },
    });
  }

  async sendInvitation(opts: {
    to:          string;
    name:        string;
    tempPassword: string;
    invitedBy?:  string;
  }): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3001'}/auth/login`;
    const from     = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@rxflow.io';

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111">
        <h2 style="font-size:1.25rem;margin-bottom:8px">Has sido invitado a Rxflow</h2>
        <p style="color:#555;margin-bottom:20px">
          ${opts.invitedBy ? `<strong>${opts.invitedBy}</strong> te ha invitado a unirte al equipo.` : 'Te han invitado a unirte al equipo.'}
        </p>
        <p style="margin-bottom:4px">Usa estas credenciales para ingresar:</p>
        <table style="background:#f5f5f5;border-radius:8px;padding:16px;width:100%;border-collapse:collapse">
          <tr><td style="padding:4px 8px;color:#555;font-size:0.875rem">Correo</td><td style="padding:4px 8px;font-weight:600">${opts.to}</td></tr>
          <tr><td style="padding:4px 8px;color:#555;font-size:0.875rem">Contraseña temporal</td><td style="padding:4px 8px;font-weight:600;font-family:monospace">${opts.tempPassword}</td></tr>
        </table>
        <a href="${loginUrl}"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#111;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Ingresar a Rxflow
        </a>
        <p style="margin-top:24px;font-size:0.75rem;color:#bbb">
          Cambia tu contraseña en Preferencias después de iniciar sesión.
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to:      opts.to,
        subject: 'Invitación a Rxflow',
        html,
      });
      this.logger.log(`Invitation sent to ${opts.to}`);
    } catch (err) {
      this.logger.error(`Failed to send invitation to ${opts.to}`, err);
      throw err;
    }
  }
}
