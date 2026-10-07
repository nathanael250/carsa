import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authUtils } from '../utils/auth';
import logo from '../assets/carsa.png';

const DARK = '#2F4858';
const BRAND = '#FEA14C';
const BRAND_RGB = '254,161,76';
const DARK_RGB = '47,72,88';

type IconKey =
  | 'dashboard'
  | 'users'
  | 'garage'
  | 'approval'
  | 'services'
  | 'oil'
  | 'mechanics'
  | 'requests'
  | 'reports'
  | 'notifications'
  | 'settings'
  | 'logout'
  | 'menu'
  | 'collapseLeft'
  | 'collapseRight'
  | 'bell';

type NavItem = {
  name: string;
  path: string;
  icon: IconKey;
};

const iconPaths: Record<IconKey, string> = {
  dashboard: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  garage: 'M19 21V7l-7-4-7 4v14 M9 21V11h6v10 M5 21h14',
  approval: 'M9 12l2 2 4-4 M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  services: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2',
  oil: 'M14 3H8a2 2 0 00-2 2v6a4 4 0 004 4h0a4 4 0 004-4V5a2 2 0 00-2-2z M9 14h4 M10 18h2 M9 22h4',
  mechanics: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  requests: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  reports: 'M4 19h16 M7 16V8 M12 16V5 M17 16v-4',
  notifications: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  collapseLeft: 'M15 18l-6-6 6-6',
  collapseRight: 'M9 18l6-6-6-6',
  bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0',
};

const iconStrokeWidths: Partial<Record<IconKey, number>> = {
  settings: 1.6,
  menu: 2,
  collapseLeft: 2,
  collapseRight: 2,
  bell: 1.9,
};

