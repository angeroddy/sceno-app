'use client';
import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { Button } from '../../button';

import { useEffect, useState, useRef } from 'react';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '../../navigation-menu';

import { Popover, PopoverContent, PopoverTrigger } from '../../popover';

import { cn } from '@/lib/utils';

import Logo2 from '../../../../app/assets/images/logoApp.png'

// Simple logo component for the navbar
const Logo = (props: React.SVGAttributes<SVGElement>) => {
  return (
    <svg width='1em' height='1em' viewBox='0 0 324 323' fill='currentColor' xmlns='http://www.w3.org/2000/svg' {...props}>
      <rect
        x='88.1023'
        y='144.792'
        width='151.802'
        height='36.5788'
        rx='18.2894'
        transform='rotate(-38.5799 88.1023 144.792)'
        fill='currentColor'
      />
      <rect
        x='85.3459'
        y='244.537'
        width='151.802'
        height='36.5788'
        rx='18.2894'
        transform='rotate(-38.5799 85.3459 244.537)'
        fill='currentColor'
      />
    </svg>
  );
};

// Hamburger icon component
const HamburgerIcon = ({ className, ...props }: React.SVGAttributes<SVGElement>) => (
  <svg
    className={cn('pointer-events-none', className)}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4 12L20 12"
      className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
    />
    <path
      d="M4 12H20"
      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
    />
    <path
      d="M4 12H20"
      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
    />
  </svg>
);

// Types
export interface Navbar01NavLink {
  href: string;
  label: string;
  active?: boolean;
}

export interface Navbar01Props extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  logoHref?: string;
  navigationLinks?: Navbar01NavLink[];
  signInText?: string;
  signInHref?: string;
  ctaText?: string;
  ctaHref?: string;
  onSignInClick?: () => void;
  onCtaClick?: () => void;
  isAuthenticated?: boolean;
  userType?: 'comedian' | 'advertiser';
  onLogout?: () => void;
  loading?: boolean;
  hideHamburger?: boolean;
}

// Default navigation links
const defaultNavigationLinks: Navbar01NavLink[] = [];

export const Navbar01 = React.forwardRef<HTMLElement, Navbar01Props>(
  (
    {
      className,
      logo = <Image src={Logo2} alt="Logo" height={100} width={100} />,
      logoHref = '/',
      navigationLinks = defaultNavigationLinks,
      signInText = 'Se connecter',
      signInHref = '/connexion',
      ctaText = 'Publier une annonce',
      ctaHref = '/inscription/annonceur',
      onSignInClick,
      onCtaClick,
      isAuthenticated = false,
      userType = 'comedian',
      onLogout,
      loading = false,
      hideHamburger = false,
      ...props
    },
    ref
  ) => {
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
      const checkWidth = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          setIsMobile(width < 768); // 768px is md breakpoint
        }
      };

      checkWidth();

      const resizeObserver = new ResizeObserver(checkWidth);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Combine refs
    const combinedRef = React.useCallback((node: HTMLElement | null) => {
      containerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    return (
      <header
        ref={combinedRef}
        className={cn(
          'sticky top-0 z-50 w-full backdrop-blur **:no-underline',
          className
        )}
        {...props}
      >
        <div className="container mx-auto px-4 flex h-28 items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {/* Mobile menu trigger */}
            {isMobile && !hideHamburger && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="group h-9 w-9 hover:bg-accent hover:text-accent-foreground"
                    variant="ghost"
                    size="icon"
                  >
                    <HamburgerIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-2">
                  <NavigationMenu className="max-w-none">
                    <NavigationMenuList className="flex-col items-start gap-1">
                      {navigationLinks.map((link, index) => (
                        <NavigationMenuItem key={index} className="w-full">
                          <button
                            onClick={() => router.push(link.href)}
                            className={cn(
                              "flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer no-underline",
                              link.active
                                ? "bg-accent text-accent-foreground"
                                : "text-foreground/80"
                            )}
                          >
                            {link.label}
                          </button>
                        </NavigationMenuItem>
                      ))}
                    </NavigationMenuList>
                  </NavigationMenu>
                </PopoverContent>
              </Popover>
            )}
            {/* Main nav */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push(logoHref)}
                className={cn(
                  "flex items-center space-x-2 text-primary hover:text-primary/90 transition-colors cursor-pointer"
                )}
              >
                <div className={cn(hideHamburger && isMobile ? "text-5xl sm:text-6xl" : "text-2xl")}>
                  {logo}
                </div>
              </button>
              {/* Navigation menu */}
              {!isMobile && (
                <NavigationMenu className="flex">
                  <NavigationMenuList className="gap-1">
                    {navigationLinks.map((link, index) => (
                      <NavigationMenuItem key={index}>
                        <button
                          onClick={() => router.push(link.href)}
                          className={cn(
                            "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer no-underline",
                            link.active
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground/80 hover:text-foreground"
                          )}
                        >
                          {link.label}
                        </button>
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              )}
            </div>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-3 min-h-[36px]">
            {loading ? (
              // État de chargement : afficher des skeletons pour éviter le flash
              <>
                <div className="h-8 sm:h-9 w-20 sm:w-24 bg-gray-200 animate-pulse rounded-none" />
                <div className="h-8 sm:h-9 w-24 sm:w-32 bg-gray-200 animate-pulse rounded-none" />
              </>
            ) : !isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-white px-2 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground bg-[#E63832]"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onSignInClick) {
                      onSignInClick();
                    } else {
                      router.push(signInHref);
                    }
                  }}
                >
                  {signInText}
                </Button>
                <Button
                  size="sm"
                  className="text-xs sm:text-sm font-medium px-2 sm:px-4 h-8 sm:h-9 shadow-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onCtaClick) {
                      onCtaClick();
                    } else {
                      router.push(ctaHref);
                    }
                  }}
                >
                  {ctaText}
                </Button>
              </>
            ) : (
              <>
                {userType === 'comedian' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer px-2 sm:px-4 h-8 sm:h-9 text-base sm:text-sm font-medium hover:bg-[#E6DAD0]"
                      onClick={() => router.push('/dashboard/profil')}
                    >
                      Mon profil
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer px-2 sm:px-4 h-8 sm:h-9 text-base sm:text-sm font-medium hover:bg-[#E6DAD0]"
                      onClick={() => router.push('/dashboard/preferences')}
                    >
                      Préférences
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-white px-2 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground bg-[#E63832]"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onLogout) {
                      onLogout();
                    }
                  }}
                >
                  <LogOut className="w-4 h-4 sm:hidden" />
                  <span className="hidden sm:inline">Se déconnecter</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }
);

Navbar01.displayName = 'Navbar01';

export { Logo, HamburgerIcon };