/** Marks testing builds clearly, so test data is never mistaken for live data. */
const EnvironmentBanner = () => {
  if (import.meta.env.VITE_APP_ENV !== 'testing') return null;
  return (
    <div className="fixed bottom-3 right-3 z-[100] pointer-events-none rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
      Test environment · not live data
    </div>
  );
};

export default EnvironmentBanner;
