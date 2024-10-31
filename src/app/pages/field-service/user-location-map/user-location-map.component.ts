import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import {
  NgbAccordionModule,
  NgbCollapseModule,
  NgbDropdownModule,
} from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { SchedulerService } from "@app/core/api/field-service/scheduler.service";
/* @ts-ignore */
import * as tt from "@tomtom-international/web-sdk-maps";
import { environment } from "@environments/environment";
import { RootReducerState } from "@app/store";
import { Store } from "@ngrx/store";
import { JobModalService } from "../job/job-modal-edit/job-modal.service";
import { FlatpickrModule } from "angularx-flatpickr";
import moment from "moment";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { PropertyService } from "@app/core/api/field-service/property.service";
import { GeoLocationTrackerService } from "@app/core/api/field-service/geoLocationTracker";

/**
 * A few things needs to happen.
 * We need the starting location first. Once we get the starting location, then we can pull addresses near that location.
 *
 * If we already hav
 *
 */

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    NgbAccordionModule,
    NgbCollapseModule,
    FlatpickrModule,
    DateRangeComponent,
  ],
  selector: "app-user-location-map",
  encapsulation: ViewEncapsulation.None,
  templateUrl: `./user-location-map.component.html`,
})
export class UserLocationMapComponent implements OnInit {
  breadCrumbItems!: Array<{}>;
  public Collapsed = false;
  public HCollapsed = false;
  public DownCollapsed = false;
  public FilterCollapsed = false;
  public InlineCollapsed = false;
  public BlockCollapsed = false;
  public firstColleaps = false;
  public secondColleaps = false;
  public bothColleaps = false;

  identify(index, item) {
    return item.properties.id;
  }

  @Input() typeOfView: "Website" | "Creorx" | "attorney" = "Website";

  @Input() radius: number = 10;

  @Input() cluster: boolean = false;

  @Input() mapHeight: string = "map";

  @Input() markersArray: any[] = [];

  @Input() is_excluded = "ALL";

  @Input() sortValue = "Nearest";

  @Input() data: any;

  @Input() dataSearch: any[] = [];

  @Input() NPI: number;

  @Input() pop_up: any;

  @Input() _marker: any;

  @Input() map: tt.Map | any;

  @Input() clientAddress = `Las vegas, NV`;

  @Input() searchAddress = "Pharmacy";

  @Input() selectPharmacy: Function;

  @Input() displayAdditionalInfo: boolean = false;

  @Input() editPharmacy: Function;

  @Input() currentUserLat: any;
  @Input() currentUserLng: any;
  @Input() displayNetwork = false;

  geoTurnedOn: any = "";
  geoJson;
  markersOnTheMap = {};

  dateFrom = moment().subtract('30', 'days').format("YYYY-MM-DD");
  dateTo = moment().format("YYYY-MM-DD");
  dateRange1 = [this.dateFrom, this.dateTo];

