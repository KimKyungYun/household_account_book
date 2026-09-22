import { http } from '@/service/httpClient';
import type { PaymentMethodDto } from '@/service/paymentMethod/type';

export function getPaymentMethods() {
  return http.get<PaymentMethodDto[]>('/payment-methods');
}
