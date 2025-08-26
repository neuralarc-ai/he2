'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  BadgeCheck,
  Bell,
  ChevronDown,
  ChevronsUpDown,
  Command,
  CreditCard,
  Key,
  Plus,
  Settings,
  User,
  AudioWaveform,
  Sun,
  Moon,
  KeyRound,
  EllipsisIcon
} from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import NewTeamForm from '@/components/basejump/new-team-form';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { isLocalMode } from '@/lib/config';
import { useFeatureFlag } from '@/lib/feature-flags';

// Custom Logout Icon component using the logout.svg
const LogoutIcon = ({ className }: { className?: string }) => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 43 42" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M2 21L1.21913 20.3753L0.719375 21L1.21913 21.6247L2 21ZM20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20V21V22ZM10 11L9.21913 10.3753L1.21913 20.3753L2 21L2.78087 21.6247L10.7809 11.6247L10 11ZM2 21L1.21913 21.6247L9.21913 31.6247L10 31L10.7809 30.3753L2.78087 20.3753L2 21ZM2 21V22H20V21V20H2V21Z" 
      fill="currentColor"
    />
    <path 
      d="M18 13.2639V8.38851C18 6.77017 18 5.961 18.474 5.4015C18.9479 4.84201 19.7461 4.70899 21.3424 4.44293L35.0136 2.1644C38.2567 1.62388 39.8782 1.35363 40.9391 2.25232C42 3.15102 42 4.79493 42 8.08276V33.9172C42 37.2051 42 38.849 40.9391 39.7477C39.8782 40.6464 38.2567 40.3761 35.0136 39.8356L21.3424 37.5571C19.7461 37.291 18.9479 37.158 18.474 36.5985C18 36.039 18 35.2298 18 33.6115V29.1319" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export function NavUserWithTeams({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { data: accounts } = useAccounts();
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { enabled: customAgentsEnabled, loading: flagLoading } = useFeatureFlag("custom_agents");

  // Prepare personal account and team accounts
  const personalAccount = React.useMemo(
    () => accounts?.find((account) => account.personal_account),
    [accounts],
  );
  const teamAccounts = React.useMemo(
    () => accounts?.filter((account) => !account.personal_account),
    [accounts],
  );

  // Create a default list of teams with logos for the UI (will show until real data loads)
  const defaultTeams = [
    {
      name: personalAccount?.name || 'Personal Account',
      logo: Command,
      plan: 'Personal',
      account_id: personalAccount?.account_id,
      slug: personalAccount?.slug,
      personal_account: true,
    },
    ...(teamAccounts?.map((team) => ({
      name: team.name,
      logo: AudioWaveform,
      plan: 'Team',
      account_id: team.account_id,
      slug: team.slug,
      personal_account: false,
    })) || []),
  ];

  // Use the first team or first entry in defaultTeams as activeTeam
  const [activeTeam, setActiveTeam] = React.useState(defaultTeams[0]);

  // Update active team when accounts load
  React.useEffect(() => {
    if (accounts?.length) {
      const currentTeam = accounts.find(
        (account) => account.account_id === activeTeam.account_id,
      );
      if (currentTeam) {
        setActiveTeam({
          name: currentTeam.name,
          logo: currentTeam.personal_account ? Command : AudioWaveform,
          plan: currentTeam.personal_account ? 'Personal' : 'Team',
          account_id: currentTeam.account_id,
          slug: currentTeam.slug,
          personal_account: currentTeam.personal_account,
        });
      } else {
        // If current team not found, set first available account as active
        const firstAccount = accounts[0];
        setActiveTeam({
          name: firstAccount.name,
          logo: firstAccount.personal_account ? Command : AudioWaveform,
          plan: firstAccount.personal_account ? 'Personal' : 'Team',
          account_id: firstAccount.account_id,
          slug: firstAccount.slug,
          personal_account: firstAccount.personal_account,
        });
      }
    }
  }, [accounts, activeTeam.account_id]);

  // Handle team selection
  const handleTeamSelect = (team) => {
    setActiveTeam(team);

    // Navigate to the appropriate dashboard
    if (team.personal_account) {
      router.push('/dashboard');
    } else {
      router.push(`/${team.slug}`);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!activeTeam) {
    return null;
  }

  return (
    <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                {/* <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar> */}
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:text-center group-data-[collapsible=icon]:ml-0 ml-2">
                  <span className="truncate font-medium group-data-[collapsible=icon]:hidden">Settings</span>
                </div>
                {/* <EllipsisIcon className="ml-auto size-4 group-data-[collapsible=icon]:mr-2" /> */}
                <>
                  <Image
                    src="/icons/more-horizontal-light.svg"
                    alt="menu"
                    width={16}
                    height={16}
                    className="ml-auto size-4 group-data-[collapsible=icon]:mr-2 block dark:hidden"
                  />
                  <Image
                    src="/icons/more-horizontal-dark.svg"
                    alt="menu"
                    width={16}
                    height={16}
                    className="ml-auto size-4 group-data-[collapsible=icon]:mr-2 hidden dark:block"
                  />
                </>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
              side={isMobile ? 'bottom' : 'top'}
              align="start"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1.5 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Teams Section */}
              {personalAccount && (
                <>
                  <DropdownMenuLabel className="text-muted-foreground text-sm">
                    Personal Account
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    key={personalAccount.account_id}
                    onClick={() =>
                      handleTeamSelect({
                        name: personalAccount.name,
                        logo: Command,
                        plan: 'Personal',
                        account_id: personalAccount.account_id,
                        slug: personalAccount.slug,
                        personal_account: true,
                      })
                    }
                    className="gap-1 px-2"
                  >
                    <div className="flex size-8 items-center justify-center">
                      <Image
                                       src="/icons/user.svg" 
                                       alt="user Light Logo"
                                       width={28}
                                       height={28}
                                       className="block dark:hidden mb-0"
                                     />
                                     <Image
                                       src="/icons/user-dark.svg"
                                       alt="user Dark Logo"
                                       width={28}
                                       height={28}
                                       className="hidden dark:block mb-0"
                                     />
                      
                    </div>
                    {personalAccount.name}
                    <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </>
              )}

              {teamAccounts?.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-muted-foreground text-xs mt-2">
                    Teams
                  </DropdownMenuLabel>
                  {teamAccounts.map((team, index) => (
                    <DropdownMenuItem
                      key={team.account_id}
                      onClick={() =>
                        handleTeamSelect({
                          name: team.name,
                          logo: AudioWaveform,
                          plan: 'Team',
                          account_id: team.account_id,
                          slug: team.slug,
                          personal_account: false,
                        })
                      }
                      className="gap-1 p-2"
                    >
                      <div className="flex size-6 items-center justify-center rounded-xs border">
                        <AudioWaveform className="size-4 shrink-0" />
                      </div>
                      {team.name}
                      <DropdownMenuShortcut>⌘{index + 2}</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              <DropdownMenuSeparator />
              <DialogTrigger asChild>
                <DropdownMenuItem 
                  className="gap-2 p-2"
                  onClick={() => {
                    setShowNewTeamDialog(true)
                  }}
                >
                  <div className="flex size-8 items-center justify-center">
                    <Image
                                      src="/icons/team.svg" 
                                       alt="team Light Logo"
                                       width={28}
                                       height={28}
                                       className="block dark:hidden mb-0"
                                     />
                                     <Image
                                       src="/icons/team-dark.svg"
                                       alt="team Dark Logo"
                                       width={28}
                                       height={28}
                                       className="hidden dark:block mb-0"
                                     />
                  </div>
                  <div className="text-muted-foreground font-medium">Add team</div>
                </DropdownMenuItem>
              </DialogTrigger>
              <DropdownMenuSeparator />
              

              {/* User Settings Section */}
              <DropdownMenuGroup>
                {/* <DropdownMenuItem asChild>
                  <Link href="/settings/billing">
                  <CreditCard className="h-4 w-4" />
                    Billing
                  </Link>
                </DropdownMenuItem> */}
                {!flagLoading && customAgentsEnabled && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings/credentials">
                       <Image
                                     src="/icons/integrations.svg" 
                                       alt="integration Light Logo"
                                       width={19}
                                       height={19}
                                       className="block dark:hidden mb-0"
                                     />
                                     <Image
                                       src="/icons/integration-dark.svg"
                                       alt="integration Dark Logo"
                                       width={19}
                                       height={19}
                                       className="hidden dark:block mb-0"
                                     />
                      Integrations
                    </Link>
                  </DropdownMenuItem>
                )}
                {/* {!flagLoading && customAgentsEnabled && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings/api-keys">
                      API Keys (Admin)
                    </Link>
                  </DropdownMenuItem>
                )}
                {isLocalMode() && <DropdownMenuItem asChild>
                  <Link href="/settings/env-manager">
                    Local .Env Manager
                  </Link>
                </DropdownMenuItem>} */}
                {/* <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem> */}
                <DropdownMenuItem
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span>Theme</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className='text-destructive focus:text-destructive focus:bg-destructive/10' onClick={handleLogout}>
                <LogoutIcon className="h-4 w-4 text-destructive" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <DialogContent className="sm:max-w-[425px] border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary rounded-2xl shadow-custom">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Create a new team
          </DialogTitle>
          <DialogDescription className="text-foreground/70">
            Create a team to collaborate with others.
          </DialogDescription>
        </DialogHeader>
        <NewTeamForm />
      </DialogContent>
    </Dialog>
  );
}
