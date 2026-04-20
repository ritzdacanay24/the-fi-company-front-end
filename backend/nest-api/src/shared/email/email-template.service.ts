import { Injectable } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';

const Handlebars = require('handlebars');

@Injectable()
export class EmailTemplateService {
  constructor(private readonly configService: ConfigService) {
    this.registerPartials();
  }

  render(templateName: string, context: Record<string, unknown>): string {
    const templatePath = join(__dirname, 'templates', `${templateName}.hbs`);
    const source = readFileSync(templatePath, 'utf8');
    const compiled = Handlebars.compile(source);
    const sharedContext = {
      mailLogoUrl: this.configService.getOrThrow<string>('MAIL_LOGO_URL'),
      mailDisclaimerText: this.configService.getOrThrow<string>('MAIL_DISCLAIMER_TEXT'),
    };

    return compiled({
      ...sharedContext,
      ...context,
    });
  }

  private registerPartials(): void {
    const partialsDirectory = join(__dirname, 'templates', 'partials');
    if (!existsSync(partialsDirectory)) {
      return;
    }

    for (const fileName of readdirSync(partialsDirectory)) {
      if (!fileName.endsWith('.hbs')) {
        continue;
      }

      const partialName = fileName.replace(/\.hbs$/, '');
      const partialSource = readFileSync(join(partialsDirectory, fileName), 'utf8');
      Handlebars.registerPartial(partialName, partialSource);
    }
  }
}
