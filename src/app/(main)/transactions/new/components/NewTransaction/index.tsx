'use client';

import { useRouter } from 'next/navigation';
import Card from '@/components/common/Card';
import TransactionForm from '@/components/transaction/TransactionForm';
import { PATH } from '@/routes/paths';

export default function NewTransaction() {
  const router = useRouter();

  return (
    <Card title="거래 등록">
      <TransactionForm
        mode="create"
        withSubmitButton
        onSuccess={() => router.push(PATH.TRANSACTIONS)}
      />
    </Card>
  );
}
