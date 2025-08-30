'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Building2, Globe, Package, Wrench } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyProfile {
  companyName: string;
  websiteUrl: string;
  description: string;
  services: string[];
  products: string[];
  lastUpdated: string;
}

export default function CompanyProfilePage() {
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateUrl = (url: string) => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const fetchCompanyProfile = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    if (!validateUrl(websiteUrl)) {
      toast.error('Please enter a valid website URL');
      return;
    }

    setIsLoading(true);
    try {
      const normalizedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
      
      const response = await fetch('/api/company-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          companyName: companyName.trim(), 
          websiteUrl: normalizedUrl 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company profile');
      }

      const data = await response.json();
      setCompanyProfile(data.companyProfile);
      toast.success('Company profile fetched successfully!');
    } catch (error) {
      console.error('Error fetching company profile:', error);
      toast.error('Failed to fetch company profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCompanyName('');
    setWebsiteUrl('');
    setCompanyProfile(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Company Profile
        </h1>
        <p className="text-muted-foreground">
          Get detailed company information including description, services, and products using AI-powered research.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            Enter the company name and website URL to fetch detailed company profile information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g., Microsoft, Apple, Google"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                placeholder="e.g., microsoft.com, apple.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={fetchCompanyProfile} 
              disabled={isLoading || !companyName.trim() || !websiteUrl.trim()}
              className="flex-1 md:flex-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Profile...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Fetch Company Profile
                </>
              )}
            </Button>
            {companyProfile && (
              <Button 
                variant="outline" 
                onClick={resetForm}
                disabled={isLoading}
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {companyProfile && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {companyProfile.companyName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <a 
                  href={companyProfile.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {companyProfile.websiteUrl}
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Company Description</Label>
                <Textarea
                  value={companyProfile.description}
                  readOnly
                  className="min-h-[120px] resize-none bg-muted/50"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                {companyProfile.services.length > 0 ? (
                  <ul className="space-y-2">
                    {companyProfile.services.map((service, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5" />
                        <span>{service}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No services information available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {companyProfile.products.length > 0 ? (
                  <ul className="space-y-2">
                    {companyProfile.products.map((product, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5" />
                        <span>{product}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No products information available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="text-sm text-muted-foreground text-right">
            Last updated: {new Date(companyProfile.lastUpdated).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
