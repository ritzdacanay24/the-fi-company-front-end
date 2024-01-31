export function getFormValidationErrors(v = 0) {
  setTimeout( ()=> {
    const firstElementWithError = document.querySelector('.signature .is-invalid, .form-check-label .ng-invalid, .form-floating .ng-invalid,.is-invalid');
    if (firstElementWithError) {
      firstElementWithError.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  }, v);
}
