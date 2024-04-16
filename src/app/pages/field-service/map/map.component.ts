import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbAccordionModule, NgbCollapseModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
/* @ts-ignore */
import * as tt from '@tomtom-international/web-sdk-maps';
import { environment } from '@environments/environment';
import { RootReducerState } from '@app/store';
import { Store } from '@ngrx/store';
import { JobModalService } from '../job/job-modal-edit/job-modal.service';
import { FlatpickrModule } from 'angularx-flatpickr';
import moment from 'moment';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { PropertyService } from '@app/core/api/field-service/property.service';

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
        DateRangeComponent
    ],
    selector: 'app-map',
    encapsulation: ViewEncapsulation.None,
    templateUrl: `./map.component.html`
})

export class MapComponent implements OnInit {


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

    @Input() typeOfView: 'Website' | 'Creorx' | 'attorney' = 'Website';

    @Input() radius: number = 10;

    @Input() cluster: boolean = false;

    @Input() mapHeight: string = "map";

    @Input() markersArray: any[] = [];

    @Input() is_excluded = 'ALL';

    @Input() sortValue = 'Nearest';

    @Input() data: any;

    @Input() dataSearch: any[] = [];

    @Input() NPI: number;

    @Input() pop_up: any

    @Input() _marker: any

    @Input() map: tt.Map | any;

    @Input() clientAddress = `Las vegas, NV`;

    @Input() searchAddress = 'Pharmacy'

    @Input() selectPharmacy: Function

    @Input() displayAdditionalInfo: boolean = false;

    @Input() editPharmacy: Function;

    @Input() currentUserLat: any;
    @Input() currentUserLng: any;
    @Input() displayNetwork = false;

    geoTurnedOn: any = "";
    geoJson
    markersOnTheMap = {};

    dateFrom = moment().startOf('month').format('YYYY-MM-DD');
    dateTo = moment().endOf('month').format('YYYY-MM-DD');
    dateRange1 = [this.dateFrom, this.dateTo];

    dateChanged($event) {
        this.dateFrom = $event['dateFrom']
        this.dateTo = $event['dateTo']

        this.getData()
        //this.getProperties()
        //this.getList()
    }

    currentDate: any;

    constructor(
        private api: SchedulerService,
        private propertyService: PropertyService,
        private store: Store<RootReducerState>,
        private jobModalEditService: JobModalService
    ) {
    }


