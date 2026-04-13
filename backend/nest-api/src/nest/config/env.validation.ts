import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string().allow('').optional(),
  QAD_DSN: Joi.string().required(),
  QAD_USER: Joi.string().required(),
  QAD_PASSWORD: Joi.string().required(),
});
