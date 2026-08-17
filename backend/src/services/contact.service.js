import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { logger } from '../utils/logger.js';

/**
 * No email provider is configured yet (Phase 6 owns outbound
 * email/SMS/WhatsApp). Submissions are recorded server-side — via the
 * audit log and structured logs — so the team can follow up manually,
 * rather than pretending an email was sent.
 */
export const contactService = {
  async submit({ name, email, subject, message }, requestMeta) {
    logger.info('Contact form submission received', { name, email, subject });

    await auditLogRepository.record({
      action: 'contact.message_received',
      entityType: 'contact_message',
      metadata: { name, email, subject: subject || null, message },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return { message: 'Thanks for reaching out — the CardHub team will get back to you soon.' };
  },
};
