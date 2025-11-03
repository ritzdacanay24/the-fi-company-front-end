import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '@environments/environment';
import {
  MindeeApiResponse,
  MindeeApiError,
  MindeeJobResponse,
  MindeeRequestOptions,
  ExpenseReceiptPrediction,
  InvoicePrediction,
  MindeeHttpStatus
} from './mindee-interfaces';

/**
 * Mindee API Service
 * Implements official Mindee API V2 integration according to their documentation
 * https://docs.mindee.com/integrations/api-reference
 */
@Injectable({
  providedIn: 'root'
})
export class MindeeService {
  private readonly baseUrl = 'https://api.mindee.net/v1';
  private readonly defaultRetries = 2;
  private readonly maxPollingAttempts = 60; // 60 attempts = 5 minutes with 5-second intervals

  constructor(private http: HttpClient) {}

  /**
   * Parse expense receipt using Mindee API V2 (Off-the-Shelf API)
   * @param file - The image file to analyze  
   * @param modelId - Not used for off-the-shelf API
   * @param options - Optional request parameters
   * @returns Promise with parsed expense receipt data
   */
  async parseExpenseReceipt(
    file: File,
    modelId?: string,
    options?: MindeeRequestOptions
  ): Promise<MindeeApiResponse<ExpenseReceiptPrediction>> {
    // Use custom trained model with your model ID
    const customModelId = 'c3254c99-5d36-4f4d-85b5-16066a62f865';
    return this.enqueueInference<ExpenseReceiptPrediction>(file, customModelId, options);
  }

  /**
   * Parse invoice using Mindee API V2 (Off-the-Shelf API)
   * @param file - The image/PDF file to analyze
   * @param modelId - Not used for off-the-shelf API
   * @param options - Optional request parameters
   * @returns Promise with parsed invoice data
   */
  async parseInvoice(
    file: File,
    modelId?: string,
    options?: MindeeRequestOptions
  ): Promise<MindeeApiResponse<InvoicePrediction>> {
    return this.parseDocument(file, 'invoices', 'v4', options);
  }

