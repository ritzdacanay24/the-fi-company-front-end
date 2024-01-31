import { FormControl, ValidationErrors } from '@angular/forms';

export function getDirtyValues2(form: any) {
    let dirtyValues = {};

    Object.keys(form.controls)
        .forEach(key => {
            const currentControl = form.controls[key];
            if (currentControl.dirty) {
                if (currentControl.controls)
                    dirtyValues[key] = this.getDirtyValues(currentControl);
                else
                    dirtyValues[key] = currentControl.value;
            }
        });

    return dirtyValues;
}

export function getDirtyValues(cg: any) {
    let dirtyValues = {};  // initialize empty object
    Object.keys(cg.controls).forEach((c) => {

        let currentControl = cg.get(c)



        if (currentControl.dirty) {
            if (currentControl.controls) //check for nested controlGroups
                dirtyValues[c] = getDirtyValues(currentControl);  //recursion for nested controlGroups
            else
                dirtyValues[c] = currentControl.value;  //simple control
        }

    });
    return dirtyValues;
}

export function findInvalidControls(form) {
    const invalid = [];
    const controls = form.controls;
    for (const name in controls) {
        if (controls[name].invalid) {
            invalid.push(name.replace(/([A-Z])/g, ' $1')
                // uppercase the first character
                .replace(/^./, function (str) { return str.toUpperCase(); }));
        }
    }
    return invalid;
}

export function removeHtmlElements(text: string) {

    if (!text) return text;

    let without_html = text.replace(/<(?:.|\n)*?>/gm, ' ');

    return without_html;
}

export function getFormValidationErrors(form?) {
    let errorForm = [];
    Object.keys(form.controls).forEach(key => {
        const controlErrors: ValidationErrors = form.get(key).errors;
        if (controlErrors != null) {
            Object.keys(controlErrors).forEach(keyError => {
                let keyName = key.replace(/([A-Z])/g, ' $1')
                    // uppercase the first character
                    .replace(/^./, function (str) { return str.toUpperCase(); });
                errorForm.push(`${keyName} is ${keyError} => ErrValue: ${controlErrors[keyError]}`);
            });
        }
    });
    return errorForm;
}

export function must_be_email(control: FormControl) {
    var EMAIL_REGEXP = /^[a-z0-9!#$%&'*+\/=?^_`{|}~.-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
    if (control.value != "" && (control.value.length <= 5 || !EMAIL_REGEXP.test(control.value))) {
        return { "must_be_email": true };
    }
    return null;
}
