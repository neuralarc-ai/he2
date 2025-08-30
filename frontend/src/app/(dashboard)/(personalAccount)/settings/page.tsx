import { redirect } from 'next/navigation';

export default async function PersonalAccountSettingsPage() {
  // Redirect to billing page since that's where users want to access billing and usage logs
  redirect('/settings/billing');
}
