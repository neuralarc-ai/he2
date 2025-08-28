import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Keys | Helium',
  description: 'Manage your API keys for programmatic access to Helium',
  openGraph: {
    title: 'API Keys | Helium',
    description: 'Manage your API keys for programmatic access to Helium',
    type: 'website',
  },
};

export default async function APIKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
