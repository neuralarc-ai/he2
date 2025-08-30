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
  EllipsisIcon,
  SquarePen,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSubscriptionData } from '@/contexts/SubscriptionContext';

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

// Dynamic icon component that changes path based on theme
const DynamicIcon = ({
  lightPath,
  darkPath,
  alt,
  width,
  height,
  className,
}: {
  lightPath: string;
  darkPath: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) => {
  const { theme } = useTheme();
  const iconPath = theme === 'dark' ? darkPath : lightPath;

  return (
    <Image
      src={iconPath}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
};

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
  const [showEditNameDialog, setShowEditNameDialog] = React.useState(false);
  const [editName, setEditName] = React.useState(user.name);
  const [editLoading, setEditLoading] = React.useState(false);
  const [tokenUsage, setTokenUsage] = React.useState(0);
  const [totalTokens, setTotalTokens] = React.useState(500);
  const { theme, setTheme } = useTheme();
  const { enabled: customAgentsEnabled, loading: flagLoading } =
    useFeatureFlag('custom_agents');
  
  // Get real-time subscription data for credit usage
  const { data: subscriptionData } = useSubscriptionData();

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

  // Fetch token usage
  const fetchTokenUsage = React.useCallback(async () => {
    try {
      // Replace this with your real API call
      const response = await fetch('/api/token-usage');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Token usage API response:', data);
      setTokenUsage(data.used_tokens);
    } catch (err) {
      console.error('Error fetching token usage:', err);
      console.log('Using fallback token usage: 22000');
      setTokenUsage(1222); // Fallback value
    }
  }, []);

  // Fetch token usage on component mount
  React.useEffect(() => {
    fetchTokenUsage();
  }, [fetchTokenUsage]);

  // Handle name editing
  const handleEditName = async () => {
    if (!editName.trim() || editName === user.name) {
      setShowEditNameDialog(false);
      return;
    }
    
    if (!personalAccount?.account_id) {
      toast.error('Unable to update account name. Please try again.');
      return;
    }
    
    setEditLoading(true);
    try {
      const supabase = createClient();
      
      // Update both auth user data and account data
      const [authResult, accountResult] = await Promise.all([
        // Update auth user data
        supabase.auth.updateUser({
          data: { name: editName.trim() },
        }),
        // Update account name in basejump.accounts table
        supabase.rpc('update_account', {
          account_id: personalAccount.account_id,
          name: editName.trim(),
        })
      ]);
      
      if (authResult.error) throw authResult.error;
      if (accountResult.error) throw accountResult.error;
      
      // Clear cached names so dashboard will pick up the new name
      localStorage.removeItem('cached_user_name');
      localStorage.removeItem('cached_capitalized_name');
      localStorage.removeItem('cached_welcome_message');
      
      toast.success('Name updated successfully!');
      setShowEditNameDialog(false);
      // Refresh the page to update the sidebar name and clear cache
      window.location.reload();
    } catch (err) {
      console.error('Error updating name:', err);
      toast.error('Failed to update name. Please try again.');
    } finally {
      setEditLoading(false);
    }
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
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:text-center group-data-[collapsible=icon]:ml-0 ml-2">
                  <span className="truncate font-medium group-data-[collapsible=icon]:hidden">
                    Settings
                  </span>
                </div>
                {/* Show user avatar in collapsed state, more icon in expanded state */}
                <div className="ml-auto group-data-[collapsible=icon]:mr-2">
                  <div className="group-data-[collapsible=icon]:block hidden">
                    <Avatar className="h-6 w-6 rounded-lg">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="rounded-lg text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="group-data-[collapsible=icon]:hidden">
                    <DynamicIcon
                      lightPath="/icons/more-horizontal-light.svg"
                      darkPath="/icons/more-horizontal-dark.svg"
                      alt="menu"
                      width={16}
                      height={16}
                      className="size-4"
                    />
                  </div>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 bg-background rounded-3xl p-2"
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
                    <div className="flex items-center gap-2 group">
                      <span className="truncate font-medium">{user.name}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditName(user.name);
                          setShowEditNameDialog(true);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                        aria-label="Edit name"
                      >
                        <SquarePen className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              
              {/* Credit Usage Section */}
              <div className="px-1.5 py-2">
                <div className="text-xs text-muted-foreground mb-2">
                  {subscriptionData ? (
                    subscriptionData.current_usage && subscriptionData.cost_limit ? (
                      subscriptionData.current_usage >= subscriptionData.cost_limit 
                        ? "You have used 100% of your credits"
                        : `You have used ${Math.round((subscriptionData.current_usage / subscriptionData.cost_limit) * 100)}% of your credits`
                    ) : "No usage limit set"
                  ) : "Loading usage..."
                  }
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {subscriptionData ? (
                    subscriptionData.current_usage && subscriptionData.cost_limit ? (
                      `${Math.round((subscriptionData.current_usage || 0) * 100).toLocaleString()} / ${Math.round((subscriptionData.cost_limit || 0) * 100).toLocaleString()}`
                    ) : "0 / 0"
                  ) : "Loading..."
                  }
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: subscriptionData && subscriptionData.current_usage && subscriptionData.cost_limit 
                        ? `${Math.min((subscriptionData.current_usage / subscriptionData.cost_limit) * 100, 100)}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
              
              

              {/* Teams Section */}
              {/* {personalAccount && (
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
                    className="gap-1 rounded-full cursor-pointer"
                  >
                      {/* <DynamicIcon
                        lightPath="/icons/user.svg"
                        darkPath="/icons/user-dark.svg"
                        alt="user"
                        width={20}
                        height={20}
                        className="mb-0 mr-1"
                      /> 
                    {personalAccount.name}                    
                  </DropdownMenuItem>
                </>
              )} */}

              {/* {teamAccounts?.length > 0 && (
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
                      className="gap-1 p-2 py-1.5 rounded-full cursor-pointer"
                    >
                      <div className="flex size-6 items-center justify-center rounded-xs border p-1">
                        <DynamicIcon
                          lightPath="/icons/team.svg"
                          darkPath="/icons/team-dark.svg"
                          alt="team"
                          width={17}
                          height={17}
                          className="shrink-0"
                        />
                      </div>
                      {team.name}                      
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              <DropdownMenuSeparator />
              <DialogTrigger asChild>
                <DropdownMenuItem
                  className="gap-2 p-2 py-1.5 rounded-full cursor-pointer"
                  onClick={() => {
                    setShowNewTeamDialog(true);
                  }}
                >
                  <div className="flex items-center justify-center">
                    <Plus className="size-4" />
                  </div>
                  <div className="text-muted-foreground font-medium">
                    Add team
                  </div>
                </DropdownMenuItem>
              </DialogTrigger> */}
              <DropdownMenuSeparator />

              {/* User Settings Section */}
              <DropdownMenuGroup>                
                <DropdownMenuItem asChild className="rounded-full cursor-pointer">
                  <Link href="/settings/billing">
                    <CreditCard className="h-4 w-4 mb-0" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                {!flagLoading && customAgentsEnabled && (
                  <DropdownMenuItem asChild className="rounded-full cursor-pointer">
                    <Link href="/settings/credentials">
                      {/* <DynamicIcon
                        lightPath="/icons/integrations.svg"
                        darkPath="/icons/integration-dark.svg"
                        alt="integration"
                        width={17}
                        height={17}
                        className="mb-0"
                      /> */}
                      Integrations
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <DropdownMenuItem className="rounded-full cursor-pointer">
                      <div className="flex items-center gap-2 w-full">
                        <span>Theme</span>
                        <ChevronDown className="h-4 w-4 ml-auto rotate-[-90deg]" />
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    side="right" 
                    align="start" 
                    className="w-32 p-3 space-y-1"
                    sideOffset={12}
                  >
                    <DropdownMenuItem
                      onClick={() => setTheme('light')}
                      className="cursor-pointer rounded-md"
                    >
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                      {theme === 'light' && (
                        <span className="ml-auto w-2 h-2 bg-foreground rounded-full" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTheme('dark')}
                      className="cursor-pointer rounded-md"
                    >
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                      {theme === 'dark' && (
                        <span className="ml-auto w-2 h-2 bg-foreground rounded-full" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 hover:text-red-400 focus:text-red-400 focus:bg-red-500/10 rounded-full cursor-pointer"
                onClick={handleLogout}
              >
                {/* <LogoutIcon className="h-4 w-4 text-red-500" /> */}
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

      {/* Edit Name Dialog */}
      <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
        <DialogContent className="sm:max-w-[400px] bg-background border border-border rounded-lg shadow-lg p-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Edit Name</h3>
          </div>
          <div className="p-4">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter your name"
              disabled={editLoading}
              autoFocus
              className="mb-4"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleEditName} 
                disabled={editLoading || !editName.trim() || editName === user.name}
                size="sm"
              >
                {editLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
