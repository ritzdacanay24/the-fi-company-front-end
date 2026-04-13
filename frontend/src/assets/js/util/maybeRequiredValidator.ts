import { AbstractControl, ValidatorFn, ValidationErrors, Validators } from "@angular/forms";

export const maybeRequiredValidator = (
  inputName: string,
  requiredWhen: (form: AbstractControl) => boolean
): ValidatorFn =>
  (form: AbstractControl): ValidationErrors | null => {
    let targetInput = form.get(inputName);
    if (targetInput) {
      let isRequired = requiredWhen(form);
      if (isRequired != targetInput.hasValidator(Validators.required)) {
        if (isRequired) {
          targetInput.addValidators(Validators.required);
        }
        else {
          targetInput.removeValidators(Validators.required);
        }
        targetInput.updateValueAndValidity({ onlySelf: true });
      }
    }
    return null;
  };
