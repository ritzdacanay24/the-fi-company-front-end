//https://netbasal.com/typed-reactive-forms-in-angular-no-longer-a-type-dream-bf6982b0af28
export interface IShippingRequestForm {
  requestorName: string;
  emailAddress: string;
  companyName: string;
  streetAddress: string;
  streetAddress1: string;
  city: string;
  state: string;
  zipCode: string;
  contactName: string;
  phoneNumber: string;
  freightCharges: string;
  thridPartyAccountNumber: string;
  serviceTypeName: string;
  saturdayDelivery: string;
  cost: string;
  sendTrackingNumberTo: any;
  comments: string;
  createdDate: string;
  createdById: number;
  serviceType: string;
  completedDate: string;
  completedBy: string;
  trackingNumber: string;
  active: number;
}
