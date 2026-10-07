import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authUtils } from '../utils/auth';

const DARK = '#2F4858';
const DARK_RGB = '47,72,88';
const BRAND = '#FEA14C';
const BRAND_RGB = '254,161,76';
const GREEN = '#16a34a';
const AMBER = '#ca8a04';
const RWF_FORMATTER = new Intl.NumberFormat('en-RW', {
  style: 'currency',
  currency: 'RWF',
  maximumFractionDigits: 0,
});

type DashboardStats = {
  totalUsers: number;
  totalGarages: number;
  totalVehicles: number;
  totalServices: number;
  activeServices: number;
  recentUsers: any[];
  recentGarages: any[];
  multiGarageOwners: Array<{
    id: number | string;
    name: string;
    email?: string;
    garageCount: number;
    garageNames: string[];
  }>;
  roleCounts: {
    super_admin: number;
    garage_admin: number;
    service_technician: number;
    car_owner: number;
  };
};

type MultiGarageOwner = DashboardStats['multiGarageOwners'][number];

type GarageDashboardStats = {
  cars_serviced: number;
  unique_clients: number;
  new_updates: number;
  service_requests: {
    today: number;
    week: number;
    month: number;
  };
  jobs: {
    in_progress: number;
    completed: number;
  };
  recent_services: any[];
  top_mechanics: any[];
  top_service_technicians: any[];
  recent_vehicles: any[];
  garage?: {
    id: number;
    name: string;
    city?: string | null;
  };
};

type MetricCardProps = {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: string;
};

type PanelProps = {
  label: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
};

type ChartDatum = {
  label: string;
  value: number;
  highlight?: boolean;
};

type ProgressDatum = {
  label: string;
  value: number;
  color: string;
};

type StatusTone = {
  background: string;
  color: string;
  label: string;
};

