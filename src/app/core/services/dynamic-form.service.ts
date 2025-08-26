import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';

// Enterprise-grade form schema interfaces
export interface FormSchema {
  version: string;
  metadata: {
    title: string;
    description: string;
    department: string;
    effectiveDate: string;
  };
  sections: FormSection[];
  validationRules?: GlobalValidationRule[];
  conditionalLogic?: ConditionalRule[];
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  collapsible?: boolean;
  fields: FormField[];
}

export interface FormField {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: SelectOption[];
  conditionalDisplay?: ConditionalDisplay;
  helpText?: string;
  gridColumn?: number; // For responsive layout
}

export type FieldType = 
  | 'text' 
  | 'email' 
  | 'number' 
  | 'date' 
  | 'datetime'
  | 'select' 
  | 'multiselect'
  | 'radio' 
  | 'checkbox'
  | 'textarea' 
  | 'file'
  | 'signature'
  | 'location'
  | 'photo';

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  metadata?: any;
}

export interface ConditionalDisplay {
  dependsOn: string;
  condition: 'equals' | 'notEquals' | 'contains' | 'greaterThan';
  value: any;
  action: 'show' | 'hide' | 'require' | 'disable';
}

export interface ConditionalRule {
  id: string;
  description: string;
  conditions: ConditionalDisplay[];
  actions: ConditionalAction[];
}

export interface ConditionalAction {
  type: 'show' | 'hide' | 'require' | 'setValue' | 'calculate';
  targetField: string;
  value?: any;
  formula?: string;
}

export interface GlobalValidationRule {
  id: string;
  description: string;
  type: 'cross-field' | 'business-rule';
  rule: string; // JavaScript expression or function name
  errorMessage: string;
}

// Example: Enterprise QIR Form Schema (QA-QIR-001, Rev 3)
export const QIR_FORM_SCHEMA_V3: FormSchema = {
  version: "v3.0",
  metadata: {
    title: "Quality Incident Report Form",
    description: "Comprehensive incident reporting with enhanced photo and severity tracking",
    department: "Quality Assurance",
    effectiveDate: "2025-08-06"
  },
  sections: [
    {
      id: "contact",
      title: "Contact Information",
      description: "Provide your contact details for follow-up communication",
      fields: [
        {
          name: "firstName",
          type: "text",
          label: "First Name",
          required: true,
          validation: { minLength: 2, maxLength: 50 },
          gridColumn: 6
        },
        {
          name: "lastName", 
          type: "text",
          label: "Last Name",
          required: true,
          validation: { minLength: 2, maxLength: 50 },
          gridColumn: 6
        },
        {
          name: "email",
          type: "email",
          label: "Business Email",
          required: true,
          validation: { pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
          gridColumn: 12
        }
      ]
    },
    {
      id: "incident",
      title: "Incident Details",
      description: "Describe when and where the quality issue occurred",
      fields: [
        {
          name: "reportedDate",
          type: "date",
          label: "Customer Reported Date",
          required: true,
          gridColumn: 6
        },
        {
          name: "severity",
          type: "select",
          label: "Severity Level",
          required: true,
          options: [
            { value: "low", label: "Low - Minor issue, no impact" },
            { value: "medium", label: "Medium - Moderate impact" },
            { value: "high", label: "High - Significant impact" },
            { value: "critical", label: "Critical - System failure" }
          ],
          gridColumn: 6
        },
        {
          name: "priority",
          type: "select", 
          label: "Priority",
          required: true,
          options: [
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "urgent", label: "Urgent" }
          ],
          conditionalDisplay: {
            dependsOn: "severity",
            condition: "equals",
            value: "critical",
            action: "require"
          },
          gridColumn: 6
        },
        {
          name: "location",
          type: "text",
          label: "Location of Issue",
          required: true,
          placeholder: "Specify where the issue occurred",
          gridColumn: 8
        },
        {
          name: "facilityName",
          type: "text",
          label: "Facility Name", 
          required: true,
          placeholder: "Enter facility name",
          gridColumn: 4
        }
      ]
    },
    {
      id: "evidence",
      title: "Evidence & Documentation",
      description: "Upload photos and supporting documentation",
      fields: [
        {
          name: "photos",
          type: "photo",
          label: "Incident Photos",
          required: false,
          validation: { max: 10 },
          helpText: "Upload up to 10 photos showing the incident",
          conditionalDisplay: {
            dependsOn: "severity",
            condition: "equals", 
            value: "high",
            action: "require"
          },
          gridColumn: 12
        },
        {
          name: "description",
          type: "textarea",
          label: "Detailed Description",
          required: true,
          placeholder: "Provide a detailed description of the incident...",
          validation: { minLength: 20, maxLength: 2000 },
          gridColumn: 12
        }
      ]
    }
  ],
  conditionalLogic: [
    {
      id: "critical-severity-auto-priority",
      description: "Auto-set priority to urgent when severity is critical",
      conditions: [
        {
          dependsOn: "severity",
          condition: "equals",
          value: "critical",
          action: "show"
        }
      ],
      actions: [
        {
          type: "setValue",
          targetField: "priority", 
          value: "urgent"
        },
        {
          type: "require",
          targetField: "photos"
        }
      ]
    }
  ],
  validationRules: [
    {
      id: "future-date-validation",
      description: "Reported date cannot be in the future",
      type: "business-rule",
      rule: "new Date(formData.reportedDate) <= new Date()",
      errorMessage: "Reported date cannot be in the future"
    }
  ]
};

