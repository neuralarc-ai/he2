'use client';

import React from 'react';
import { Bot, ShoppingBag, Plus } from 'lucide-react';
import { FancyTabs, TabConfig } from '@/components/ui/fancy-tabs';
import { Button } from '@/components/ui/button';

interface TabsNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  onCreateAgent?: () => void;
}

const agentTabs: TabConfig[] = [
  {
    value: 'explore',
    icon: ShoppingBag,
    label: 'Explore',
    shortLabel: 'Explore',
  },
  {
    value: 'my-agents',
    icon: Bot,
    label: 'My Agents',
  },
]; 

export const TabsNavigation = ({ activeTab, onTabChange, onCreateAgent }: TabsNavigationProps) => {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex-1">
        <FancyTabs
          tabs={agentTabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          className="max-w-xs"
        />
      </div>
      
      <div className="flex-shrink-0">
        <Button 
          onClick={onCreateAgent}
          className="flex items-center gap-1 rounded-full px-4 py-2 font-bold"
        >
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>
    </div>
  );
};