const Icon = ({
  d,
  size = 18,
  color = 'currentColor',
}: {
  d: string;
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const icons = {
  revenue: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  car: 'M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v7h-2 M7 17a2 2 0 100-4 2 2 0 000 4z M17 17a2 2 0 100-4 2 2 0 000 4z',
  staff: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  garage: 'M19 21V7l-7-4-7 4v14 M9 21V11h6v10 M5 21h14',
  services: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2',
  check: 'M20 6L9 17l-5-5',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Courier New', monospace",
  fontSize: '0.86rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: `rgba(${DARK_RGB},0.96)`,
  fontWeight: 600,
};

const bodyTextStyle: React.CSSProperties = {
  fontFamily: "'Courier New', monospace",
  fontSize: '0.96rem',
  color: `rgba(${DARK_RGB},0.96)`,
  lineHeight: 1.8,
  fontWeight: 500,
};

const MetricCard = ({ label, value, sub, accent, icon }: MetricCardProps) => (
  <div
    style={{
      background: '#ffffff',
      border: `1px solid rgba(${DARK_RGB},0.06)`,
      borderRadius: 4,
      padding: '1.4rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 3,
        height: '100%',
        background: accent,
      }}
    />
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p style={labelStyle}>{label}</p>
        <p
          style={{
            marginTop: '0.6rem',
            marginBottom: 0,
            fontFamily: "'Impact', sans-serif",
            fontSize: '2.3rem',
            lineHeight: 1,
            color: '#1f3441',
            letterSpacing: '0.02em',
          }}
        >
          {value}
        </p>
        <p
          style={{
            ...bodyTextStyle,
            marginTop: '0.5rem',
            marginBottom: 0,
            fontSize: '0.92rem',
            color: `rgba(${DARK_RGB},0.92)`,
          }}
        >
          {sub}
        </p>
      </div>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 3,
          background: accent === BRAND ? `rgba(${BRAND_RGB},0.08)` : `rgba(${DARK_RGB},0.08)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          flexShrink: 0,
        }}
      >
        <Icon d={icon} size={18} color={accent} />
      </div>
    </div>
  </div>
);

const Panel = ({ label, action, onAction, children }: PanelProps) => (
  <div
    style={{
      background: '#ffffff',
      border: `1px solid rgba(${DARK_RGB},0.06)`,
      borderRadius: 4,
      padding: '1.35rem 1.4rem',
    }}
  >
    <div className="mb-4 flex items-center justify-between gap-3">
      <p style={labelStyle}>{label}</p>
      {action && onAction ? (
        <button
          onClick={onAction}
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: '0.84rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: BRAND,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: 600,
          }}
        >
          {action}
        </button>
      ) : null}
    </div>
    {children}
  </div>
);

const MiniBarChart = ({ items }: { items: ChartDatum[] }) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="flex h-[160px] items-end gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2 h-full">
          <div className="flex h-full w-full items-end">
            <div
              style={{
                width: '100%',
                height: `${Math.max((item.value / maxValue) * 100, 10)}%`,
                background: item.highlight ? BRAND : `rgba(${DARK_RGB},0.12)`,
                borderRadius: '2px 2px 0 0',
                position: 'relative',
                transition: 'height 0.3s ease',
              }}
            >
              {item.highlight ? (
                <div
                  style={{
                    position: 'absolute',
                    top: -18,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.8rem',
                    color: BRAND,
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                  }}
                >
                  {item.value.toLocaleString()}
                </div>
              ) : null}
            </div>
          </div>
          <span
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: '0.82rem',
              color: `rgba(${DARK_RGB},0.92)`,
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const ProgressSummary = ({ items }: { items: ProgressDatum[] }) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: '0.96rem',
                color: `rgba(${DARK_RGB},0.96)`,
                fontWeight: 500,
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: '0.96rem',
                color: DARK,
                fontWeight: 'bold',
              }}
            >
              {item.value.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              height: 5,
              background: `rgba(${DARK_RGB},0.07)`,
              borderRadius: 999,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%`,
                background: item.color,
                borderRadius: 999,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const LoadingBlock = ({ columns = 4 }: { columns?: number }) => (
  <div
    className="grid gap-4"
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
  >
    {Array.from({ length: columns }).map((_, index) => (
      <div
        key={index}
        className="animate-pulse"
        style={{
          background: '#ffffff',
          border: `1px solid rgba(${DARK_RGB},0.06)`,
          borderRadius: 4,
          padding: '1.25rem 1.35rem',
        }}
      >
        <div className="mb-4 h-3 w-28 rounded bg-slate-200" />
        <div className="mb-3 h-10 w-20 rounded bg-slate-200" />
        <div className="h-3 w-36 rounded bg-slate-200" />
      </div>
    ))}
  </div>
);

const getStatusTone = (status?: string): StatusTone => {
  const normalized = (status || '').toLowerCase();

  if (normalized.includes('done') || normalized.includes('completed')) {
    return {
      background: 'rgba(34,197,94,0.1)',
      color: GREEN,
      label: 'Done',
    };
  }

  if (normalized.includes('progress') || normalized.includes('service')) {
    return {
      background: `rgba(${BRAND_RGB},0.12)`,
      color: BRAND,
      label: 'In Service',
    };
  }

  if (normalized.includes('wait') || normalized.includes('pending')) {
    return {
      background: 'rgba(234,179,8,0.1)',
      color: AMBER,
      label: 'Waiting',
    };
  }

  return {
    background: `rgba(${DARK_RGB},0.08)`,
    color: `rgba(${DARK_RGB},0.72)`,
    label: status || 'Unknown',
  };
};

const StatusBadge = ({ status }: { status?: string }) => {
  const tone = getStatusTone(status);

  return (
    <span
      style={{
        background: tone.background,
        color: tone.color,
        fontFamily: "'Courier New', monospace",
        fontSize: '0.8rem',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        padding: '0.32rem 0.72rem',
        borderRadius: 2,
        whiteSpace: 'nowrap',
        fontWeight: 600,
      }}
    >
      {tone.label}
    </span>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const user = authUtils.getUser();
  const isGarageAdmin = user?.role === 'garage_admin';

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalGarages: 0,
    totalVehicles: 0,
    totalServices: 0,
    activeServices: 0,
    recentUsers: [],
    recentGarages: [],
    multiGarageOwners: [],
    roleCounts: {
      super_admin: 0,
      garage_admin: 0,
      service_technician: 0,
      car_owner: 0,
    },
  });

  const [garageStats, setGarageStats] = useState<GarageDashboardStats | null>(null);
  const [garageServices, setGarageServices] = useState<any[]>([]);
  const [garageWorkers, setGarageWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      if (isGarageAdmin) {
        const [garageDashboardResponse, servicesResponse, workersResponse] = await Promise.all([
          api.getGarageDashboardStats(),
          api.getAllServices({ limit: 1000 }),
          api.listServiceTechnicians(),
        ]);

        if (garageDashboardResponse.error) {
          throw new Error(garageDashboardResponse.error);
        }

        if (servicesResponse.error) {
          throw new Error(servicesResponse.error);
        }

        if (workersResponse.error) {
          throw new Error(workersResponse.error);
        }

        setGarageStats(garageDashboardResponse.data || null);
        setGarageServices(servicesResponse.data?.services || []);
        setGarageWorkers(Array.isArray(workersResponse.data) ? workersResponse.data : []);
        return;
      }

      const usersResponse = await api.getUsersWithDetails();
      const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];

      const recentUsers = users
        .filter((entry: any) => entry.role === 'car_owner')
        .sort((a: any, b: any) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime())
        .slice(0, 6);

      const garagesResponse = await api.getGarages();
      const garages = Array.isArray(garagesResponse.data) ? garagesResponse.data : [];
      const recentGarages = garages
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6);
      const ownerGarageMap = new Map<
        number | string,
        MultiGarageOwner
      >();

      garages.forEach((garage: any) => {
        const ownerId = garage.owner?.id ?? garage.owner_user_id;
        if (!ownerId) return;

        const existing: MultiGarageOwner = ownerGarageMap.get(ownerId) || {
          id: ownerId,
          name: garage.owner?.name || 'Unknown owner',
          email: garage.owner?.email || '',
          garageCount: 0,
          garageNames: [],
        };

        existing.garageCount += 1;
        if (garage.name) {
          existing.garageNames.push(garage.name);
        }

        ownerGarageMap.set(ownerId, existing);
      });

      const multiGarageOwners = Array.from(ownerGarageMap.values())
        .filter((owner) => owner.garageCount > 1)
        .sort((a, b) => b.garageCount - a.garageCount || a.name.localeCompare(b.name));

      const vehiclesResponse = await api.getAllVehicles({ limit: 1 });
      const totalVehicles = vehiclesResponse.data?.total || 0;

      const servicesResponse = await api.getAllServices({ limit: 1 });
      const totalServices = servicesResponse.data?.total || 0;

      const activeServicesResponse = await api.getAllServices({
        status: 'in_progress',
        limit: 1,
      });
      const activeServices = activeServicesResponse.data?.total || 0;

      const pendingServicesResponse = await api.getAllServices({
        status: 'pending',
        limit: 1,
      });
      const pendingServices = pendingServicesResponse.data?.total || 0;

      const roleCounts = users.reduce(
        (acc: DashboardStats['roleCounts'], entry: any) => {
          const role = entry?.role as keyof DashboardStats['roleCounts'];
          if (role && role in acc) {
            acc[role] += 1;
          }
          return acc;
        },
        {
          super_admin: 0,
          garage_admin: 0,
          service_technician: 0,
          car_owner: 0,
        }
      );

      setStats({
        totalUsers: users.length,
        totalGarages: garages.length,
        totalVehicles,
        totalServices,
        activeServices: activeServices + pendingServices,
        recentUsers,
        recentGarages,
        multiGarageOwners,
        roleCounts,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRwf = (amount: number) => RWF_FORMATTER.format(amount || 0);

  const superAdminCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      sub: `${stats.roleCounts.car_owner} car owners on the platform`,
      accent: BRAND,
      icon: icons.users,
    },
    {
      label: 'Registered Garages',
      value: stats.totalGarages.toLocaleString(),
      sub: 'Workshops now active in the system',
      accent: DARK,
      icon: icons.garage,
    },
    {
      label: 'Total Vehicles',
      value: stats.totalVehicles.toLocaleString(),
      sub: 'Vehicle records tracked so far',
      accent: GREEN,
      icon: icons.car,
    },
    {
      label: 'Active Services',
      value: stats.activeServices.toLocaleString(),
      sub: `${stats.totalServices.toLocaleString()} total service records`,
      accent: AMBER,
      icon: icons.services,
    },
  ];

  const superAdminProgress: ProgressDatum[] = [
    { label: 'Car Owners', value: stats.roleCounts.car_owner, color: BRAND },
    { label: 'Garage Admins', value: stats.roleCounts.garage_admin, color: AMBER },
    { label: 'Workers', value: stats.roleCounts.service_technician, color: GREEN },
  ];

  const garageMonthlyRevenueMap = new Map<string, number>();
  const garageStatusCounts = {
    in_progress: 0,
    pending: 0,
    completed: 0,
  };

  garageServices.forEach((service: any) => {
    const rawDate = service.completed_at || service.created_at;
    const date = rawDate ? new Date(rawDate) : null;
    if (date && !Number.isNaN(date.getTime())) {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const amount = Number(service.actual_cost ?? service.estimated_cost ?? 0);
      garageMonthlyRevenueMap.set(
        key,
        (garageMonthlyRevenueMap.get(key) || 0) + (Number.isFinite(amount) ? amount : 0)
      );
    }

    if (service.status === 'completed') {
      garageStatusCounts.completed += 1;
    } else if (service.status === 'in_progress') {
      garageStatusCounts.in_progress += 1;
    } else if (service.status === 'pending') {
      garageStatusCounts.pending += 1;
    }
  });

  const garageLastSixMonths: ChartDatum[] = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    return {
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      value: Math.round(garageMonthlyRevenueMap.get(key) || 0),
      highlight: index === 5,
    };
  });

  const currentMonthRevenue = garageLastSixMonths[5]?.value || 0;
  const previousMonthRevenue = garageLastSixMonths[4]?.value || 0;
  const monthlyChange = previousMonthRevenue > 0
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : null;

  const activeWorkers = garageWorkers.filter((worker: any) => worker.active).length;
  const totalWorkers = garageWorkers.length;

  const activeDays = new Set(
    garageServices
      .map((service: any) => {
        const date = service.created_at ? new Date(service.created_at) : null;
        return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
      })
      .filter((value): value is string => Boolean(value))
  ).size;

  const averageServicesPerDay = activeDays > 0 ? garageServices.length / activeDays : 0;

  const garageCards = [
    {
      label: 'Monthly Revenue',
      value: formatRwf(currentMonthRevenue),
      sub:
        monthlyChange === null
          ? 'No previous month data'
          : `${monthlyChange >= 0 ? '↑' : '↓'} ${Math.abs(monthlyChange).toFixed(1)}% vs last month`,
      accent: BRAND,
      icon: icons.revenue,
    },
    {
      label: 'Cars Serviced',
      value: (garageStats?.cars_serviced || 0).toLocaleString(),
      sub: `${garageStats?.unique_clients || 0} unique clients served`,
      accent: DARK,
      icon: icons.car,
    },
    {
      label: 'Active Workers',
      value: `${activeWorkers} / ${totalWorkers}`,
      sub: `${garageStats?.new_updates || 0} unread updates`,
      accent: GREEN,
      icon: icons.staff,
    },
    {
      label: 'Avg. Services / Day',
      value: averageServicesPerDay.toFixed(1),
      sub: `${garageStats?.service_requests?.today || 0} jobs recorded today`,
      accent: AMBER,
      icon: icons.clock,
    },
  ];

  const garageProgress: ProgressDatum[] = [
    { label: 'In Service', value: garageStatusCounts.in_progress, color: BRAND },
    { label: 'Pending', value: garageStatusCounts.pending, color: AMBER },
    { label: 'Done', value: garageStatusCounts.completed, color: GREEN },
  ];

  const garageRecentJobs = garageServices
    .slice()
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at || b.completed_at || 0).getTime() -
        new Date(a.created_at || a.completed_at || 0).getTime()
    )
    .slice(0, 5)
    .map((service: any) => ({
      id: service.id,
      plate: service.vehicle?.license_plate || 'N/A',
      owner: service.vehicle?.owner?.name || 'Unknown owner',
      model: [service.vehicle?.make, service.vehicle?.model].filter(Boolean).join(' ') || '-',
      worker: service.performed_by?.name || 'Unassigned',
      status: service.status,
    }));

  return (
    <div className="space-y-6">
      {loading ? (
        <>
          <LoadingBlock columns={4} />
          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            <div className="h-[250px] animate-pulse rounded-[4px] border border-slate-200 bg-white" />
            <div className="h-[250px] animate-pulse rounded-[4px] border border-slate-200 bg-white" />
          </div>
          <div className="h-[320px] animate-pulse rounded-[4px] border border-slate-200 bg-white" />
        </>
      ) : isGarageAdmin ? (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            {garageCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            <Panel label="Revenue — Last 6 Months">
              <MiniBarChart items={garageLastSixMonths} />
            </Panel>

            <Panel label="Job Status">
              <ProgressSummary items={garageProgress} />
            </Panel>
          </div>

          <Panel
            label="Recent Jobs"
            action="View all →"
            onAction={() => navigate('/dashboard/service-requests')}
          >
            {garageRecentJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr style={{ borderBottom: `1px solid rgba(${DARK_RGB},0.08)` }}>
                      {['Plate', 'Owner', 'Model', 'Worker', 'Status'].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            ...labelStyle,
                            textAlign: 'left',
                            padding: '0 0.75rem 0.8rem 0',
                            color: `rgba(${DARK_RGB},0.8)`,
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {garageRecentJobs.map((job) => (
                      <tr
                        key={job.id}
                        style={{ borderBottom: `1px solid rgba(${DARK_RGB},0.06)` }}
                      >
                        <td
                          style={{
                            ...bodyTextStyle,
                            color: DARK,
                            fontWeight: 'bold',
                            padding: '0.9rem 0.75rem 0.9rem 0',
                          }}
                        >
                          {job.plate}
                        </td>
                        <td style={{ ...bodyTextStyle, padding: '0.9rem 0.75rem 0.9rem 0' }}>
                          {job.owner}
                        </td>
                        <td style={{ ...bodyTextStyle, padding: '0.9rem 0.75rem 0.9rem 0' }}>
                          {job.model}
                        </td>
                        <td style={{ ...bodyTextStyle, padding: '0.9rem 0.75rem 0.9rem 0' }}>
                          {job.worker}
                        </td>
                        <td style={{ padding: '0.9rem 0' }}>
                          <StatusBadge status={job.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ ...bodyTextStyle, margin: 0 }}>No service records available yet.</p>
            )}
          </Panel>
        </>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            {superAdminCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            <Panel
              label="Garage Owners With Many Garages"
              action={stats.multiGarageOwners.length > 0 ? 'View garages →' : undefined}
              onAction={stats.multiGarageOwners.length > 0 ? () => navigate('/dashboard/garages') : undefined}
            >
              {stats.multiGarageOwners.length > 0 ? (
                <div className="space-y-4">
                  {stats.multiGarageOwners.slice(0, 3).map((owner) => (
                    <div
                      key={owner.id}
                      style={{
                        paddingBottom: '1rem',
                        borderBottom: `1px solid rgba(${DARK_RGB},0.08)`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p
                            style={{
                              margin: 0,
                              fontFamily: "'Impact', sans-serif",
                              fontSize: '1.2rem',
                              lineHeight: 1,
                              color: DARK,
                              letterSpacing: '0.02em',
                            }}
                          >
                            {owner.name}
                          </p>
                          <p
                            style={{
                              ...bodyTextStyle,
                              margin: '0.45rem 0 0',
                              fontSize: '0.9rem',
                              color: `rgba(${DARK_RGB},0.72)`,
                            }}
                          >
                            {owner.email || 'No email'}
                          </p>
                        </div>
                        <div
                          style={{
                            flexShrink: 0,
                            padding: '0.35rem 0.7rem',
                            borderRadius: 999,
                            background: `rgba(${BRAND_RGB},0.12)`,
                            color: BRAND,
                            fontFamily: "'Courier New', monospace",
                            fontSize: '0.8rem',
                            letterSpacing: '0.04em',
                            fontWeight: 700,
                          }}
                        >
                          {owner.garageCount} garages
                        </div>
                      </div>
                      <p
                        style={{
                          ...bodyTextStyle,
                          margin: '0.8rem 0 0',
                          fontSize: '0.88rem',
                          color: `rgba(${DARK_RGB},0.86)`,
                        }}
                      >
                        {owner.garageNames.join(' • ')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ ...bodyTextStyle, margin: 0 }}>
                  No garage owners are managing multiple garages yet.
                </p>
              )}
            </Panel>

            <Panel label="User distribution">
              <ProgressSummary items={superAdminProgress} />
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: `1px solid rgba(${DARK_RGB},0.06)`,
                }}
              >
                <p style={{ ...bodyTextStyle, margin: 0 }}>
                  {stats.totalUsers.toLocaleString()} total users across all roles.
                </p>
              </div>
            </Panel>
          </div>

          <Panel
            label="Recent car owners"
            action="View all →"
            onAction={() => navigate('/dashboard/users')}
          >
            {stats.recentUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr style={{ borderBottom: `1px solid rgba(${DARK_RGB},0.08)` }}>
                      {['Name', 'Email', 'Phone', 'Joined'].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            ...labelStyle,
                            textAlign: 'left',
                            padding: '0 0.75rem 0.8rem 0',
                            color: `rgba(${DARK_RGB},0.8)`,
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentUsers.slice(0, 5).map((entry: any) => (
                      <tr
                        key={entry.id}
                        style={{ borderBottom: `1px solid rgba(${DARK_RGB},0.06)` }}
                      >
                        <td
                          style={{
                            ...bodyTextStyle,
                            color: DARK,
                            fontWeight: 'bold',
                            padding: '0.9rem 0.75rem 0.9rem 0',
                          }}
                        >
                          {entry.name || 'No name'}
                        </td>
                        <td style={{ ...bodyTextStyle, padding: '0.9rem 0.75rem 0.9rem 0' }}>
                          {entry.email}
                        </td>
                        <td style={{ ...bodyTextStyle, padding: '0.9rem 0.75rem 0.9rem 0' }}>
                          {entry.phone || '-'}
                        </td>
                        <td style={{ ...bodyTextStyle, padding: '0.9rem 0' }}>
                          {formatDate(entry.created_at || entry.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ ...bodyTextStyle, margin: 0 }}>No recent users to display.</p>
            )}
          </Panel>

          <Panel
            label="Recent garages"
            action="View all →"
            onAction={() => navigate('/dashboard/garages')}
          >
            {stats.recentGarages.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {stats.recentGarages.slice(0, 6).map((garage: any) => (
                  <div
                    key={garage.id}
                    style={{
                      border: `1px solid rgba(${DARK_RGB},0.06)`,
                      borderRadius: 3,
                      padding: '1rem 1.05rem',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Impact', sans-serif",
                        fontSize: '1rem',
                        color: DARK,
                        letterSpacing: '0.03em',
                      }}
                    >
                      {garage.name || 'No garage name'}
                    </p>
                    <p style={{ ...bodyTextStyle, margin: '0.35rem 0 0' }}>
                      {garage.owner?.name || 'Unknown owner'}
                    </p>
                    <p style={{ ...bodyTextStyle, margin: '0.2rem 0 0' }}>
                      {garage.city || 'No city'} • {formatDate(garage.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ ...bodyTextStyle, margin: 0 }}>No recent garages to display.</p>
            )}
          </Panel>
        </>
      )}
    </div>
  );
};

export default Dashboard;
