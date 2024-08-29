import { Component, Input, OnInit } from "@angular/core";

import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { AddressSearch } from "@app/core/api/address-search/address-search.service";
import { getMeters } from "src/assets/js/util/getMeters";
import { getMiles } from "src/assets/js/util/getMiles";

export const listCategories = [
  {
    name: "Hotel/Motel",
    value: 7314,
  },
  {
    name: "Airport",
    value: 7383,
  },
];

@Injectable({
  providedIn: "root",
})
export class NearbySearchModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  public open({ category, lat, lon }) {
    this.modalRef = this.modalService.open(NearbySearchModalComponent, {
      size: "lg",
    });
    this.modalRef.componentInstance.category = category;
    this.modalRef.componentInstance.lat = lat;
    this.modalRef.componentInstance.lon = lon;
    return this.modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-nearby-searcg-modal",
  templateUrl: "./nearby-search-modal.component.html",
})
export class NearbySearchModalComponent implements OnInit {
  @Input() public category: any;
  @Input() public lat: any;
  @Input() public lon: any;

  constructor(
    public activeModal: NgbActiveModal,
    private addressSearch: AddressSearch
  ) {}

  onSubmit() {
    this.activeModal.close();
  }

  ngOnInit(): void {
    if (this.category) {
      this.getNearByAirport();
    }
  }

  getMiles = getMiles;

  add(row){
    this.activeModal.close(row);
  }

  rerun(){
    
    this.getNearByAirport();
  }

  data;
  miles = 10
  async getNearByAirport() {
    let d = {
      q: "San jose",
      lat: this.lat,
      lon: this.lon,
      radius: getMeters(this.miles),
      limit: 100,
      categorySet: this.category,
    };

    this.data = await this.addressSearch.searchNearbyAirport(d);
    this.data = this.data.results;
  }
}
