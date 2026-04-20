import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { queryString } from 'src/assets/js/util/queryString';

let url = 'FieldServiceMobile/trip-expense-transactions';
const tripExpenseTransactionsV2Url = 'apiV2/trip-expense-transactions';

@Injectable({
  providedIn: 'root'
})
export class TripExpenseTransactionsService {

  constructor(private http: HttpClient) { }

  getByFsId(fsId, workOrderId) {
    return firstValueFrom(this.http.get(`${tripExpenseTransactionsV2Url}/getByFsId?fsId=${fsId}&workOrderId=${workOrderId}`))
  }

  getByWorkOrderId(workOrderId) {
    return firstValueFrom(this.http.get(`${tripExpenseTransactionsV2Url}/getByWorkOrderId?workOrderId=${workOrderId}`))
  }

  getById(id) {
    return firstValueFrom(this.http.get(`${tripExpenseTransactionsV2Url}/${id}`))
  }

  updateById(id, params) {
    return firstValueFrom(this.http.put(`${tripExpenseTransactionsV2Url}/updateCreditCardTransactionById/${id}`, params))
  }

  deleteById(id) {
    return firstValueFrom(this.http.delete(`${tripExpenseTransactionsV2Url}/${id}`))
  }

  create(params) {
    return firstValueFrom(this.http.post(`${tripExpenseTransactionsV2Url}`, params))
  }

  emailMissingReceiptsToTechs(fsId, ticketNumber, data) {
    return firstValueFrom(this.http.post(`${url}/emailMissingReceiptsToTechs.php?fsId=${fsId}&ticketNumber=${ticketNumber}`, data))
  }


  async uploadCreditCardTransactions(fileToUpload: File, monthAndYear) {
    const formData: FormData = new FormData();
    formData.append('file', fileToUpload, fileToUpload.name);
    return await firstValueFrom(this.http.post<{ message: string }>(`${url}/upload.php?monthAndYear=${monthAndYear}`, formData));
  }


  /**
   *
   * @param params
   * @returns
   */
  findByDateRange = async (fieldName, params: any): Promise<any> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any>(`${url}/findByDateRange${result}&fieldName=${fieldName}`));
  }


  getChart = async (dateFrom, dateTo, displayCustomers, typeOfView) =>
    await firstValueFrom(this.http.get<any>(`${url}/getChart?dateFrom=${dateFrom}&dateTo=${dateTo}&displayCustomers=${encodeURIComponent(displayCustomers)}&typeOfView=${typeOfView}`))



}
