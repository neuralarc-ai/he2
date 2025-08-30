'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Copy, CheckCircle, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GeneratedPrompt {
  id: number;
  content: string;
  type: string;
  industry: string;
  industryType: string;
}

export default function PromptLibraryPage() {
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchAllPrompts = async () => {
      try {
        setIsLoading(true);
        const industries = [
          'Technology','Healthcare','Finance','Education','Retail',
          'Manufacturing','Hospitality','Real Estate','Marketing','E-commerce'
        ];
        const allPrompts: GeneratedPrompt[] = [];

        for (const industry of industries) {
          const response = await fetch('/api/generate-prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ industry }),
          });

          if (!response.ok) continue;
          const data = await response.json();

          if (Array.isArray(data.prompts)) {
            allPrompts.push(...data.prompts.map((p: any) => ({
              ...p,
              industryType: industry,
            })));
          }
        }
        setPrompts(allPrompts.sort(() => 0.5 - Math.random()));
      } catch (error) {
        console.error('Error fetching prompts:', error);
        toast.error('Failed to load prompts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPrompts();
  }, []);

  const industryTypes = React.useMemo(() => {
    const types = new Set<string>();
    prompts.forEach((p) => {
      if (p.industry) types.add(p.industry);
      if (p.industryType) types.add(p.industryType);
    });
    return ['All', ...Array.from(types).sort()];
  }, [prompts]);

  const filteredPrompts = React.useMemo(() => {
    if (!searchQuery.trim() && (!industryType || industryType === 'All')) return prompts;
    const query = searchQuery.trim().toLowerCase();
    return prompts.filter((p) => {
      const matchesType =
        !industryType || industryType === 'All' || p.industry === industryType || p.industryType === industryType;
      const matchesSearch =
        p.industry.toLowerCase().includes(query) ||
        (p.industryType && p.industryType.toLowerCase().includes(query)) ||
        p.content.toLowerCase().includes(query) ||
        p.type.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [prompts, searchQuery, industryType]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPrompts = filteredPrompts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Prompt Library</h1>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            className="pl-10 w-full"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={industryType} onValueChange={setIndustryType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            {industryTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prompts Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedPrompts.map((prompt) => (
          <Card key={prompt.id} className="p-4 h-36 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900 text-sm">{prompt.type}</h3>
                <p className="text-xs text-gray-500">
                  {prompt.industry}
                  {prompt.industryType && ` • ${prompt.industryType}`}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(prompt.content, prompt.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                {copiedId === prompt.id ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-600 line-clamp-3">
              {prompt.content}
            </p>
          </Card>
        ))}
      </div>

      {filteredPrompts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg mt-6">
          <p className="text-gray-500">
            {isLoading ? 'Loading prompts...' : 'No prompts found'}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between px-2 mt-6">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPrompts.length)} of {filteredPrompts.length} prompts
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}