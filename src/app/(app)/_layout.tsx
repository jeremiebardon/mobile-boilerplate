import AppTabs from '@/components/app-tabs';
import { BiometricOptInModal } from '@/features/authentication/components/biometric-opt-in-modal';

export default function AppLayout() {
  return (
    <>
      <AppTabs />
      <BiometricOptInModal />
    </>
  );
}
