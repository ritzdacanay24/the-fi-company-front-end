import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  DASHBOARD_WEB_BASE_URL: Joi.alternatives().conditional('NODE_ENV', {
    is: 'development',
    then: Joi.string().trim().uri().default('http://localhost:4200'),
    otherwise: Joi.string().trim().uri().default('https://dashboard.eye-fi.com/dist/web'),
  }),
  CORS_ORIGIN: Joi.string().allow('').optional(),
  ATTACHMENTS_FS_REMOTE_BASE_URL: Joi.string()
    .trim()
    .uri()
    .default('https://dashboard.eye-fi.com/attachments'),
  QAD_DSN: Joi.string().optional(),
  QAD_USER: Joi.string().optional(),
  QAD_PASSWORD: Joi.string().optional(),
  SMTP_HOST: Joi.alternatives().conditional('NODE_ENV', {
    is: 'development',
    then: Joi.string().trim().default('mailpit'),
    otherwise: Joi.string().trim().default('localhost'),
  }),
  SMTP_PORT: Joi.alternatives().conditional('NODE_ENV', {
    is: 'development',
    then: Joi.number().port().default(1025),
    otherwise: Joi.number().port().default(25),
  }),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().trim().allow('').optional(),
  SMTP_PASSWORD: Joi.string().trim().allow('').optional(),
  DEV_EMAIL_REROUTE_TO: Joi.string().trim().email().default('ritz.dacanay@the-fi-company.com'),
  MAIL_FROM: Joi.string().trim().default('noreply@the-fi-company.com'),
  MAIL_LOGO_URL: Joi.string()
    .trim()
    .uri()
    .default('https://the-fi-company.com/wp-content/uploads/2024/09/The-Fi-Company-Logo-Blue-1.png'),
  MAIL_DISCLAIMER_TEXT: Joi.string()
    .trim()
    .default('Confidentiality Notice: This email and any attachments are intended only for the designated recipient(s) and may contain confidential information. If you received this in error, please delete it and notify the sender immediately.'),
  IGT_TRANSFER_R200_TO: Joi.string().allow('').optional(),
  IGT_TRANSFER_Z024_TO: Joi.string().allow('').optional(),
  IGT_TRANSFER_Z024_CC: Joi.string().allow('').optional(),
  IGT_TRANSFER_LOGO_URL: Joi.string().uri().allow('').optional(),
});