    scroll = (id: number) => {
        if (!id) return;

        //let el = document.getElementById();

        let el = document.getElementsByClassName("test-" + id.toString());

        setTimeout(() => {
            el[0]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
    }

    createMarker = (position: any, color: string, popupText: any | any, showPopup?, index?) => {

        if (this._marker) this._marker.remove();

        var markerElement = document.createElement('div');

        markerElement.className = 'marker';
        var markerContentElement = document.createElement('div');
        markerContentElement.className = `marker-content text-dark ${color}`;
        // markerContentElement.style.backgroundColor = color;
        markerContentElement.style.borderColor = ' #fff';
        markerElement.appendChild(markerContentElement);

        var iconElement = document.createElement('div');
        iconElement.className = 'marker-icon';
        iconElement.innerText = index ? index : null;
        markerContentElement.appendChild(iconElement);

        markerElement.addEventListener('click', (e) => {
            this.fs_scheduler_id = popupText.fs_scheduler_id
            this.activeIds = popupText.techId?.split(',')
            this.scroll(popupText.fs_scheduler_id)
        });

        let d = `
            <div style="padding:6px;border-radius:4px;" class="text-dark">
            <p>FSID: ${popupText.fs_scheduler_id}</p>
            <p>Start Date: ${popupText.start}</p>
            <p>Title: ${popupText.service_type}</p>
            <p>Techs: ${popupText.techs}</p>
            </div>
        `
        if (color == 'red') {
            d = `
                <div style="padding:6px;border-radius:4px;">
                <h6>${popupText?.address?.freeformAddress}</h6>
                </div>
            `
        }

        let popup = new tt.Popup({ offset: 30, closeOnMove: false }).setHTML(d);

        // add marker to map
        let e = new tt.Marker({ element: markerElement, anchor: 'bottom' })
            .setLngLat(position)
            .setPopup(popup)
            .addTo(this.map);

        this.markersArray.push(e);

        if (showPopup)
            e.setPopup(popup).togglePopup();

    }


    styleOptions = {
        style: 'dark',
        layerType: 'basic'
    };

    getCurrentStyleUrl() {
        return 'https://api.tomtom.com/style/1/style/22.2.1-*/' +
            '?map=2/' + this.styleOptions.layerType + '_street-' + this.styleOptions.style +
            '&poi=2/poi_' + this.styleOptions.style;
    }

    async ngOnInit() {


        this.store.select('layout').subscribe((data) => {

            this.styleOptions = {
                style: data.LAYOUT_MODE,
                layerType: 'basic'
            }

            this.map?.setStyle(this.getCurrentStyleUrl());
        })

        this.map = tt.map({
            key: environment.tomtomKey,
            container: 'map',
            center: [-115.234190, 36.163400],
            zoom: 2,
            boxZoom: true,
            style: this.getCurrentStyleUrl(),
            stylesVisibility: {
                poi: false,
                trafficFlow: false,
                trafficIncidents: false,
            }
        });

        this.map.addControl(new tt.FullscreenControl());
        this.map.addControl(new tt.NavigationControl());

        this.getData()
        //this.getProperties()
    }


    @ViewChild('accordion') accordionComponent: any;

    activeIds = ['241', '125']

    showAll() {

        this.activeIds = [];

        this.clearMarkers()

        let index = 1
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].fs_lon && this.data[i].fs_lat) {
                this.createMarker([this.data[i].fs_lon, this.data[i].fs_lat], this.data[i].backgroundColor, this.data[i], false)
                index++
            }
        }

    }

    async getData() {

        this.clearMarkers()

        let from = moment(this.dateFrom).format('YYYY-MM-DD');
        let to = moment(this.dateTo).format('YYYY-MM-DD');

        let data: any = await this.api.getMap(from, to);

        this.data = data.mapData;
        this.listData = data.listData
        let index = 1
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].fs_lon && this.data[i].fs_lat) {
                this.createMarker([this.data[i].fs_lon, this.data[i].fs_lat], this.data[i].backgroundColor, this.data[i], false)
                index++
            }
        }

    }

    clearMarkers() {
        for (let i = 0; i < this.markersArray.length; i++) {
            this.markersArray[i].remove();
        }
    }

    viewTech(user) {

        this.clearMarkers()

        let index = 1
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].fs_lon && this.data[i].fs_lat) {
                let techs = this.data[i]?.techs?.split(', ') || []
                if (techs.indexOf(user) !== -1) {
                    this.createMarker([this.data[i].fs_lon, this.data[i].fs_lat], this.data[i].backgroundColor, this.data[i], false, index)
                    index++
                }

            }
        }

        this.map.setCenter([-115.234190, 36.163400]);

        this.map.easeTo({
            zoom: 3
        });

    }

    viewJobInfo(fsId) {
        let modalRef = this.jobModalEditService.open(fsId)
        modalRef.result.then((result: any) => {
        }, () => {

            //this.getList();
        });
    }

    active = null
    fs_scheduler_id

    viewJob(data, index) {


        this.fs_scheduler_id = data.fs_scheduler_id;
        if (!data.fs_lon && !data.fs_lat) return alert('lat and lon not set')

        if (this._marker) this._marker.remove();

        this.map.easeTo({
            center: [data.fs_lon, data.fs_lat],
            zoom: 5
        });

        var element = document.createElement('div');
        element.id = 'marker';
        this._marker = new tt.Marker({ element: element }).setLngLat([data.fs_lon, data.fs_lat]).addTo(this.map);
        let pop_up = new tt.Popup({ offset: 30 })
            .setHTML(`
            <div style="padding:6px;border-radius:4px;" class="text-dark">
                <p>FSID: ${data.fs_scheduler_id}</p>
                <p>Start Date: ${data.start}</p>
                <p>Title: ${data.service_type}</p>
                <p>Techs: ${data.techs}</p>
            </div>
      `);

        this._marker.setPopup(pop_up).togglePopup();
    }

    async getLocation() {
        if (navigator.geolocation) {
            try {

                navigator.geolocation.getCurrentPosition(
                    position => {
                        if (position) {
                            this.currentUserLat = position.coords.latitude;
                            this.currentUserLng = position.coords.longitude;
                            this.clientAddress = `${this.currentUserLat},${this.currentUserLng}`
                            this.geoTurnedOn = true;
                        }
                    },
                    error => { console.log(error) },
                    { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
                )
            } catch (err) {
                this.geoTurnedOn = false;
            }
        } else {
            this.geoTurnedOn = false;
            alert("Geolocation is not supported by this browser.");
        }
    }

    @Output() formElements: EventEmitter<any> = new EventEmitter()

    ngAfterViewInit() {
        this.formElements?.emit({
            go: this.getList
        })

        //this.getList()
    }

    eventListenersAdded = false;

    startingLocationInfo: Object | any = {
        position: {
            lat: "",
            long: ""
        },
        address: {
            municipality: "",
            countrySubdivision: "",
            postalCode: ""
        },
        is_excluded: ""
    };

    listData
    getList = async () => {
        let from = moment(this.currentDate['from']).format('YYYY-MM-DD');
        let to = moment(this.currentDate['to']).format('YYYY-MM-DD');
        this.listData = await this.api.getMap(from, to);
    }

    listProperties
    getProperties = async () => {
        this.listProperties = await this.propertyService.find({ address_complete: 'Yes' });
        for (let i = 0; i < this.listProperties.length; i++) {
            if (this.listProperties[i].lon && this.listProperties[i].lat) {
                this.createPropertyMarker([this.listProperties[i].lon, this.listProperties[i].lat], this.listProperties[i]?.backgroundColor, this.listProperties[i], false)
            }
        }
    }


    createPropertyMarker = (position: any, color: string, popupText: any | any, showPopup?, index?) => {

        if (this._marker) this._marker.remove();

        var markerElement = document.createElement('div');

        markerElement.className = 'marker';
        var markerContentElement = document.createElement('div');
        markerContentElement.className = `marker-content text-dark ${color}`;
        markerContentElement.style.backgroundColor = 'red';
        markerContentElement.style.borderColor = ' #fff';
        markerElement.appendChild(markerContentElement);

        var iconElement = document.createElement('div');
        iconElement.className = 'marker-icon';
        iconElement.innerText = index ? index : null;
        markerContentElement.appendChild(iconElement);

        markerElement.addEventListener('click', (e) => {
            this.fs_scheduler_id = popupText.fs_scheduler_id
            this.activeIds = popupText.techId?.split(',')
            this.scroll(popupText.fs_scheduler_id)
        });

        let d = `
            <div style="padding:6px;border-radius:4px;" class="text-dark">
                <p>FSID: ${popupText.fs_scheduler_id}</p>
                <p>Start Date: ${popupText.start}</p>
                <p>Title: ${popupText.service_type}</p>
                <p>Techs: ${popupText.techs}</p>
            </div>
        `
        if (color == 'red') {
            d = `
                <div style="padding:6px;border-radius:4px;">
                <h6>${popupText?.address?.freeformAddress}</h6>
                </div>
            `
        }

        let popup = new tt.Popup({ offset: 30, closeOnMove: false }).setHTML(d);

        // add marker to map
        let e = new tt.Marker({ element: markerElement, anchor: 'bottom' })
            .setLngLat(position)
            .setPopup(popup)
            .addTo(this.map);

        this.markersArray.push(e);

        if (showPopup)
            e.setPopup(popup).togglePopup();

    }


}
