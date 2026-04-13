import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '@app/core/api/field-service/user.service';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-org-chart-share-modal',
  templateUrl: './org-chart-share-modal.component.html',
  styleUrls: ['./org-chart-share-modal.component.scss']
})
export class OrgChartShareModalComponent implements OnInit {
  shareForm: FormGroup;
  isGenerating = false;
  generatedLink: string | null = null;
  tokenData: any = null;
  copiedToClipboard = false;
  activeTokens: any[] = [];
  loadingTokens = true;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthenticationService,
    private toastr: ToastrService
  ) {
    this.shareForm = this.fb.group({
      requirePassword: [false],
      password: [''],
      confirmPassword: [''],
      expiryHours: [24, [Validators.required, Validators.min(1), Validators.max(168)]]
    });
  }

  ngOnInit() {
    this.loadActiveTokens();

    // Add password validation when requirePassword is checked
    this.shareForm.get('requirePassword')?.valueChanges.subscribe(requirePassword => {
      const passwordControl = this.shareForm.get('password');
      const confirmPasswordControl = this.shareForm.get('confirmPassword');
      
      if (requirePassword) {
        passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
        confirmPasswordControl?.setValidators([Validators.required]);
      } else {
        passwordControl?.clearValidators();
        confirmPasswordControl?.clearValidators();
        passwordControl?.setValue('');
        confirmPasswordControl?.setValue('');
      }
      
      passwordControl?.updateValueAndValidity();
      confirmPasswordControl?.updateValueAndValidity();
    });
  }

  get passwordsMatch(): boolean {
    const password = this.shareForm.get('password')?.value;
    const confirmPassword = this.shareForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  async loadActiveTokens() {
    this.loadingTokens = true;
    try {
      const response = await this.userService.listOrgChartTokens().toPromise();
      this.activeTokens = response.tokens || [];
    } catch (error) {
      console.error('Error loading active tokens:', error);
      this.toastr.error('Failed to load active share links');
    } finally {
      this.loadingTokens = false;
    }
  }

  async generateShareLink() {
    if (!this.shareForm.valid) {
      this.toastr.warning('Please fill out all required fields');
      return;
    }

    if (this.shareForm.get('requirePassword')?.value && !this.passwordsMatch) {
      this.toastr.warning('Passwords do not match');
      return;
    }

    this.isGenerating = true;

    try {
      const currentUser = this.authService.currentUserValue;
      const formValue = this.shareForm.value;

      const params = {
        password: formValue.requirePassword ? formValue.password : null,
        expiryHours: formValue.expiryHours,
        userId: currentUser?.id
      };

      const response = await this.userService.generateOrgChartToken(params).toPromise();

      if (response.success) {
        this.generatedLink = response.shareUrl;
        this.tokenData = response;
        this.copiedToClipboard = false;
        this.toastr.success('Share link generated successfully!');
        
        // Reload active tokens list
        await this.loadActiveTokens();
      } else {
        this.toastr.error('Failed to generate share link');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      this.toastr.error('An error occurred while generating the share link');
    } finally {
      this.isGenerating = false;
    }
  }

  async copyToClipboard() {
    if (!this.generatedLink) return;

    try {
      await navigator.clipboard.writeText(this.generatedLink);
      this.copiedToClipboard = true;
      this.toastr.success('Link copied to clipboard!');
      
      setTimeout(() => {
        this.copiedToClipboard = false;
      }, 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
      this.toastr.error('Failed to copy link to clipboard');
    }
  }

  async revokeToken(tokenId: number) {
    if (!confirm('Are you sure you want to revoke this share link? It will no longer be accessible.')) {
      return;
    }

    try {
      await this.userService.revokeOrgChartToken(tokenId).toPromise();
      this.toastr.success('Share link revoked successfully');
      await this.loadActiveTokens();
    } catch (error) {
      console.error('Error revoking token:', error);
      this.toastr.error('Failed to revoke share link');
    }
  }

  resetForm() {
    this.shareForm.reset({
      requirePassword: false,
      password: '',
      confirmPassword: '',
      expiryHours: 24
    });
    this.generatedLink = null;
    this.tokenData = null;
    this.copiedToClipboard = false;
  }
}
