import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const DARK = '#2F4858';
const DARK_RGB = '47,72,88';
const BRAND = '#FEA14C';
const GREEN = '#16a34a';
const RWF_FORMATTER = new Intl.NumberFormat('en-RW', {
  style: 'currency',
  currency: 'RWF',
  maximumFractionDigits: 0,
});

interface Mechanic {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  active: boolean;
  created_at: string;
  createdAt?: string;
}

interface ServiceItem {
  id: number;
  status: string;
  created_at: string;
  estimated_cost: string | number | null;
  actual_cost: string | number | null;
  vehicle?: {
    license_plate: string;
    make: string;
    model: string;
    owner?: {
      name: string;
      email: string;
    };
  };
  service_catalog?: {
    name: string;
  };
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Courier New', monospace",
  fontSize: '0.84rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: `rgba(${DARK_RGB},0.92)`,
  fontWeight: 600,
  margin: 0,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: "'Courier New', monospace",
  fontSize: '0.96rem',
  color: `rgba(${DARK_RGB},0.94)`,
  fontWeight: 500,
  margin: 0,
};

const panelStyle: React.CSSProperties = {
  background: '#ffffff',
  border: `1px solid rgba(${DARK_RGB},0.06)`,
  borderRadius: 4,
};

const statusTone = (active: boolean) => ({
  background: active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
  color: active ? GREEN : '#dc2626',
  label: active ? 'Active' : 'Disabled',
});

const formatRwf = (value: string | number | null | undefined) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '-';
  return RWF_FORMATTER.format(amount);
};

const EmptyActivityIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke={`rgba(${DARK_RGB},0.36)`}
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const MetricCard = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) => (
  <div
    style={{
      ...panelStyle,
      padding: '1.35rem 1.45rem',
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
    <p style={labelStyle}>{label}</p>
    <p
      style={{
        margin: '0.55rem 0 0',
        fontFamily: "'Impact', sans-serif",
        fontSize: '2.5rem',
        lineHeight: 1,
        color: DARK,
        letterSpacing: '0.02em',
      }}
    >
      {value}
    </p>
  </div>
);

const MechanicDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const mechanicResponse = await api.listServiceTechnicians();
      if (mechanicResponse.error) {
        setError(mechanicResponse.error);
        return;
      }

      const list = Array.isArray(mechanicResponse.data) ? mechanicResponse.data : [];
      const found = list.find((item: Mechanic) => String(item.id) === String(id));
      if (!found) {
        setError('Worker not found');
        return;
      }

      setMechanic(found);

      const baseParams: any = { limit: 100, service_technician_id: id };
      const listServices = await api.getAllServices(baseParams);

      setServices(listServices.data?.services || []);
    } catch (err) {
      setError('Failed to load worker details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ ...panelStyle, padding: '1.5rem' }}>
        <p style={bodyStyle}>Loading worker details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: '0.92rem',
            color: `rgba(${DARK_RGB},0.9)`,
            fontWeight: 600,
          }}
        >
          ← Back
        </button>
        <div
          style={{
            ...panelStyle,
            padding: '1rem 1.2rem',
            color: '#b91c1c',
            background: '#fef2f2',
            borderColor: '#fecaca',
          }}
        >
          <p style={{ ...bodyStyle, color: '#b91c1c' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!mechanic) {
    return null;
  }

  const badge = statusTone(mechanic.active);
  const initials = mechanic.name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const carsServed = new Set(
    services
      .map((service) => service.vehicle?.license_plate?.trim())
      .filter((plate): plate is string => Boolean(plate))
  ).size;

  const moneyEarned = services.reduce((sum, service) => {
    const rawAmount = service.actual_cost ?? service.estimated_cost ?? 0;
    const amount = Number(rawAmount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const activityDays = new Set(
    services
      .map((service) => {
        const date = service.created_at ? new Date(service.created_at) : null;
        return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
      })
      .filter((value): value is string => Boolean(value))
  ).size;

  const averageServices = activityDays > 0 ? services.length / activityDays : 0;
  const averageMoneyEarned = activityDays > 0 ? moneyEarned / activityDays : 0;

  const statCards = [
    { label: 'Cars Served', value: carsServed, accent: BRAND },
    {
      label: 'Money Earned',
      value: formatRwf(moneyEarned),
      accent: GREEN,
    },
    { label: 'Services Average / Day', value: averageServices.toFixed(1), accent: DARK },
    {
      label: 'Money Earned Average / Day',
      value: formatRwf(averageMoneyEarned),
      accent: BRAND,
    },
  ];

  const detailItems = [
    { label: 'Phone', value: mechanic.phone || '-' },
    { label: 'Gender', value: mechanic.gender || '-' },
    { label: 'Date of Birth', value: formatDate(mechanic.date_of_birth) },
    { label: 'Registered', value: formatDate(mechanic.created_at || mechanic.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2"
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: '0.92rem',
          color: `rgba(${DARK_RGB},0.86)`,
          fontWeight: 600,
        }}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to Workers
      </button>

      <div
        style={{
          ...panelStyle,
          padding: '1.7rem 1.85rem',
        }}
      >
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: DARK,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Impact', sans-serif",
                fontSize: '2rem',
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h1
                style={{
                  margin: 0,
                  fontFamily: "'Impact', sans-serif",
                  fontSize: '2rem',
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                  color: DARK,
                }}
              >
                {mechanic.name}
              </h1>
              <p style={{ ...bodyStyle, marginTop: '0.5rem', color: `rgba(${DARK_RGB},0.72)` }}>
                {mechanic.email}
              </p>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginTop: '0.9rem',
                  padding: '0.32rem 0.75rem',
                  borderRadius: 2,
                  background: badge.background,
                  color: badge.color,
                  fontFamily: "'Courier New', monospace",
                  fontSize: '0.78rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                {badge.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            style={{
              alignSelf: 'flex-start',
              background: BRAND,
              color: '#ffffff',
              border: 'none',
              borderRadius: 4,
              padding: '0.85rem 1.35rem',
              fontFamily: "'Courier New', monospace",
              fontSize: '0.88rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              cursor: 'default',
            }}
          >
            Edit Profile
          </button>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {detailItems.map((item) => (
            <div key={item.label}>
              <p style={labelStyle}>{item.label}</p>
              <p style={{ ...bodyStyle, marginTop: '0.55rem' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
        ))}
      </div>

      <div style={panelStyle}>
        <div
          className="flex items-center justify-between gap-4"
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: `1px solid rgba(${DARK_RGB},0.08)`,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "'Impact', sans-serif",
              fontSize: '1.4rem',
              letterSpacing: '0.02em',
              color: DARK,
            }}
          >
            Worker Activities
          </h2>
          <span
            style={{
              padding: '0.36rem 0.8rem',
              borderRadius: 999,
              background: `rgba(${DARK_RGB},0.06)`,
              color: `rgba(${DARK_RGB},0.74)`,
              fontFamily: "'Courier New', monospace",
              fontSize: '0.8rem',
              letterSpacing: '0.04em',
              fontWeight: 700,
            }}
          >
            {services.length} records
          </span>
        </div>

        {services.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{ minHeight: 240, padding: '2rem' }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: `rgba(${DARK_RGB},0.05)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <EmptyActivityIcon />
            </div>
            <p style={{ ...bodyStyle, marginTop: '1.25rem', color: `rgba(${DARK_RGB},0.45)` }}>
              No service activity found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: `1px solid rgba(${DARK_RGB},0.08)` }}>
                  {['Vehicle', 'Owner', 'Service', 'Status', 'Created', 'Costs'].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        ...labelStyle,
                        textAlign: 'left',
                        padding: '1rem 1.5rem 0.85rem 1.5rem',
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.id}
                    style={{ borderBottom: `1px solid rgba(${DARK_RGB},0.06)` }}
                  >
                    <td style={{ ...bodyStyle, padding: '0.95rem 1.5rem' }}>
                      {service.vehicle?.license_plate || 'N/A'}
                      {service.vehicle?.make || service.vehicle?.model
                        ? ` • ${service.vehicle?.make || ''} ${service.vehicle?.model || ''}`.trimEnd()
                        : ''}
                    </td>
                    <td style={{ ...bodyStyle, padding: '0.95rem 1.5rem' }}>
                      {service.vehicle?.owner?.name || 'N/A'}
                    </td>
                    <td style={{ ...bodyStyle, padding: '0.95rem 1.5rem' }}>
                      {service.service_catalog?.name || 'N/A'}
                    </td>
                    <td style={{ ...bodyStyle, padding: '0.95rem 1.5rem', textTransform: 'capitalize' }}>
                      {service.status.replace('_', ' ')}
                    </td>
                    <td style={{ ...bodyStyle, padding: '0.95rem 1.5rem' }}>
                      {formatDateTime(service.created_at)}
                    </td>
                    <td style={{ ...bodyStyle, padding: '0.95rem 1.5rem' }}>
                      Est: {service.estimated_cost != null ? formatRwf(service.estimated_cost) : '-'} / Act: {service.actual_cost != null ? formatRwf(service.actual_cost) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MechanicDetails;
