import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3002),
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
  TOMTOM_API_KEY: Joi.string().trim().allow('').optional(),
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
  SMTP_CONNECTION_TIMEOUT_MS: Joi.number().integer().min(1000).default(10000),
  SMTP_GREETING_TIMEOUT_MS: Joi.number().integer().min(1000).default(10000),
  SMTP_SOCKET_TIMEOUT_MS: Joi.number().integer().min(1000).default(15000),
  SMTP_USER: Joi.string().trim().allow('').optional(),
  SMTP_PASSWORD: Joi.string().trim().allow('').optional(),
  MAIL_TRANSPORT: Joi.alternatives().conditional('NODE_ENV', {
    is: 'development',
    then: Joi.string().valid('smtp', 'sendmail').default('smtp'),
    otherwise: Joi.string().valid('smtp', 'sendmail').default('sendmail'),
  }),
  SENDMAIL_PATH: Joi.string().trim().default('/usr/sbin/sendmail'),
  SENDMAIL_NEWLINE: Joi.string().valid('unix', 'windows').default('unix'),
  DEV_EMAIL_REROUTE_TO: Joi.string().trim().email().default('ritz.dacanay@the-fi-company.com'),
  MAIL_FROM: Joi.string().trim().default('noreply@the-fi-company.com'),
  MAIL_LOGO_URL: Joi.string()
    .trim()
    .uri()
    .default('https://the-fi-company.com/wp-content/uploads/2024/09/The-Fi-Company-Logo-Blue-1.png'),
  MAIL_SIGNATURE_IMAGE_URL: Joi.string()
    .trim()
    .uri()
    .default('https://dashboard.eye-fi.com/test/signatures/Picture1.png'),
  MAIL_DISCLAIMER_TEXT: Joi.string()
    .trim()
    .default('Confidentiality Notice: This email and any attachments are intended only for the designated recipient(s) and may contain confidential information. If you received this in error, please delete it and notify the sender immediately.'),
  FORKLIFT_INSPECTION_LEGACY_URL: Joi.string()
    .trim()
    .uri()
    .default('https://dashboard.eye-fi.com/server/ApiV2/forklift-inspection/index'),
  VEHICLE_INSPECTION_LEGACY_URL: Joi.string()
    .trim()
    .uri()
    .default('https://dashboard.eye-fi.com/server/ApiV2/vehicle-inspection/index'),
  IGT_TRANSFER_R200_TO: Joi.string().allow('').optional(),
  IGT_TRANSFER_Z024_TO: Joi.string().allow('').optional(),
  IGT_TRANSFER_Z024_CC: Joi.string().allow('').optional(),
  IGT_TRANSFER_LOGO_URL: Joi.string().uri().allow('').optional(),
  MATERIAL_REQUEST_NOTIFY_TO: Joi.string().allow('').optional(),
  MATERIAL_REQUEST_NOTIFY_CC: Joi.string().allow('').optional(),
  // TODO(legacy-compat): These legacy auth defaults exist for old website compatibility.
  // Remove/simplify APP_* and legacy fallback keys after full migration to the new website.
  APP_HASH_PASS: Joi.string().trim().default('sha256'),
  APP_SECRET_KEY: Joi.string().trim().default('w<$4c$Hmd%/*]`Oom>(hdXW|0M=X={we6;Mpvtg+V.o<$|#_}qG(GaVDEsn,~*4i'),
  APP_PUBLIC_SECRET_KEY: Joi.string().trim().optional(),
  APP_PRIVATE_POSTMAN: Joi.string().trim().optional(),
  APP_NAME: Joi.string().trim().default('THE-FI-COMPANY'),
  LEGACY_JWT_HS512_SECRET: Joi.string().trim().default('fne&9j^4kw1yxyyc)b-9qr9$7n#v2poa^ml!0b_5nut%z0hb)f'),
  JWT_SECRET: Joi.string().trim().default('w<$4c$Hmd%/*]`Oom>(hdXW|0M=X={we6;Mpvtg+V.o<$|#_}qG(GaVDEsn,~*4i'),
  JWT_REFRESH_SECRET: Joi.string().trim().optional(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
});
