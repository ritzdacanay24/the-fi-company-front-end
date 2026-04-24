import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";

const url = "auth/twostep";

interface TwoStepResult {
  valid: boolean;
  status: string;
  status_code: number;
  twostep_token?: string | null;
  passCode?: string | null;
}

@Injectable({
  providedIn: "root",
})
export class TwostepService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  // 2FA is being retired; keep method contracts but avoid legacy endpoint calls.
  twoStepGenerateCode = async (_params: any): Promise<TwoStepResult> => ({
    valid: false,
    status: "disabled",
    status_code: 0,
    passCode: null,
  });

  validatetwoStepCode = async (_params: any): Promise<TwoStepResult> => ({
    valid: false,
    status: "disabled",
    status_code: 0,
    twostep_token: null,
  });

  validatetwoStepCodeAndPassCode = async (_params: any): Promise<TwoStepResult> => ({
    valid: false,
    status: "disabled",
    status_code: 0,
    twostep_token: null,
  });

  isTwostepEnabled = async () => 0;
}
