import { Component, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { TripDetailHeaderService } from "@app/core/api/field-service/trip-detail-header/trip-detail-header.service";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";
import { AddressSearchComponent } from "@app/shared/components/address-search/address-search.component";
import { JobSearchComponent } from "@app/shared/components/job-search/job-search.component";
import { ToastrService } from "ngx-toastr";

interface TripRecord {
  id: number;
  fsId: number | null;
  fs_travel_header_id: number | null;
  type_of_travel: string | null;
  address_name: string | null;
  address: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  confirmation: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  start_datetime_name: string | null;
  end_datetime_name: string | null;
  rental_car_driver: string | null;
  flight_in: string | null;
  flight_out: string | null;
  location_name: string | null;
  notes: string | null;
  email_sent?: string | null;
}

interface TripGroup {
  id: number;
  name: string;
  trips: TripRecord[];
}

interface TripHeader {
  id: number;
  group_name?: string | null;
  fsIds?: string | null;
  total_stops?: number | null;
}

@Component({
  standalone: true,
  imports: [SharedModule, AddressSearchComponent, JobSearchComponent],
  selector: "app-trip-itinerary-workflow",
  templateUrl: "./trip-itinerary-workflow.component.html",
  styleUrls: ["./trip-itinerary-workflow.component.scss"],
})
export class TripItineraryWorkflowComponent implements OnInit {
  constructor(
    private readonly api: TripDetailService,
    private readonly headerApi: TripDetailHeaderService,
    private readonly fb: FormBuilder,
    private readonly toastr: ToastrService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  readonly states = states;

  readonly travelTypes = [
    {
      value: "rental_car",
      label: "Rental Car",
      startLabel: "Pick Up Date/Time",
      endLabel: "Drop Off Date/Time",
      locationLabel: "Pick Up Location",
      icon: "mdi mdi-car-estate",
    },
    {
      value: "equipment",
      label: "Equipment",
      startLabel: "Drop Off Date/Time",
      endLabel: "Pick Up Date/Time",
      locationLabel: "Vendor",
      icon: "mdi mdi-tools",
    },
    {
      value: "hotel",
      label: "Hotel",
      startLabel: "Check In Date/Time",
      endLabel: "Check Out Date/Time",
      locationLabel: "Hotel Location",
      icon: "mdi mdi-bed-outline",
    },
    {
      value: "flight",
      label: "Flight",
      startLabel: "Flight Out Date/Time",
      endLabel: "Flight In Date/Time",
      locationLabel: "Flight Out Location",
      icon: "mdi mdi-airplane-takeoff",
    },
  ];

  isLoading = false;
  isSaving = false;
  showWorkflowGuide = false;
  showAdvancedDetails = false;
  loadErrorMessage = "";
  mode: "create" | "edit" = "create";
  searchText = "";
  selectedTripId: number | null = null;
  selectedGroupId: number | null = null;
  private initialGroupId: number | null = null;
  private initialTripId: number | null = null;

  allTrips: TripRecord[] = [];
  headerGroups: TripHeader[] = [];
  groups: TripGroup[] = [];
  newGroupName = "";
  selectedGroupNameDraft = "";

  form = this.fb.group({
    fsId: [null as number | null, Validators.required],
    fs_travel_header_id: [null as number | null],
    type_of_travel: ["flight", Validators.required],
    confirmation: [""],
    start_datetime: ["", Validators.required],
    end_datetime: ["", Validators.required],
    start_datetime_name: ["Flight Out Date/Time", Validators.required],
    end_datetime_name: ["Flight In Date/Time", Validators.required],
    location_name: ["Flight Out Location", Validators.required],
    rental_car_driver: [""],
    flight_out: [""],
    flight_in: [""],
    address_name: [""],
    address: [""],
    address1: [""],
    city: [""],
    state: [""],
    zip_code: [""],
    notes: [""],
  });

  async ngOnInit(): Promise<void> {
    const groupIdQuery = Number(this.route.snapshot.queryParamMap.get("group_id"));
    const tripIdQuery = Number(this.route.snapshot.queryParamMap.get("trip_id"));

    if (Number.isInteger(groupIdQuery) && groupIdQuery > 0) {
      this.initialGroupId = groupIdQuery;
    }

    if (Number.isInteger(tripIdQuery) && tripIdQuery > 0) {
      this.initialTripId = tripIdQuery;
    }

    this.form.controls.type_of_travel.valueChanges.subscribe((type) => {
      this.applyTypeDefaults(type || "flight");
    });

    this.applyTypeDefaults("flight");
    await this.loadTrips();
    this.applyInitialSelection();
  }

  async loadTrips(): Promise<void> {
    try {
      this.isLoading = true;
      this.loadErrorMessage = "";
      const [trips, headers] = await this.withTimeout(
        Promise.all([this.api.getAll(), this.headerApi.getAll()]),
        12000
      );
      this.allTrips = trips;
      this.headerGroups = headers as TripHeader[];
      this.rebuildGroups();
      this.syncSelectedGroupNameDraft();
    } catch (err) {
      this.groups = [];
      this.loadErrorMessage =
        "Unable to load groups right now. You can retry, or create and select a new group.";
      this.toastr.error("Unable to load trip itinerary data");
    } finally {
      this.isLoading = false;
    }
  }

  rebuildGroups(): void {
    const q = this.searchText.trim().toLowerCase();
    const source = this.allTrips.filter((trip) => {
      if (!q) return true;

      const text = [
        trip.id,
        trip.fsId,
        trip.fs_travel_header_id,
        trip.type_of_travel,
        trip.city,
        trip.state,
        trip.location_name,
        trip.address_name,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });

    const grouped = new Map<number, TripRecord[]>();

    for (const row of source) {
      const groupId = Number(row.fs_travel_header_id || 0);
      if (!groupId) continue;
      if (!grouped.has(groupId)) {
        grouped.set(groupId, []);
      }
      grouped.get(groupId)?.push(row);
    }

    const groupNameMap = new Map<number, string>();
    for (const header of this.headerGroups) {
      const id = Number(header.id || 0);
      if (!id) continue;
      const name = String(header.group_name || "").trim();
      if (name) {
        groupNameMap.set(id, name);
      }
    }

    const groupIds = new Set<number>([
      ...Array.from(grouped.keys()),
      ...this.headerGroups.map((header) => Number(header.id || 0)).filter(Boolean),
    ]);

    this.groups = Array.from(groupIds)
      .map((id) => {
        const trips = grouped.get(id) || [];
        const name = groupNameMap.get(id) || `Group ${id}`;

        return {
        id,
        name,
        trips: [...trips].sort(
          (a, b) =>
            new Date(a.start_datetime || "").getTime() -
            new Date(b.start_datetime || "").getTime()
        ),
      };
      })
      .filter((group) => {
        if (!q) return true;
        const indexText = `${group.name} ${group.id}`.toLowerCase();
        return indexText.includes(q) || group.trips.length > 0;
      })
      .sort((a, b) => b.id - a.id);

    if (
      this.selectedGroupId &&
      !this.groups.some((group) => group.id === this.selectedGroupId)
    ) {
      this.selectedGroupId = null;
      this.selectedTripId = null;
    }

  }

  get hasSelectedGroup(): boolean {
    return !!this.selectedGroupId;
  }

  get hasSelectedStop(): boolean {
    return !!this.selectedTripId;
  }

  get selectedGroupTrips(): TripRecord[] {
    const group = this.groups.find((item) => item.id === this.selectedGroupId);
    return group?.trips || [];
  }

  get selectedGroupName(): string {
    const group = this.groups.find((item) => item.id === this.selectedGroupId);
    return group?.name || "";
  }

  get selectedGroupCount(): number {
    return this.selectedGroupTrips.length;
  }

  get confirmedCount(): number {
    return this.selectedGroupTrips.filter((trip) => !!trip.email_sent).length;
  }

  isFieldInvalid(fieldName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[fieldName];
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  setCreateMode(groupId?: number): void {
    this.mode = "create";
    this.selectedTripId = null;
    this.showAdvancedDetails = false;

    this.form.reset({
      fsId: null,
      fs_travel_header_id: groupId || this.selectedGroupId || null,
      type_of_travel: "flight",
      confirmation: "",
      start_datetime: "",
      end_datetime: "",
      start_datetime_name: "Flight Out Date/Time",
      end_datetime_name: "Flight In Date/Time",
      location_name: "Flight Out Location",
      rental_car_driver: "",
      flight_out: "",
      flight_in: "",
      address_name: "",
      address: "",
      address1: "",
      city: "",
      state: "",
      zip_code: "",
      notes: "",
    });

    this.syncQueryParams();
    this.syncSelectedGroupNameDraft();
  }

  selectGroup(groupId: number): void {
    this.selectedGroupId = groupId;
    this.setCreateMode(groupId);
    this.syncSelectedGroupNameDraft();
  }

  changeGroup(): void {
    this.selectedGroupId = null;
    this.setCreateMode();
    this.syncQueryParams();
  }

  selectTrip(trip: TripRecord): void {
    this.mode = "edit";
    this.showAdvancedDetails = false;
    this.selectedTripId = trip.id;
    this.selectedGroupId = Number(trip.fs_travel_header_id || 0) || null;
    this.form.patchValue({
      fsId: trip.fsId,
      fs_travel_header_id: Number(trip.fs_travel_header_id || 0) || null,
      type_of_travel: trip.type_of_travel || "flight",
      confirmation: trip.confirmation || "",
      start_datetime: this.toDatetimeLocalValue(trip.start_datetime),
      end_datetime: this.toDatetimeLocalValue(trip.end_datetime),
      start_datetime_name: trip.start_datetime_name || "",
      end_datetime_name: trip.end_datetime_name || "",
      location_name: trip.location_name || "",
      rental_car_driver: trip.rental_car_driver || "",
      flight_out: trip.flight_out || "",
      flight_in: trip.flight_in || "",
      address_name: trip.address_name || "",
      address: trip.address || "",
      address1: trip.address1 || "",
      city: trip.city || "",
      state: trip.state || "",
      zip_code: trip.zip_code || "",
      notes: trip.notes || "",
    });

    this.syncQueryParams();
    this.syncSelectedGroupNameDraft();
  }

  getStatus(trip: TripRecord): "Confirmed" | "Booked" | "Pending" {
    if (trip.email_sent) return "Confirmed";
    if (trip.confirmation) return "Booked";
    return "Pending";
  }

  getStatusClass(trip: TripRecord): string {
    const status = this.getStatus(trip);
    if (status === "Confirmed") return "badge text-bg-success";
    if (status === "Booked") return "badge text-bg-warning";
    return "badge text-bg-secondary";
  }

  async createNewGroupAndUse(): Promise<void> {
    try {
      const requestedName = String(this.newGroupName || "").trim();
      const defaultName = `Trip Group ${new Date().toLocaleDateString()}`;
      const header = await this.headerApi.create({
        group_name: requestedName || defaultName,
      });
      const groupId = Number(header?.id || 0);
      if (!groupId) {
        this.toastr.error("Unable to create a new itinerary group");
        return;
      }

      this.selectedGroupId = groupId;
      this.newGroupName = "";
      this.form.patchValue({ fs_travel_header_id: groupId });
      await this.loadTrips();
      this.syncQueryParams();
      this.toastr.success(`Group ${groupId} created`);
    } catch (err) {
      this.toastr.error("Unable to create a new itinerary group");
    }
  }

  async saveSelectedGroupName(): Promise<void> {
    if (!this.selectedGroupId) return;

    const name = String(this.selectedGroupNameDraft || "").trim();
    if (!name) {
      this.toastr.warning("Group name cannot be empty");
      return;
    }

    try {
      await this.headerApi.update(this.selectedGroupId, { group_name: name });
      this.toastr.success("Group name updated");
      await this.loadTrips();
    } catch (err) {
      this.toastr.error("Unable to update group name");
    }
  }

  async emailTechForSelectedGroup(): Promise<void> {
    if (!this.selectedGroupId) {
      this.toastr.warning("Select a group first");
      return;
    }

    if (!this.selectedGroupTrips.length) {
      this.toastr.warning("No itinerary stops found in this group");
      return;
    }

    if (!confirm("Send trip itinerary email to assigned techs?")) return;

    try {
      await this.api.emailTripDetails(this.selectedGroupId, this.selectedGroupTrips);

      const now = new Date().toISOString();
      this.selectedGroupTrips.forEach((trip) => {
        trip.email_sent = now;
      });

      this.toastr.success("Trip itinerary email sent");
    } catch (err) {
      this.toastr.error("Unable to send trip itinerary email");
    }
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toastr.warning("Complete the required fields first");
      return;
    }

    try {
      this.isSaving = true;
      const payload = this.buildPayload();

      if (!payload["fs_travel_header_id"]) {
        const header = await this.headerApi.create({});
        payload["fs_travel_header_id"] = Number(header?.id || 0);
      }

      const fsId = Number(payload["fsId"] || 0);
      const groupConflict = await this.headerApi.multipleGroups(fsId);
      if (groupConflict && this.mode === "create") {
        this.toastr.error("This FSID cannot belong to multiple itinerary groups");
        this.isSaving = false;
        return;
      }

      let saved: any;
      if (this.mode === "edit" && this.selectedTripId) {
        saved = await this.api.update(this.selectedTripId, payload);
        this.toastr.success("Itinerary stop updated");
      } else {
        saved = await this.api.create(payload);
        this.toastr.success("Itinerary stop created");
      }

      await this.loadTrips();

      if (saved?.id) {
        const found = this.allTrips.find((trip) => trip.id === Number(saved.id));
        if (found) {
          this.selectTrip(found);
        }
      } else {
        this.setCreateMode(payload["fs_travel_header_id"] as number);
      }
    } catch (err) {
      this.toastr.error("Unable to save itinerary stop");
    } finally {
      this.isSaving = false;
    }
  }

  async deleteSelected(): Promise<void> {
    if (!this.selectedTripId) return;
    if (!confirm("Delete this itinerary stop?")) return;

    try {
      await this.api.delete(this.selectedTripId);
      this.toastr.success("Itinerary stop deleted");
      this.setCreateMode(this.selectedGroupId || undefined);
      await this.loadTrips();
    } catch (err) {
      this.toastr.error("Unable to delete itinerary stop");
    }
  }

  onJobSelected(job: any): void {
    this.form.patchValue({ fsId: Number(job?.id || 0) || null });
  }

  onAddressSelected(place: any): void {
    this.form.patchValue({
      address: place?.fullStreetName || "",
      city: place?.address?.localName || "",
      state: place?.address?.countrySubdivisionCode || "",
      zip_code: place?.address?.postalCode || "",
      address_name: place?.poi?.name || place?.address?.streetName || "",
    });
  }

  private applyTypeDefaults(type: string): void {
    const selected = this.travelTypes.find((item) => item.value === type);
    if (!selected) return;

    this.form.patchValue(
      {
        start_datetime_name: selected.startLabel,
        end_datetime_name: selected.endLabel,
        location_name: selected.locationLabel,
      },
      { emitEvent: false }
    );
  }

  private toDatetimeLocalValue(value: string | null | undefined): string {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private buildPayload(): Record<string, unknown> {
    const value = this.form.getRawValue();

    return {
      fsId: value.fsId ? Number(value.fsId) : null,
      fs_travel_header_id: value.fs_travel_header_id
        ? Number(value.fs_travel_header_id)
        : null,
      type_of_travel: value.type_of_travel,
      address_name: value.address_name || null,
      address: value.address || null,
      address1: value.address1 || null,
      city: value.city || null,
      state: value.state || null,
      zip_code: value.zip_code || null,
      start_datetime_name: value.start_datetime_name || null,
      end_datetime_name: value.end_datetime_name || null,
      start_datetime: value.start_datetime || null,
      end_datetime: value.end_datetime || null,
      confirmation: value.confirmation || null,
      location_name: value.location_name || null,
      flight_out: value.flight_out || null,
      flight_in: value.flight_in || null,
      rental_car_driver: value.rental_car_driver || null,
      notes: value.notes || null,
    };
  }

  private applyInitialSelection(): void {
    if (!this.initialGroupId) {
      return;
    }

    if (!this.groups.some((group) => group.id === this.initialGroupId)) {
      return;
    }

    this.selectedGroupId = this.initialGroupId;

    if (this.initialTripId) {
      const trip = this.selectedGroupTrips.find((item) => item.id === this.initialTripId);
      if (trip) {
        this.selectTrip(trip);
        return;
      }
    }

    this.setCreateMode(this.selectedGroupId);
    this.syncSelectedGroupNameDraft();
  }

  private syncQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: "merge",
      replaceUrl: true,
      queryParams: {
        group_id: this.selectedGroupId,
        trip_id: this.selectedTripId,
      },
    });
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Request timed out"));
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timeoutId);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private syncSelectedGroupNameDraft(): void {
    if (!this.selectedGroupId) {
      this.selectedGroupNameDraft = "";
      return;
    }

    const current = this.groups.find((group) => group.id === this.selectedGroupId);
    this.selectedGroupNameDraft = current?.name || "";
  }
}
