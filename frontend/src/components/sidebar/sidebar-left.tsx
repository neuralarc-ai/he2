'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bot, Menu, Store, Plus, Zap, ChevronRight, Loader2, Book, Building2, Settings } from 'lucide-react';

import { NavAgents } from '@/components/sidebar/nav-agents';
import { NavUserWithTeams } from '@/components/sidebar/nav-user-with-teams';
import { HeliumLogo } from '@/components/sidebar/helium-logo';
import { CTACard } from '@/components/sidebar/cta';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { usePathname, useSearchParams } from 'next/navigation';
import { useFeatureFlags } from '@/lib/feature-flags';
import posthog from 'posthog-js';
import Image from 'next/image'
// Custom Plus Icon component using the plus.svg
const PlusIcon = ({ className }: { className?: string }) => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M12 5V19" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M5 12H19" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Custom Agent Icon component using the agent.svg
const AgentIcon = ({ className }: { className?: string }) => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M17.3333 9.92285H6.66667C5.19391 9.92285 4 11.1627 4 12.6921V18.2305C4 19.7599 5.19391 20.9998 6.66667 20.9998H17.3333C18.8061 20.9998 20 19.7599 20 18.2305V12.6921C20 11.1627 18.8061 9.92285 17.3333 9.92285Z" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M7.99984 16.8464C8.73622 16.8464 9.33317 16.2265 9.33317 15.4618C9.33317 14.6971 8.73622 14.0771 7.99984 14.0771C7.26346 14.0771 6.6665 14.6971 6.6665 15.4618C6.6665 16.2265 7.26346 16.8464 7.99984 16.8464Z" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M15.9998 16.8464C16.7362 16.8464 17.3332 16.2265 17.3332 15.4618C17.3332 14.6971 16.7362 14.0771 15.9998 14.0771C15.2635 14.0771 14.6665 14.6971 14.6665 15.4618C14.6665 16.2265 15.2635 16.8464 15.9998 16.8464Z" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 4V9.53846" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M11.9998 5.76923C12.7362 5.76923 13.3332 5.14932 13.3332 4.38462C13.3332 3.61991 12.7362 3 11.9998 3C11.2635 3 10.6665 3.61991 10.6665 4.38462C10.6665 5.14932 11.2635 5.76923 11.9998 5.76923Z" 
      fill="currentColor" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Floating mobile menu button component
function FloatingMobileMenuButton() {
  const { setOpenMobile, openMobile } = useSidebar();
  const isMobile = useIsMobile();

  if (!isMobile || openMobile) return null;

  return (
    <div className="fixed top-6 left-4 z-50 md:hidden">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setOpenMobile(true)}
            size="icon"
            className="h-12 w-12 rounded-full bg-transparent text-foreground shadow-none hover:bg-transparent transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation"
            aria-label="Open menu"
          >
           <Image
                                src="/icons/menu-light.svg"
                                alt="menu Light Logo"
                                width={22}
                                height={22}
                                className="block dark:hidden mb-0"
                              />
                           
                              <Image
                                src="/icons/menu-dark.svg"
                                alt="menu Dark Logo"
                                width={22}
                                height={22}
                                className="hidden dark:block mb-0"
                              />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Open menu
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { state, setOpen, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar: string;
  }>({
    name: 'Loading...',
    email: 'loading@example.com',
    avatar: '',
  });

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { flags, loading: flagsLoading } = useFeatureFlags(['custom_agents']);
  const customAgentsEnabled = flags.custom_agents;


  // Close mobile menu on page navigation
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, searchParams, isMobile, setOpenMobile]);

  
  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setUser({
          name:
            data.user.user_metadata?.name ||
            data.user.email?.split('@')[0] ||
            'User',
          email: data.user.email || '',
          avatar: data.user.user_metadata?.avatar_url || '',
        });
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        setOpen(!state.startsWith('expanded'));
        window.dispatchEvent(
          new CustomEvent('sidebar-left-toggled', {
            detail: { expanded: !state.startsWith('expanded') },
          }),
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, setOpen]);




  return (
    <Sidebar
      collapsible="icon"
      className="bg-background/95 backdrop-blur-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      {...props}
    >
      <SidebarHeader className="px-2 py-2">
        <div className="flex h-[40px] items-center px-1 relative">
          <Link href="/dashboard" className="flex-shrink-0" onClick={() => isMobile && setOpenMobile(false)}>
            <HeliumLogo size={18} />
          </Link>
          {state !== 'collapsed' && (
            <div className="ml-2 transition-all duration-200 ease-in-out whitespace-nowrap">
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {state !== 'collapsed' && !isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger className="h-8 w-8" />
                </TooltipTrigger>
                <TooltipContent>Toggle sidebar (CMD+B)</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {state === 'collapsed' && (
          <div className="mt-2 flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="h-8 w-8" />
              </TooltipTrigger>
              <TooltipContent>Toggle sidebar (CMD+B)</TooltipContent>
            </Tooltip>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <SidebarGroup>
          <Link href="/dashboard">
            <SidebarMenuButton 
              className={cn('touch-manipulation', {
                'bg-accent px-4 text-accent-foreground font-medium': pathname === '/dashboard',
              })} 
              onClick={() => {
                posthog.capture('new_task_clicked');
                if (isMobile) setOpenMobile(false);
              }}
            >
            <Image
                                src="/icons/plus-light.svg"
                                alt="plus Light Logo"
                                width={22}
                                height={22}
                                className="block dark:hidden mb-0 mr-1"
                              />
                           
                              <Image
                                src="/icons/plus-dark.svg"
                                alt="plus Dark Logo"
                                width={22}
                                height={22}
                                className="hidden dark:block mb-0 mr-1"
                              />
              <span className="flex items-center justify-between w-full">
                New Task
              </span>
            </SidebarMenuButton>
          </Link>
          {!flagsLoading && customAgentsEnabled && (
            <Link href="/agents?tab=my-agents">
              <SidebarMenuButton 
                className={cn('touch-manipulation', {
                  'bg-accent text-accent-foreground font-medium': pathname === '/agents' && (searchParams.get('tab') === 'my-agents' || searchParams.get('tab') === null),
                })} 
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
              >
             <Image
                                src="/icons/bot-light.svg"
                                alt="bot Light Logo"
                                width={20}
                                height={20}
                                className="block dark:hidden mb-1 mr-1"
                              />
                           
                              <Image
                                src="/icons/bot-dark.svg"
                                alt="bot Dark Logo"
                                width={20}
                                height={20}
                                className="hidden dark:block mb-1 mr-1"
                              />
                <span className="flex items-center justify-between w-full">
                  My Agents
                </span>
              </SidebarMenuButton>
            </Link>
          )}

          {/* Prompt Library */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === '/prompt-library'}
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
                className="touch-manipulation"
              >
                <Link href="/prompt-library" className="flex items-center">
                  <Book className="h-4 w-4 mr-1" strokeWidth={2} />
                  <span>Prompt Library</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>


        </SidebarGroup>
        <NavAgents />
      </SidebarContent>
      {/* {state !== 'collapsed' && (
        <div className="px-3 py-2">
          <CTACard />
        </div>
      )} */}
      <SidebarFooter>
        <NavUserWithTeams user={user} />
      </SidebarFooter>
      <SidebarRail />

    </Sidebar>
  );
}

// Export the floating button so it can be used in the layout
export { FloatingMobileMenuButton };
