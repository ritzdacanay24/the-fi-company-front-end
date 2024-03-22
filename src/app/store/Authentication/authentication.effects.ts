import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, switchMap, catchError, exhaustMap, tap } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { AuthenticationService } from '../../core/services/auth.service';
import { login, loginSuccess, loginFailure, logout, logoutSuccess, Register} from './authentication.actions';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { THE_FI_COMPANY_CURRENT_USER } from '@app/core/guards/admin.guard';

@Injectable()
export class AuthenticationEffects {

  Register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(Register),
      exhaustMap(({ email, first_name, password }) =>
        this.AuthenticationService.register(email, first_name, password).pipe(
          map((user) => {
            this.router.navigate(['/auth/login']);
            return loginSuccess({ user });
          }),
          catchError((error) => of(loginFailure({ error })))
        )
      )
    )
  );

  login$ = createEffect(() =>
  this.actions$.pipe(
    ofType(login),
    exhaustMap(({ email, password }) => {
      if (environment.defaultauth === "fakebackend") {
        return this.AuthenticationService.login(email, password).pipe(
          map((user) => {
            if (user.status === 'success') {
              localStorage.setItem('toast', 'true');
              localStorage.setItem(THE_FI_COMPANY_CURRENT_USER, JSON.stringify(user.data));
              localStorage.setItem('token', user.token);
              this.router.navigate(['/']);
            }
            return loginSuccess({ user });
          }),
          catchError((error) => of(loginFailure({ error })), // Closing parenthesis added here
        ));
      } else if (environment.defaultauth === "firebase") {
        return of(); // Return an observable, even if it's empty
      } else {
        return of(); // Return an observable, even if it's empty
      }
    })
  )
);

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(logout),
      tap(() => {
        // Perform any necessary cleanup or side effects before logging out
      }),
      exhaustMap(() => of(logoutSuccess()))
    )
  );

  constructor(
    @Inject(Actions) private actions$: Actions,
    private AuthenticationService: AuthenticationService,
    private router: Router) { }

}