  /**
   * Parse document using Mindee's off-the-shelf API
   * @param file - The file to analyze
   * @param productName - Product name (e.g., 'expense_receipts', 'invoices')
   * @param version - API version (e.g., 'v5', 'v4')
   * @param options - Optional request parameters
   * @returns Promise with parsed document data
   */
  async parseDocument<T = any>(
    file: File,
    productName: string,
    version: string,
    options?: MindeeRequestOptions
  ): Promise<MindeeApiResponse<T>> {
    this.validateFile(file);

    const formData = new FormData();
    formData.append('document', file);

    // Mindee off-the-shelf API endpoint format: /v1/products/{account}/{product}/{version}/predict
    // For off-the-shelf products, account is 'mindee'
    const url = `${this.baseUrl}/products/mindee/${productName}/${version}/predict`;
    
    console.log('Mindee API Request:', {
      url,
      productName,
      version,
      fileSize: file.size,
      fileType: file.type
    });
    
    try {
      const response = await firstValueFrom(
        this.http.post<MindeeApiResponse<T>>(url, formData, {
          headers: this.buildHeaders()
        }).pipe(
          retry(this.defaultRetries),
          catchError(this.handleError.bind(this))
        )
      );

      console.log('Mindee API Response:', response);
      return response;
    } catch (error) {
      console.error('Mindee API Error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Enqueue inference using Mindee V2 API
   * @param file - The file to analyze
   * @param modelId - Model ID to use for inference
   * @param options - Optional request parameters
   * @returns Promise with inference results (after polling completion)
   */
  async enqueueInference<T = any>(
    file: File,
    modelId: string,
    options?: MindeeRequestOptions
  ): Promise<MindeeApiResponse<T>> {
    // Validate inputs
    this.validateFile(file);

    // Step 1: Enqueue the inference
    const jobResponse = await this.submitInferenceJob(file, modelId, options);
    
    // Step 2: Poll for completion
    const completedJob = await this.pollJobCompletion(jobResponse.job.id);
    
    // Step 3: Handle the completed result
    if (completedJob.inference) {
      // Job completed successfully - return the inference result directly
      console.log('Returning completed inference result');
      return completedJob.inference;
    } else if (completedJob.job) {
      // Still have job structure - check for failure
      throw new Error(`Job failed with status: ${completedJob.job.status}. Error: ${completedJob.job.error?.detail || 'Unknown error'}`);
    } else {
      throw new Error('Invalid response structure from polling');
    }
  }

  /**
   * Submit inference job to V2 API
   * @param file - The file to analyze
   * @param modelId - Model ID
   * @param options - Optional parameters
   * @returns Promise with job response
   */
  private async submitInferenceJob(
    file: File,
    modelId: string,
    options?: MindeeRequestOptions
  ): Promise<any> {
    const formData = this.buildV2FormData(file, modelId, options);
    const headers = this.buildHeaders();
    const url = 'https://api-v2.mindee.net/v2/inferences/enqueue';

    console.log('[Mindee] Enqueue URL:', url);
    console.log('[Mindee] Model ID:', modelId);

    try {
      const response = await firstValueFrom(
        this.http.post<any>(url, formData, { headers })
          .pipe(
            retry(this.defaultRetries),
            catchError(this.handleError.bind(this))
          )
      );

      console.log('Job submitted successfully:', response.job?.id);
      return response;
    } catch (error) {
      throw this.processError(error);
    }
  }

  /**
   * Poll job completion using V2 API
   * @param jobId - Job ID from enqueue response
   * @returns Promise with completed job information
   */
  private async pollJobCompletion(jobId: string): Promise<any> {
    const headers = this.buildHeaders();
    const url = `https://api-v2.mindee.net/v2/jobs/${jobId}`;
    
    let attempts = 0;
    
    while (attempts < this.maxPollingAttempts) {
      
      try {
        const response = await firstValueFrom(
          this.http.get<any>(url, { headers })
            .pipe(catchError(this.handleError.bind(this)))
        );
        
        // Handle both job status polling and completed inference response
        if (response.job) {
          // Still processing - response has job status
          console.log(`Job status: ${response.job.status}`);
          
          if (response.job.status === 'Processed' || response.job.status === 'Failed') {
            console.log(`Job completed with status: ${response.job.status}`);
            return response;
          }
        } else if (response.inference) {
          // Job completed - response contains the inference result
          console.log('Job completed, received inference result');
          return response;
        } else {
          console.error('Invalid polling response structure:', response);
          throw new Error(`Invalid polling response structure. Expected job or inference, got keys: ${Object.keys(response)}`);
        }
        
        // Wait 5 seconds before next poll
        await this.delay(5000);
        attempts++;
        
      } catch (error) {
        throw this.processError(error);
      }
    }
    
    throw new Error(`Job polling timeout after ${this.maxPollingAttempts} attempts`);
  }

  /**
   * Get inference result from result URL
   * @param resultUrl - URL to get the final inference result
   * @returns Promise with inference data
   */
  private async getInferenceResult<T = any>(resultUrl: string): Promise<MindeeApiResponse<T>> {
    const headers = this.buildHeaders();
    
    try {
      const response = await firstValueFrom(
        this.http.get<MindeeApiResponse<T>>(resultUrl, { headers })
          .pipe(
            retry(this.defaultRetries),
            catchError(this.handleError.bind(this))
          )
      );
      
      return response;
    } catch (error) {
      throw this.processError(error);
    }
  }

  /**
   * Utility method to create delays for polling
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build FormData for V2 API request
   */
  private buildV2FormData(file: File, modelId: string, options?: MindeeRequestOptions): FormData {
    const formData = new FormData();
    
    // Required fields for V2 API
    formData.append('model_id', modelId);
    formData.append('file', file, file.name);

    // Optional V2 API parameters
    if (options) {
      if (options.raw_text !== undefined) {
        formData.append('raw_text', String(options.raw_text));
      }
      if (options.polygon !== undefined) {
        formData.append('polygon', String(options.polygon));
      }
      if (options.confidence !== undefined) {
        formData.append('confidence', String(options.confidence));
      }
      if (options.rag !== undefined) {
        formData.append('rag', String(options.rag));
      }
      if (options.alias) {
        formData.append('alias', options.alias);
      }
      if (options.webhook_ids && options.webhook_ids.length > 0) {
        options.webhook_ids.forEach(id => formData.append('webhook_ids', id));
      }
    }

    return formData;
  }

  /**
   * Build proper HTTP headers for Mindee API
   */
  private buildHeaders(): HttpHeaders {
    const apiKey = this.getApiKey();
    
    return new HttpHeaders({
      'Authorization': apiKey  // Just the raw API key
      // Note: Don't set Content-Type for FormData - let browser handle it
    });
  }



  /**
   * Get API key from environment or throw error
   */
  private getApiKey(): string {
    const apiKey = environment.mindeeApiKey;
    
    if (!apiKey) {
      throw new Error(
        'Mindee API key not configured. Please set MINDEE_API_KEY in environment.'
      );
    }

    // Validate API key format
    if (!this.isValidApiKeyFormat(apiKey)) {
      throw new Error(
        'Invalid Mindee API key format. Expected format: md_xxxxxxxxxx'
      );
    }

    return apiKey;
  }

  /**
   * Validate Mindee API key format
   */
  private isValidApiKeyFormat(apiKey: string): boolean {
    // Mindee API keys typically start with 'md_' followed by alphanumeric characters
    // Relaxed validation to allow different key lengths
    return /^md_[A-Za-z0-9_-]{10,}$/.test(apiKey);
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    if (!file) {
      throw new Error('File is required');
    }

    // Check file size (max 25MB for Mindee)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum of 25MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Check file type
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/tiff',
      'image/heic',
      'application/pdf'
    ];

    if (!supportedTypes.includes(file.type.toLowerCase())) {
      throw new Error(`Unsupported file type: ${file.type}. Supported types: ${supportedTypes.join(', ')}`);
    }
  }



  /**
   * Validate V2 API response
   */
  private validateResponse(response: MindeeApiResponse): void {
    if (!response) {
      throw new Error('Empty response from Mindee API');
    }

    if (!response.inference) {
      throw new Error('Invalid response structure from Mindee API');
    }

    // V2 API doesn't have the api_request structure, validation is different
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred while calling Mindee API';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      // Server-side error for V2 API
      const mindeeError = error.error as MindeeApiError;
      
      switch (error.status) {
        case MindeeHttpStatus.UNAUTHORIZED:
          errorMessage = 'Mindee API authentication failed. Please verify your API key.';
          break;
        case MindeeHttpStatus.BAD_REQUEST:
          errorMessage = mindeeError?.detail || 'Bad request';
          break;
        case MindeeHttpStatus.NOT_FOUND:
          errorMessage = 'API endpoint not found';
          break;
        case MindeeHttpStatus.TOO_MANY_REQUESTS:
          errorMessage = 'Rate limit exceeded. Please try again later.';
          break;
        case MindeeHttpStatus.INTERNAL_SERVER_ERROR:
          errorMessage = 'Mindee server error. Please try again later.';
          break;
        case 422: // Unprocessable Content (common in V2 API)
          errorMessage = mindeeError?.detail || 'Validation error';
          break;
        default:
          errorMessage = mindeeError?.detail || `HTTP ${error.status}: ${error.statusText}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Process and format errors
   */
  private processError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error(`Unexpected error: ${JSON.stringify(error)}`);
  }

  /**
   * Utility method to extract confidence scores
   */
  extractConfidenceScores<T>(prediction: T): Record<string, number> {
    const scores: Record<string, number> = {};
    
    if (prediction && typeof prediction === 'object') {
      Object.entries(prediction).forEach(([key, value]) => {
        if (value && typeof value === 'object' && 'confidence' in value) {
          scores[key] = (value as any).confidence;
        }
      });
    }

    return scores;
  }

  /**
   * Check if prediction field meets confidence threshold
   */
  isConfident(fieldValue: any, threshold: number = 0.8): boolean {
    return fieldValue?.confidence >= threshold;
  }

  /**
   * Test API key validity by making a simple request
   * This can be used for debugging API key issues
   */
  async testApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Create a minimal test file (1x1 pixel PNG)
      const testBlob = new Blob([
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 8, 215, 99, 248, 15, 0, 0, 1, 0, 1, 0, 24, 221, 142, 60, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])
      ], { type: 'image/png' });
      
      const testFile = new File([testBlob], 'test.png', { type: 'image/png' });
      
      await this.parseExpenseReceipt(testFile);
      return { valid: true };
    } catch (error) {
      if (error instanceof Error) {
        return { 
          valid: false, 
          error: error.message 
        };
      }
      return { 
        valid: false, 
        error: 'Unknown error occurred while testing API key' 
      };
    }
  }
}