import { FormControl, FormGroup, ɵElement } from "@angular/forms";

export type ControlsOf<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends Record<any, any>
  ? FormGroup<ControlsOf<T[K]>>
  : FormControl<T[K]>;
};

//https://stackoverflow.com/questions/72507263/angular-14-strictly-typed-reactive-forms-how-to-type-formgroup-model-using-exi
export type MyFormGroup<T> = FormGroup<{ [K in keyof T]: ɵElement<T[K], null>; }>;