@Injectable({
  providedIn: 'root'
})
export class DynamicFormService {
  
  constructor(private fb: FormBuilder) {}

  /**
   * Creates a reactive form from schema definition
   * Enterprise pattern: Schema → Form generation
   */
  createFormFromSchema(schema: FormSchema): FormGroup {
    const formControls: { [key: string]: AbstractControl } = {};
    
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        const validators = this.buildValidators(field);
        const defaultValue = this.getDefaultValue(field);
        
        formControls[field.name] = this.fb.control(defaultValue, validators);
      });
    });
    
    const form = this.fb.group(formControls);
    
    // Apply conditional logic
    this.applyConditionalLogic(form, schema);
    
    return form;
  }

  /**
   * Validates form against schema business rules
   * Enterprise pattern: Centralized validation
   */
  validateFormData(formData: any, schema: FormSchema): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Apply global validation rules
    schema.validationRules?.forEach(rule => {
      if (!this.evaluateRule(rule.rule, formData)) {
        errors.push({
          field: null,
          message: rule.errorMessage,
          type: 'business-rule'
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Migrates form data between schema versions
   * Enterprise pattern: Data migration strategy
   */
  migrateFormData(data: any, fromVersion: string, toVersion: string): any {
    // Implementation for data migration between schema versions
    // This is crucial for maintaining backward compatibility
    return data; // Simplified for example
  }

  private buildValidators(field: FormField): any[] {
    const validators = [];
    
    if (field.required) {
      validators.push(Validators.required);
    }
    
    if (field.validation) {
      if (field.validation.minLength) {
        validators.push(Validators.minLength(field.validation.minLength));
      }
      if (field.validation.maxLength) {
        validators.push(Validators.maxLength(field.validation.maxLength));
      }
      if (field.validation.pattern) {
        validators.push(Validators.pattern(field.validation.pattern));
      }
    }
    
    return validators;
  }

  private getDefaultValue(field: FormField): any {
    switch (field.type) {
      case 'checkbox': return false;
      case 'multiselect': return [];
      default: return '';
    }
  }

  private applyConditionalLogic(form: FormGroup, schema: FormSchema): void {
    // Subscribe to form value changes and apply conditional logic
    form.valueChanges.subscribe(values => {
      schema.conditionalLogic?.forEach(rule => {
        // Evaluate conditions and apply actions
        const conditionsMet = rule.conditions.every(condition => 
          this.evaluateCondition(condition, values)
        );
        
        if (conditionsMet) {
          rule.actions.forEach(action => {
            this.applyAction(form, action, values);
          });
        }
      });
    });
  }

  private evaluateCondition(condition: ConditionalDisplay, values: any): boolean {
    const fieldValue = values[condition.dependsOn];
    
    switch (condition.condition) {
      case 'equals': return fieldValue === condition.value;
      case 'notEquals': return fieldValue !== condition.value;
      case 'contains': return fieldValue?.includes(condition.value);
      case 'greaterThan': return fieldValue > condition.value;
      default: return false;
    }
  }

  private applyAction(form: FormGroup, action: ConditionalAction, values: any): void {
    const control = form.get(action.targetField);
    if (!control) return;
    
    switch (action.type) {
      case 'setValue':
        control.setValue(action.value);
        break;
      case 'require':
        control.setValidators([Validators.required, ...control.validator ? [control.validator] : []]);
        control.updateValueAndValidity();
        break;
      // Add more action types as needed
    }
  }

  private evaluateRule(rule: string, formData: any): boolean {
    // Safe evaluation of business rules
    // In production, use a proper expression evaluator
    try {
      return new Function('formData', `return ${rule}`)(formData);
    } catch {
      return true; // Fail safe
    }
  }
}

// Supporting interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string | null;
  message: string;
  type: 'validation' | 'business-rule';
}
