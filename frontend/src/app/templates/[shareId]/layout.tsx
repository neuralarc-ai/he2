import { backendApi } from '@/lib/api-client';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const { shareId } = await params;
  
  try {
    const response = await backendApi.get(`/templates/share/${shareId}`);
    
    const template = response.data;
    
    const title = `${template.name} - AI Agent Template | Helium AI`;
    const description = template.description || 'Discover and install this AI agent template to enhance your workflow with powerful automation capabilities.';
    
    const ogImage = `${process.env.NEXT_PUBLIC_URL}/api/og/template?shareId=${shareId}`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `${process.env.NEXT_PUBLIC_URL}/templates/${shareId}`,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: template.name,
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch (error) {
    return {
      title: 'AI Agent Template | Helium AI',
      description: 'Discover and install AI agent templates to enhance your workflow with powerful automation capabilities.',
      openGraph: {
        title: 'AI Agent Template | Helium AI',
        description: 'Discover and install AI agent templates to enhance your workflow with powerful automation capabilities.',
        type: 'website',
        url: `${process.env.NEXT_PUBLIC_URL}/templates/${shareId}`,
        images: [
          {
            url: `${process.env.NEXT_PUBLIC_URL}/share-page/og-fallback.png`,
            width: 1200,
            height: 630,
            alt: 'Helium AI Agent Template',
          }
        ],
      },
    };
  }
}

export default function TemplateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 