  dateChanged($event) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];

    this.getData();
    //this.getProperties()
    //this.getList()
  }

  currentDate: any;

  collapsed = true;
  collapseExpand() {
    this.collapsed = this.collapsed ? false : true;
  }

  constructor(
    private api: SchedulerService,
    private propertyService: PropertyService,
    private store: Store<RootReducerState>,
    private jobModalEditService: JobModalService,
    private geoLocationTrackerService: GeoLocationTrackerService
  ) {}

  @Input() options = [
    {
      value: "custom",
      text: "Custom",
    },
    {
      value: [moment().format("YYYY-MM-DD"), moment().format("YYYY-MM-DD")],
      text: "Today",
    },
    {
      value: [
        moment().add(1, "days").format("YYYY-MM-DD"),
        moment().subtract(1, "days").format("YYYY-MM-DD"),
      ],
      text: "Tomorrow",
    },
    {
      value: [
        moment().startOf("week").format("YYYY-MM-DD"),
        moment().endOf("week").format("YYYY-MM-DD"),
      ],
      text: "This week",
    },
    {
      value: [
        moment().startOf("month").format("YYYY-MM-DD"),
        moment().endOf("month").format("YYYY-MM-DD"),
      ],
      text: "This month",
    },
    {
      value: [
        moment().add(1, "months").startOf("month").format("YYYY-MM-DD"),
        moment().add(1, "months").endOf("month").format("YYYY-MM-DD"),
      ],
      text: "Next month",
    },
    {
      value: [
        moment().add(1, "days").format("YYYY-MM-DD"),
        moment().add(6, "months").endOf("month").format("YYYY-MM-DD"),
      ],
      text: "Next 6 months",
    },
    {
      value: [
        moment().startOf("year").format("YYYY-MM-DD"),
        moment().format("YYYY-MM-DD"),
      ],
      text: "YTD",
    },
  ];

  scroll = (id: number | string) => {
    if (!id) return;

    //let el = document.getElementById();

    let el = document.getElementById("user-" + id.toString());

    setTimeout(() => {
      el[0]?.scrollTo({ top: 0 });
    }, 500);
  };

  createMarker = (
    position: any,
    color: string,
    popupText: any | any,
    showPopup?,
    index?
  ) => {
    if (this._marker) this._marker.remove();

    var markerElement = document.createElement("div");

    markerElement.className = "marker";
    var markerContentElement = document.createElement("div");
    markerContentElement.className = `marker-content`;
    markerContentElement.style.backgroundColor = color;
    markerContentElement.style.color = "#fff";
    markerContentElement.style.borderColor =
      popupText.type_of == "event" ? "black" : " #fff";
    markerElement.appendChild(markerContentElement);

    var iconElement = document.createElement("div");
    iconElement.className = "marker-icon text-white";

    // let img = document.createElement('img');
    // img.src = popupText.image
    // img.width = 20; // Set the width to 300 pixels
    markerContentElement.innerHTML =
      popupText.type_of == "event"
        ? "<span style='margin-left:6px;margin-bottom:15px;transform: rotate(90deg);'>EV</span>"
        : " ";
    // markerContentElement.appendChild(img);

    markerContentElement.appendChild(iconElement);

    markerElement.addEventListener("click", (e) => {
      this.fs_scheduler_id = popupText.user_id;
      this.activeIds = popupText.timestamp;
    });

    let d = `
<div class="card mb-0">
  <div class="card-body text-center">
    <p>${popupText.user}</p>
    <p>Time: ${popupText?.created_date}</p>
    ${
      popupText?.type_of_event
        ? `<p>Event: ${popupText?.type_of_event}</p>`
        : ""
    }
    <img src="${popupText.image}" style="width:70px"/>
  </div>
</div>
          
      `;

    let popup = new tt.Popup({ offset: 30, closeOnMove: false }).setHTML(d);

    // add marker to map
    let e = new tt.Marker({ element: markerElement, anchor: "bottom" })
      .setLngLat(position)
      .setPopup(popup)
      .addTo(this.map);

    this.markersArray.push(e);

    if (showPopup) e.setPopup(popup).togglePopup();
  };

  styleOptions = {
    style: "dark",
    layerType: "satellite",
  };

  getCurrentStyleUrl() {
    return (
      "https://api.tomtom.com/style/1/style/22.2.1-*/" +
      "?map=2/" +
      this.styleOptions.layerType +
      "_street-" +
      this.styleOptions.style +
      "&poi=2/poi_" +
      this.styleOptions.style
    );
  }

  async ngOnInit() {
    this.store.select("layout").subscribe((data) => {
      this.styleOptions = {
        style: data.LAYOUT_MODE,
        layerType: "basic",
      };

      this.map?.setStyle(this.getCurrentStyleUrl());
    });

    this.map = tt.map({
      key: environment.tomtomKey,
      container: "map",
      center: [-115.23419, 36.1634],
      zoom: 8,
      boxZoom: true,
      style: this.getCurrentStyleUrl(),
      stylesVisibility: {
        map: true,
        poi: true,
        trafficFlow: true,
        trafficIncidents: true,
      },
    });

    this.map.addControl(new tt.FullscreenControl());
    this.map.addControl(new tt.NavigationControl());

    this.getData();
    //this.getProperties()
  }

  @ViewChild("accordion") accordionComponent: any;

  activeIds = ["241", "125"];

  showAll() {
    this.currentUserIdView = null;
    this.activeIds = [];

    this.clearMarkers();

    let index = 1;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].longitude && this.data[i].latitude) {
        this.createMarker(
          [this.data[i].longitude, this.data[i].latitude],
          this.data[i].color,
          this.data[i],
          false
        );
        index++;
      }
    }
  }

  
  currentUserIdView = null;
  viewUser(user_id) {
    this.currentUserIdView = user_id;
    this.activeIds = [];

    this.clearMarkers();

    let index = 1;
    let coord = [];
    for (let i = 0; i < this.data.length; i++) {
      if (
        this.data[i].longitude &&
        this.data[i].latitude &&
        this.data[i].user_id == user_id
      ) {
        this.createMarker(
          [this.data[i].longitude, this.data[i].latitude],
          this.data[i].color,
          this.data[i],
          false
        );
        index++;
        coord.push([this.data[i].longitude, this.data[i].latitude]);
      }
    }

    console.log(coord, "coord");
    // this.drawLine(coord);
  }

  refreshMarkers = () => {
    Object.keys(this.markersOnTheMap).forEach((id) => {
      console.log(id, "id");
      this.markersOnTheMap[id].remove();
      delete this.markersOnTheMap[id];
    });

    this.map.querySourceFeatures("point-source").forEach((feature) => {
      if (feature.properties && !feature.properties.cluster) {
        var id = parseInt(feature.properties.id, 10);
        if (!this.markersOnTheMap[id]) {
          var markerElement = document.createElement("div");

          let popupText = feature.properties;
          markerElement.className = "marker";
          var markerContentElement = document.createElement("div");
          markerContentElement.className = `marker-content`;
          markerContentElement.style.backgroundColor = popupText.color;
          markerContentElement.style.color = "#fff";
          markerContentElement.style.borderColor =
            popupText.type_of == "event" ? "black" : " #fff";
          markerElement.appendChild(markerContentElement);

          var iconElement = document.createElement("div");
          iconElement.className = "marker-icon text-white";

          // let img = document.createElement('img');
          // img.src = popupText.image
          // img.width = 20; // Set the width to 300 pixels
          markerContentElement.innerHTML =
            popupText.type_of == "event"
              ? "<span style='margin-left:6px;margin-bottom:15px;transform: rotate(90deg);'>EV</span>"
              : " ";
          // markerContentElement.appendChild(img);

          markerContentElement.appendChild(iconElement);

          markerElement.addEventListener("click", (e) => {
            this.fs_scheduler_id = popupText.user_id;
            this.activeIds = popupText.timestamp;
          });

          let d = `
            <div class="card mb-0">
              <div class="card-body text-center">
                <p>${popupText.user}</p>
                <p>Time: ${popupText?.created_date}</p>
                ${
                  popupText?.type_of_event
                    ? `<p>Event: ${popupText?.type_of_event}</p>`
                    : ""
                }
                <img src="${popupText.image}" style="width:70px"/>
              </div>
            </div>
                      
        `;

          let popup = new tt.Popup({ offset: 30, closeOnMove: false }).setHTML(
            d
          );

          // add marker to map
          let newMarker = new tt.Marker({
            element: markerElement,
            anchor: "bottom",
          })
            .setLngLat(feature.geometry.coordinates)
            .setPopup(popup)
            .addTo(this.map);

          this.markersOnTheMap[id] = newMarker;
        }
      }
    });
  };

  list;
  async getData() {
    this.clearMarkers();
    this.data = [];
    let data: any = await this.geoLocationTrackerService.getGeoLocationTracker(
      this.dateFrom,
      this.dateTo
    );

    this.data = data.results;
    let jobs = data.jobs;

    this.list = data.list;
    let points = [];
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].longitude && this.data[i].latitude) {
        // this.createMarker(
        //   [this.data[i].longitude, this.data[i].latitude],
        //   this.data[i].color,
        //   this.data[i],
        //   false
        // );

        points.push({
          coordinates: [this.data[i].longitude, this.data[i].latitude],
          properties: this.data[i],
        });
      }
    }

    console.log(points, "points");

    for (let i = 0; i < jobs.length; i++) {
      if (jobs[i].fs_lon && jobs[i].fs_lat) {
        // this.createJobMarker(
        //   [jobs[i].fs_lon, jobs[i].fs_lat],
        //   "#000",
        //   jobs[i],
        //   false
        // );
        
        points.push({
          coordinates: [jobs[i].fs_lon, jobs[i].fs_lat],
          properties: jobs[i],
        });
      }
    }

    points.concat(jobs);

    //cluster

    this.markersOnTheMap = {};
    this.eventListenersAdded = false;

    // var points = [
    //   {
    //     coordinates: [-0.13389631465156526, 51.510387047712356],
    //     properties: {
    //       id: 1,
    //       name: "Checkpoint A",
    //     },
    //   },
    // ];

    // if (this.map.getSource("point-source")) {
    //   this.map.removeLayer("cluster-count");
    //   this.map.removeLayer("clusters");
    //   this.map.removeSource("point-source");
    // }

    var geoJson = {
      type: "FeatureCollection",
      features: points.map((point) => {
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: point.coordinates,
          },
          properties: point.properties,
        };
      }),
    };

    this.map.on("load", () => {
      this.map.addSource("point-source", {
        type: "geojson",
        data: geoJson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 30,
      });

      this.map.addLayer({
        id: "clusters",
        type: "circle",
        source: "point-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#EC619F",
            4,
            "#008D8D",
            7,
            "#004B7F",
          ],
          "circle-radius": ["step", ["get", "point_count"], 15, 4, 20, 7, 25],
          "circle-stroke-width": 1,
          "circle-stroke-color": "white",
          "circle-stroke-opacity": 1,
        },
      });

      this.map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "point-source",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 16,
        },
        paint: {
          "text-color": "white",
        },
      });

      this.map.on("data", (e) => {
        if (
          e.sourceId !== "point-source" ||
          !this.map.getSource("point-source").loaded()
        ) {
          return;
        }

        this.refreshMarkers();

        if (!this.eventListenersAdded) {
          this.map.on("move", this.refreshMarkers);
          this.map.on("moveend", this.refreshMarkers);
          this.eventListenersAdded = true;
        }
      });

      this.map.on("click", "clusters", (e) => {
        var features = this.map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        var clusterId = features[0].properties.cluster_id;
        this.map
          .getSource("point-source")
          .getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) {
              return;
            }

            this.map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom + 0.5,
            });
          });
      });

      this.map.on("mouseenter", "clusters", () => {
        this.map.getCanvas().style.cursor = "pointer";
      });

      this.map.on("mouseleave", "clusters", () => {
        this.map.getCanvas().style.cursor = "";
      });
    });
  }

  createJobMarker = (
    position: any,
    color: string,
    popupText: any | any,
    showPopup?,
    index?
  ) => {
    if (this._marker) this._marker.remove();

    var markerElement = document.createElement("div");

    markerElement.className = "marker";
    var markerContentElement = document.createElement("div");
    markerContentElement.className = `marker-content`;
    markerContentElement.style.backgroundColor = color;
    markerContentElement.style.color = "#fff";
    markerContentElement.style.borderColor =
      popupText.type_of == "event" ? "black" : " #fff";
    markerElement.appendChild(markerContentElement);

    var iconElement = document.createElement("div");
    iconElement.className = "marker-icon text-white";

    // let img = document.createElement('img');
    // img.src = popupText.image
    // img.width = 20; // Set the width to 300 pixels
    markerContentElement.innerHTML =
      popupText.type_of == "event"
        ? "<span style='margin-left:6px;margin-bottom:15px;transform: rotate(90deg);'>EV</span>"
        : " ";
    // markerContentElement.appendChild(img);

    markerContentElement.appendChild(iconElement);

    markerElement.addEventListener("click", (e) => {
      this.fs_scheduler_id = popupText.user_id;
      this.activeIds = popupText.timestamp;
    });

    let d = `
      <div class="card mb-0">
        <div class="card-header p-2">
          <h4 class="card-title mb-0">Job Info</h4>
        </div>
        <div class="card-body">
        <p>Service: ${popupText.service_type}</p>
                <p>Time: ${popupText?.start} ${popupText?.start_time}</p>
                <p>Techs: ${popupText?.techs || "NA"}</p>
        </div>
      </div>
                
            `;
    let popup = new tt.Popup({ offset: 30, closeOnMove: false }).setHTML(d);

    // add marker to map
    let e = new tt.Marker({ element: markerElement, anchor: "bottom" })
      .setLngLat(position)
      .setPopup(popup)
      .addTo(this.map);

    this.markersArray.push(e);

    if (showPopup) e.setPopup(popup).togglePopup();
  };

  clearMarkers() {
    for (let i = 0; i < this.markersArray.length; i++) {
      console.log(this.markersArray[i]._popup, "removing");
      this.markersArray[i].remove();
    }
  }

  active = null;
  fs_scheduler_id;
  geo_id;
  viewJob(data, index) {
    console.log(this.markersArray, "this.markersArray");
    //this.clearMarkers();

    this.geo_id = data.geo_id;
    if (!data.longitude && !data.latitude) return alert("lat and lon not set");

    if (this._marker) this._marker.remove();

    this.map.flyTo({
      curve: true,
      center: [data.longitude, data.latitude],
      zoom: 15,
      speed: 5,
    });

    var element = document.createElement("div");
    element.id = "marker";
    this._marker = new tt.Marker({ element: element })
      .setLngLat([data.longitude, data.latitude])
      .addTo(this.map);

    //     let d = `
    //     <div style="padding:0px;border-radius:4px; text-align:center" class="text-dark">
    //     <p>${data.user}</p>
    //     <p>Time: ${data?.created_date}</p>
    //     <img src="${data.image}" style="width:30px"/>
    //     </div>
    // `;

    let d = `
<div class="card mb-0">
  <div class="card-body">
  <p>${data.user}</p>
          <p>Time: ${data?.created_date}</p>
    <img src="${data.image}" style="width:70px"/>
  </div>
</div>
          
      `;

    let pop_up = new tt.Popup({ offset: 30 }).setHTML(d);

    console.log(this._marker, "asdfffffff");
    this._marker.setPopup(pop_up).togglePopup();

    this.createMarker([data.longitude, data.latitude], data.color, data, true);
  }

  async getLocation() {
    if (navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (position) {
              this.currentUserLat = position.coords.latitude;
              this.currentUserLng = position.coords.longitude;
              this.clientAddress = `${this.currentUserLat},${this.currentUserLng}`;
              this.geoTurnedOn = true;
            }
          },
          (error) => {
            console.log(error);
          },
          { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
        );
      } catch (err) {
        this.geoTurnedOn = false;
      }
    } else {
      this.geoTurnedOn = false;
      alert("Geolocation is not supported by this browser.");
    }
  }

  @Output() formElements: EventEmitter<any> = new EventEmitter();

  ngAfterViewInit() {
    this.formElements?.emit({
      go: this.getList,
    });

    //this.getList()
  }

  eventListenersAdded = false;

  listData;
  getList = async () => {
    let from = moment(this.currentDate["from"]).format("YYYY-MM-DD");
    let to = moment(this.currentDate["to"]).format("YYYY-MM-DD");
    this.listData = await this.api.getMap(from, to);
  };
}
