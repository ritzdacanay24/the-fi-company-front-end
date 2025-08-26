import { Component, EventEmitter, Input, Output, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { SerialNumberService } from "../services/serial-number.service";
import { RealTimeSerialNumberService } from "../services/real-time-serial-number.service";
import { NgSelectModule } from "@ng-select/ng-select";
import { AuthenticationService } from "@app/core/services/auth.service";
import { Subscription } from "rxjs";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
  ],
  providers: [RealTimeSerialNumberService],
  selector: "app-igt-form",
  templateUrl: "./igt-form.component.html",
  styleUrls: ["./igt-form.component.scss"],
})
export class IgtFormComponent implements OnDestroy {
  constructor(
    private fb: FormBuilder,
    private serialNumberService: SerialNumberService,
    private realTimeSerialService: RealTimeSerialNumberService,
    private authService: AuthenticationService,
    private cdr: ChangeDetectorRef
  ) {}

  availableSerialNumbers: any[] = [];
  isLoadingSerials = false;
  selectedSerialNumber: string = '';
  private subscriptions: Subscription[] = [];
  private currentUser: any;

  async ngOnInit(): Promise<void> {
    this.setFormEmitter.emit(this.form);
    this.currentUser = this.authService.currentUserValue;
    
    // Set current user ID for WebSocket service (ensure it's a string)
    this.realTimeSerialService.setCurrentUserId(String(this.currentUser.id));
    
    // Load initial data
    await this.loadAvailableSerialNumbers();
    
    // Subscribe to real-time updates
    this.subscribeToRealTimeUpdates();
    
    // Setup form change listener
    this.setupSerialNumberChangeListener();
  }

  subscribeToRealTimeUpdates() {
    const subscription = this.realTimeSerialService.getAvailableSerialNumbers().subscribe(
      (serialNumbers) => {
        console.log('Component received real-time serial numbers update:', serialNumbers.length, 'serials');
        console.log('First few serials with status:', serialNumbers.slice(0, 3));
        this.availableSerialNumbers = serialNumbers;
        
        // Force change detection to ensure ng-select updates
        this.cdr.detectChanges();
      }
    );
    this.subscriptions.push(subscription);
  }

  setupSerialNumberChangeListener() {
    const subscription = this.form.get('serial_number')?.valueChanges.subscribe((selectedValue) => {
      console.log('Serial number changed:', { previous: this.selectedSerialNumber, new: selectedValue });
      
      if (selectedValue && selectedValue !== this.selectedSerialNumber) {
        // Only notify others that this serial number is selected
        // DO NOT release the previous one - user might change their mind
        console.log('Selecting new serial number:', selectedValue);
        this.realTimeSerialService.selectSerialNumber(
          selectedValue, 
          String(this.currentUser.id), 
          this.currentUser.full_name
        );
        
        // Update our tracking variable
        this.selectedSerialNumber = selectedValue;
      } else if (!selectedValue && this.selectedSerialNumber) {
        // Only release when explicitly cleared (not when changing to another)
        console.log('Clearing selection:', this.selectedSerialNumber);
        this.realTimeSerialService.releaseSerialNumber(
          this.selectedSerialNumber, 
          String(this.currentUser.id)
        );
        this.selectedSerialNumber = '';
      }
    });
    
    if (subscription) {
      this.subscriptions.push(subscription);
    }
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({
    time_stamp: [""],
    wo_number: [""],
    property_site: [""],
    igt_part_number: [""],
    eyefi_part_number: [""],
    inspector_name: [""],
    generated_IGT_asset: [""],
    serial_number: ["", Validators.required],
    igt_serial_number: [""],
    last_update: [""],
    active: [1],
    notes: [""],
    created_by: "",
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  async loadAvailableSerialNumbers() {
    try {
      this.isLoadingSerials = true;
      const serialNumbers = await this.serialNumberService.getAvailable('gaming', 200);
      this.availableSerialNumbers = serialNumbers;
      
      // Set the initial data in the real-time service
      this.realTimeSerialService.setAvailableSerialNumbers(serialNumbers);
      
      this.isLoadingSerials = false;
    } catch (error) {
      console.error('Error loading available serial numbers:', error);
      this.availableSerialNumbers = [];
      this.isLoadingSerials = false;
    }
  }

  ngOnDestroy() {
    // Release any selected serial number when component is destroyed
    // This ensures that if user navigates away, the serial becomes available again
    if (this.selectedSerialNumber) {
      this.realTimeSerialService.releaseSerialNumber(
        this.selectedSerialNumber, 
        String(this.currentUser?.id || 'unknown')
      );
    }
    
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Method to be called when form is actually submitted and asset is created
  onAssetCreated() {
    if (this.selectedSerialNumber) {
      // Notify that this serial number is now permanently used
      this.realTimeSerialService.useSerialNumber(
        this.selectedSerialNumber,
        String(this.currentUser.id)
      );
    }
  }
}