const DashboardIcon = ({
  name,
  size = 18,
  color = 'currentColor',
}: {
  name: IconKey;
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={iconStrokeWidths[name] || 1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={iconPaths[name]} />
  </svg>
);

const formatRoleLabel = (role?: string) => {
  if (!role) return 'Admin';
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getUserInitials = (value?: string) => {
  if (!value) return 'AD';
  const clean = value.split('@')[0].trim();
  const parts = clean.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

const matchesPath = (pathname: string, itemPath: string) => {
  if (itemPath === '/dashboard') {
    return pathname === itemPath;
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};

const DashboardLayout = () => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1280;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const user = authUtils.getUser();
  const isGarageAdmin = user?.role === 'garage_admin';
  const displayName = user?.email || (isGarageAdmin ? 'Garage Admin' : 'Super Admin');
  const roleLabel = formatRoleLabel(user?.role);

  const superAdminNav: NavItem[] = [
    { name: 'Overview', path: '/dashboard', icon: 'dashboard' },
    { name: 'Users', path: '/dashboard/users', icon: 'users' },
    { name: 'Garages', path: '/dashboard/garages', icon: 'garage' },
    { name: 'Approvals', path: '/dashboard/approvals', icon: 'approval' },
    { name: 'Services', path: '/dashboard/services', icon: 'services' },
    { name: 'Oil Products', path: '/dashboard/oil-products', icon: 'oil' },
  ];

  const garageAdminNav: NavItem[] = [
    { name: 'Overview', path: '/dashboard', icon: 'dashboard' },
    { name: 'My Garage', path: '/dashboard/garages', icon: 'garage' },
    { name: 'Workers', path: '/dashboard/mechanics', icon: 'mechanics' },
    { name: 'Activities', path: '/dashboard/service-requests', icon: 'requests' },
    { name: 'My Services', path: '/dashboard/my-services', icon: 'requests' },
    { name: 'Notifications', path: '/dashboard/notifications', icon: 'notifications' },
    { name: 'Settings', path: '/dashboard/settings', icon: 'settings' },
  ];

  const navItems = isGarageAdmin ? garageAdminNav : superAdminNav;

  const activeItem = useMemo(
    () => navItems.find((item) => matchesPath(location.pathname, item.path)) || navItems[0],
    [location.pathname, navItems]
  );

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date()),
    []
  );

  const handleLogout = () => {
    authUtils.removeToken();
    window.location.replace('/login');
  };

  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isDesktop && mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }

    document.body.style.overflow = '';
  }, [isDesktop, mobileSidebarOpen]);

  const handleSidebarToggle = () => {
    if (isDesktop) {
      setSidebarExpanded((prev) => !prev);
      return;
    }
    setMobileSidebarOpen((prev) => !prev);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (!isDesktop) {
      setMobileSidebarOpen(false);
    }
  };

  const sidebarWidth = isDesktop ? (sidebarExpanded ? 248 : 78) : 280;

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#eef1f4',
      }}
    >
      {!isDesktop && mobileSidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/55"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: sidebarWidth,
          background: DARK,
          boxShadow: isDesktop ? 'none' : '0 22px 50px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            padding: sidebarExpanded || !isDesktop ? '1.5rem 1.25rem 1rem' : '1.5rem 0.9rem 1rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              background: BRAND,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 3,
              flexShrink: 0,
              clipPath: 'polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%)',
            }}
          >
            <img src={logo} alt="Car SA" className="h-7 w-7 object-contain" />
          </div>

          {sidebarExpanded || !isDesktop ? (
            <div style={{ overflow: 'hidden' }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Impact', sans-serif",
                  color: '#fff',
                  fontSize: '1.05rem',
                  letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                }}
              >
                CAR<span style={{ color: BRAND }}>SA</span>
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Courier New', monospace",
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: '0.84rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                Admin Panel
              </p>
            </div>
          ) : null}
        </div>

        <nav
          style={{
            flex: 1,
            padding: '1rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            overflowY: 'auto',
          }}
        >
          {navItems.map((item) => {
            const isActive = matchesPath(location.pathname, item.path);
            const iconColor = isActive ? BRAND : 'rgba(255,255,255,0.68)';

            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: sidebarExpanded || !isDesktop ? '0.75rem 0.95rem' : '0.75rem 0.8rem',
                  border: 'none',
                  borderRadius: 3,
                  background: isActive ? `rgba(${BRAND_RGB},0.14)` : 'transparent',
                  color: isActive ? BRAND : 'rgba(255,255,255,0.82)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  textAlign: 'left',
                  justifyContent: sidebarExpanded || !isDesktop ? 'flex-start' : 'center',
                }}
                onMouseEnter={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {isActive ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      background: BRAND,
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                ) : null}

                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DashboardIcon name={item.icon} size={17} color={iconColor} />
                </span>

                {sidebarExpanded || !isDesktop ? (
                  <span
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: '0.96rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <button
          onClick={handleSidebarToggle}
          style={{
            margin: '0.75rem',
            padding: '0.65rem',
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: 3,
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DashboardIcon
            name={
              isDesktop
                ? sidebarExpanded
                  ? 'collapseLeft'
                  : 'collapseRight'
                : 'menu'
            }
            size={16}
            color="#ffffff"
          />
        </button>

        <div
          style={{
            padding: sidebarExpanded || !isDesktop ? '1rem 1rem 1.25rem' : '1rem 0.75rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
              justifyContent: sidebarExpanded || !isDesktop ? 'flex-start' : 'center',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: `rgba(${BRAND_RGB},0.18)`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: '0.68rem',
                  color: BRAND,
                  fontWeight: 'bold',
                  letterSpacing: '0.08em',
                }}
              >
                {getUserInitials(displayName)}
              </span>
            </div>

            {sidebarExpanded || !isDesktop ? (
              <div style={{ overflow: 'hidden' }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.96rem',
                    color: '#fff',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayName}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.9)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  {roleLabel}
                </p>
              </div>
            ) : null}
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarExpanded || !isDesktop ? 'flex-start' : 'center',
              gap: 10,
              padding: '0.7rem 0.85rem',
              border: 'none',
              borderRadius: 3,
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.82)',
              cursor: 'pointer',
            }}
          >
            <DashboardIcon name="logout" size={17} color="rgba(255,255,255,0.82)" />
            {sidebarExpanded || !isDesktop ? (
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: '0.92rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Logout
              </span>
            ) : null}
          </button>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
          fontFamily: "'Courier New', monospace",
        }}
      >
        <header
          style={{
            background: '#ffffff',
            borderBottom: `1px solid rgba(${DARK_RGB},0.08)`,
            padding: '0 1rem',
            minHeight: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexShrink: 0,
          }}
          className="sm:px-5 lg:px-8"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <button
              onClick={handleSidebarToggle}
              style={{
                padding: '0.5rem',
                border: 'none',
                borderRadius: 3,
                background: `rgba(${DARK_RGB},0.06)`,
                color: DARK,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DashboardIcon
                name={
                  isDesktop
                    ? sidebarExpanded
                      ? 'collapseLeft'
                      : 'collapseRight'
                    : 'menu'
                }
                size={17}
                color={DARK}
              />
            </button>

            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Courier New', monospace",
                  fontSize: '0.86rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: `rgba(${DARK_RGB},0.94)`,
                  fontWeight: 600,
                }}
              >
                {roleLabel}
              </p>
              <h1
                style={{
                  margin: 0,
                  fontFamily: "'Impact', sans-serif",
                  fontSize: '1.3rem',
                  color: DARK,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeItem?.name || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <span
              className="hidden sm:inline"
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: '0.92rem',
                color: `rgba(${DARK_RGB},0.94)`,
                letterSpacing: '0.04em',
                fontWeight: 600,
              }}
            >
              {dateLabel}
            </span>

            <button
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: DARK,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DashboardIcon name="bell" size={19} color={DARK} />
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 7,
                  height: 7,
                  background: BRAND,
                  borderRadius: '50%',
                  border: '1.5px solid #fff',
                }}
              />
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: DARK,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DashboardIcon name="logout" size={19} color={DARK} />
            </button>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            padding: '1.25rem 1rem 1.75rem',
            overflowY: 'auto',
            fontFamily: "'Courier New', monospace",
          }}
          className="sm:px-5 sm:py-6 lg:px-8"
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
