import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { authUtils } from '../utils/auth';

const DARK = '#2F4858';
const DARK_RGB = '47,72,88';
const BRAND = '#FEA14C';
const GREEN = '#16a34a';
const AMBER = '#ca8a04';

interface Garage {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  registration_number: string;
  owner?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
  documents?: any[];
  created_at: string;
  updated_at: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Worker {
  id: number;
  name: string;
  active: boolean;
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
  performed_by?: {
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

const GarageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = authUtils.getUser();
  const isGarageAdmin = user?.role === 'garage_admin';
  const [garage, setGarage] = useState<Garage | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGarage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchGarage = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.getGarages();
      if (response.error) {
        setError(response.error);
        return;
      }
      const list = Array.isArray(response.data) ? response.data : [];
      const found = list.find((g: Garage) => String(g.id) === String(id));
      if (!found) {
        setError('Garage not found');
        return;
      }
      setGarage(found);

      const [workersResponse, servicesResponse] = await Promise.all([
        api.listServiceTechnicians(found.id),
        api.getAllServices({
          limit: 1000,
          garage_id: found.id,
        }),
      ]);

      if (workersResponse.error) {
        setError(workersResponse.error);
        return;
      }

      if (servicesResponse.error) {
        setError(servicesResponse.error);
        return;
      }

      setWorkers(Array.isArray(workersResponse.data) ? workersResponse.data : []);
      setServices(servicesResponse.data?.services || []);
    } catch (err) {
      setError('Failed to load garage details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatRwf = (amount: number) =>
    `RWF ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  if (loading) {
    return (
      <div style={{ ...panelStyle, padding: '1.5rem' }}>
        <p style={bodyStyle}>Loading garage details...</p>
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

  if (!garage) return null;

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

  const averageServicesPerDay = activityDays > 0 ? services.length / activityDays : 0;
  const averageMoneyPerDay = activityDays > 0 ? moneyEarned / activityDays : 0;
  const workersFromServices = new Set(
    services
      .map((service) => service.performed_by?.name?.trim())
      .filter((name): name is string => Boolean(name))
  ).size;
  const workerCount = workers.length > 0 ? workers.length : workersFromServices;

  const statCards = [
    { label: 'Workers', value: workerCount, accent: DARK },
    { label: 'Cars Served', value: carsServed, accent: BRAND },
    {
      label: 'Money Earned',
      value: formatRwf(moneyEarned),
      accent: GREEN,
    },
    { label: 'Services Average / Day', value: averageServicesPerDay.toFixed(1), accent: AMBER },
    {
      label: 'Money Earned Average / Day',
      value: formatRwf(averageMoneyPerDay),
      accent: BRAND,
    },
  ];

  const detailItems = [
    { label: 'Address', value: garage.address || '-' },
    { label: 'Registration', value: garage.registration_number || '-' },
    { label: 'Created', value: formatDate(garage.created_at || garage.createdAt || null) },
    { label: 'Updated', value: formatDate(garage.updated_at || garage.updatedAt || null) },
  ];

  if (!isGarageAdmin) {
    detailItems.unshift(
      { label: 'Owner', value: garage.owner?.name || '-' },
      { label: 'Owner Email', value: garage.owner?.email || '-' }
    );
  }

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
        ← Back to Garages
      </button>

      <div
        style={{
          ...panelStyle,
          padding: '1.7rem 1.85rem',
        }}
      >
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
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
              {garage.name}
            </h1>
            <p style={{ ...bodyStyle, marginTop: '0.5rem', color: `rgba(${DARK_RGB},0.72)` }}>
              {garage.city}, {garage.country}
            </p>
          </div>
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

      <div className="grid gap-4 xl:grid-cols-5">
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
            Garage Activities
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
                fontFamily: "'Impact', sans-serif",
                fontSize: '1.1rem',
                color: `rgba(${DARK_RGB},0.38)`,
              }}
            >
              G
            </div>
            <p style={{ ...bodyStyle, marginTop: '1.25rem', color: `rgba(${DARK_RGB},0.45)` }}>
              No garage activity found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: `1px solid rgba(${DARK_RGB},0.08)` }}>
                  {['Vehicle', 'Owner', 'Service', 'Worker', 'Status', 'Created', 'Costs'].map((heading) => (
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
                    <td style={{ ...bodyStyle, padding: '0.95rem 1.5rem' }}>
                      {service.performed_by?.name || 'N/A'}
                    </td>
                    <td style={{ ...bodyStyle, padding: '0.95rem 1.5rem', textTransform: 'capitalize' }}>
                      {service.status.replace('_', ' ')}
                    </td>
                    <td style={{ ...bodyStyle, padding: '0.95rem 1.5rem' }}>
                      {formatDateTime(service.created_at)}
                    </td>
                    <td style={{ ...bodyStyle, padding: '0.95rem 1.5rem' }}>
                      Est: {service.estimated_cost != null ? formatRwf(Number(service.estimated_cost) || 0) : '-'}
                      {' / '}
                      Act: {service.actual_cost != null ? formatRwf(Number(service.actual_cost) || 0) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {garage.documents && garage.documents.length > 0 && (
        <div style={panelStyle}>
          <div
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
              Business Documents
            </h2>
          </div>
          <div className="space-y-3" style={{ padding: '1.5rem' }}>
            {garage.documents.map((doc: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4"
                style={{
                  border: `1px solid rgba(${DARK_RGB},0.08)`,
                  borderRadius: 4,
                  padding: '1rem 1.1rem',
                }}
              >
                <div>
                  <p style={{ ...bodyStyle, color: DARK, textTransform: 'capitalize' }}>
                    {doc.doc_type || 'Document'}
                  </p>
                  {doc.issued_date && (
                    <p style={{ ...bodyStyle, marginTop: '0.25rem', fontSize: '0.84rem', color: `rgba(${DARK_RGB},0.72)` }}>
                      Issued: {formatDate(doc.issued_date)}
                    </p>
                  )}
                  {doc.expiry_date && (
                    <p style={{ ...bodyStyle, marginTop: '0.15rem', fontSize: '0.84rem', color: `rgba(${DARK_RGB},0.72)` }}>
                      Expires: {formatDate(doc.expiry_date)}
                    </p>
                  )}
                </div>
                {doc.file_path && (
                  <a
                    href={doc.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: BRAND,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    View Document
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GarageDetails;
