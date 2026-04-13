//https://netbasal.com/typed-reactive-forms-in-angular-no-longer-a-type-dream-bf6982b0af28
export interface IIgtTransferForm {
  details: any;
  transfer_reference: number;
  transfer_reference_description: string;
  date: string;
  so_number: string;
  so_line: string;
  part_number: string;
  part_description: string;
  qty: number;
  from_location: string;
  to_location: string;
  pallet_number: string;
  serial_number: string;
  active: number;
  created_date: string;
  created_by: number;
  created_by_name: string;
}
