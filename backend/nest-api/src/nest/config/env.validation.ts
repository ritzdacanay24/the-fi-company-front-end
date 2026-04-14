import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string().allow('').optional(),
  QAD_DSN: Joi.string().required(),
  QAD_USER: Joi.string().required(),
  QAD_PASSWORD: Joi.string().required(),
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().port().default(25),
  SMTP_SECURE: Joi.boolean().optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().allow('').optional(),
  IGT_TRANSFER_R200_TO: Joi.string().allow('').optional(),
  IGT_TRANSFER_Z024_TO: Joi.string().allow('').optional(),
  IGT_TRANSFER_Z024_CC: Joi.string().allow('').optional(),
  IGT_TRANSFER_LOGO_URL: Joi.string().uri().allow('').optional(),
});
