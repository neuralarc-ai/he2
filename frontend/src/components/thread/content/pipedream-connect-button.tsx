import React from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePipedreamAppIcon } from '@/hooks/react-query/pipedream/use-pipedream';

interface PipedreamConnectButtonProps {
  url: string;
  appSlug?: string;
}

// Common app name mappings for better display
const APP_NAME_MAPPINGS: Record<string, string> = {
  'linear': 'Linear',
  'github': 'GitHub', 
  'gitlab': 'GitLab',
  'google_sheets': 'Google Sheets',
  'google_drive': 'Google Drive',
  'google_calendar': 'Google Calendar',
  'google_maps': 'Google Maps',
  'notion': 'Notion',
  'slack': 'Slack',
  'discord': 'Discord',
  'twitter': 'Twitter',
  'linkedin': 'LinkedIn',
  'facebook': 'Facebook',
  'instagram': 'Instagram',
  'youtube': 'YouTube',
  'zoom': 'Zoom',
  'microsoft_teams': 'Microsoft Teams',
  'outlook': 'Outlook',
  'gmail': 'Gmail',
  'dropbox': 'Dropbox',
  'onedrive': 'OneDrive',
  'salesforce': 'Salesforce',
  'hubspot': 'HubSpot',
  'mailchimp': 'Mailchimp',
  'stripe': 'Stripe',
  'paypal': 'PayPal',
  'shopify': 'Shopify',
  'woocommerce': 'WooCommerce',
  'wordpress': 'WordPress',
  'webflow': 'Webflow',
  'airtable': 'Airtable',
  'monday': 'Monday.com',
  'asana': 'Asana',
  'trello': 'Trello',
  'jira': 'Jira',
  'confluence': 'Confluence',
  'figma': 'Figma',
  'adobe_creative': 'Adobe Creative',
  'twilio': 'Twilio',
  'sendgrid': 'SendGrid',
  'aws': 'AWS',
  'google_cloud': 'Google Cloud',
  'azure': 'Azure',
  'heroku': 'Heroku',
  'vercel': 'Vercel',
  'netlify': 'Netlify'
};

function formatAppName(appSlug: string): string {
  // Check if we have a custom mapping first
  if (APP_NAME_MAPPINGS[appSlug.toLowerCase()]) {
    return APP_NAME_MAPPINGS[appSlug.toLowerCase()];
  }
  
  // Fall back to converting snake_case to Title Case
  return appSlug
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function extractAppSlug(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const appParam = urlObj.searchParams.get('app');
    return appParam;
  } catch {
    const match = url.match(/[&?]app=([^&]+)/);
    return match ? match[1] : null;
  }
}

export const PipedreamConnectButton: React.FC<PipedreamConnectButtonProps> = ({ 
  url, 
  appSlug: providedAppSlug 
}) => {
  const appSlug = providedAppSlug || extractAppSlug(url);
  const appName = appSlug ? formatAppName(appSlug) : 'Service';
  
  const { data: iconData } = usePipedreamAppIcon(appSlug || '', {
    enabled: !!appSlug
  });

  const handleConnect = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="my-3 bg-muted/80 border p-0 shadow-none">
      <CardContent className='p-4'>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-muted border rounded-lg flex items-center justify-center overflow-hidden">
              {iconData?.icon_url ? (
                <img
                  src={iconData.icon_url}
                  alt={`${appName} logo`}
                  className="w-6 h-6 object-cover rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
              ) : null}
              <Link2 
                className={`h-5 w-5 text-blue-600 dark:text-blue-400 ${iconData?.icon_url ? 'hidden' : 'block'}`} 
              />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Connect Your {appName} Account
              </p>
            </div>
          </div>
          <Button 
            onClick={handleConnect}
            size="sm"
          >
            Connect to {appName}
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 