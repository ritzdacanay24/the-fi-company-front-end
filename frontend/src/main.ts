import { enableProdMode } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";

import { AppModule } from "./app/app.module";
import { environment } from "./environments/environment";

import { ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";

function suppressAgGridConsoleNoise(): void {
  const patterns = [
    "AG Grid Enterprise License",
    "Incompatible Software Version",
    "Please contact info@ag-grid.com to renew your license key",
  ];

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  const shouldSuppress = (args: unknown[]): boolean => {
    const text = args.map((arg) => String(arg ?? "")).join(" ");
    return patterns.some((pattern) => text.includes(pattern));
  };

  console.error = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    originalWarn(...args);
  };
}

suppressAgGridConsoleNoise();

ModuleRegistry.registerModules([AllEnterpriseModule]);

LicenseManager.setLicenseKey(environment.agKey);

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
