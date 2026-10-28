import { useMemo, useState } from 'react';
import { toCanvas, toSVG } from 'bwip-js/browser';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.transpip.carsa';

type CodeFormat = 'datamatrix' | 'qrcode';

const formatLabels: Record<CodeFormat, string> = {
  datamatrix: 'Data Matrix',
  qrcode: 'QR code',
};

const inputClass =
  'mt-1 w-full border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent';

const download = (href: string, filename: string) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Printable codes that open CarSa on the Google Play Store when scanned,
 * for stickers, stamps, flyers and garage materials.
 */
const DataMatrix = () => {
  const [url, setUrl] = useState(PLAY_STORE_URL);
  const [format, setFormat] = useState<CodeFormat>('datamatrix');
  const [sizeMm, setSizeMm] = useState(30);
  const [caption, setCaption] = useState('Scan to get the CarSa app');

  const options = useMemo(
    () => ({
      bcid: format,
      text: url.trim(),
      scale: 4,
      paddingwidth: 2,
      paddingheight: 2,
      backgroundcolor: 'FFFFFF',
      ...(format === 'qrcode' ? { eclevel: 'M' } : {}),
    }),
    [format, url]
  );

  const { svg, error } = useMemo(() => {
    if (!url.trim()) return { svg: '', error: 'Enter the link the code should open.' };
    try {
      return { svg: toSVG(options), error: '' };
    } catch (err) {
      return { svg: '', error: err instanceof Error ? err.message : 'Could not create the code.' };
    }
  }, [options, url]);

  const fileBase = `carsa-${format === 'datamatrix' ? 'data-matrix' : 'qr-code'}`;

  const downloadSvg = () => {
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    download(blobUrl, `${fileBase}.svg`);
    URL.revokeObjectURL(blobUrl);
  };

  const downloadPng = () => {
    const canvas = document.createElement('canvas');
    // Large scale: about 1000px wide, sharp enough for print shops.
    toCanvas(canvas, { ...options, scale: 24 });
    download(canvas.toDataURL('image/png'), `${fileBase}.png`);
  };

  const print = () => {
    const win = window.open('', '_blank', 'width=600,height=700');
    if (!win) return;
    const sized = svg.replace('<svg ', `<svg style="width:${sizeMm}mm;height:${sizeMm}mm" `);
    win.document.write(`<!doctype html><html><head><title>CarSa code</title>
      <style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif}
      figure{margin:0;text-align:center}figcaption{margin-top:3mm;font-size:${Math.max(sizeMm / 8, 2.5)}mm;font-weight:bold}</style>
      </head><body><figure>${sized}${caption.trim() ? `<figcaption>${caption.replace(/</g, '&lt;')}</figcaption>` : ''}</figure>
      <script>window.onload=function(){window.print()}</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">App Code</h1>
        <p className="text-sm text-gray-700 mt-1">
          Print or stamp this code on stickers, receipts and garage materials. Scanning it opens CarSa on the Google Play Store.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800">Code type</label>
            <div className="mt-1 flex gap-2">
              {(Object.keys(formatLabels) as CodeFormat[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setFormat(value)}
                  className={`px-4 py-2 rounded-lg text-sm border ${
                    format === value
                      ? 'bg-[#2F4858] text-white border-[#2F4858]'
                      : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {formatLabels[value]}
                </button>
              ))}
            </div>
            {format === 'datamatrix' && (
              <p className="text-xs text-amber-800 mt-2">
                Data Matrix codes stay readable when very small (good for stamps). Most Android cameras and Google Lens read them;
                some iPhone cameras only read QR codes, so test with the phones your customers use.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800">Link the code opens</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass} />
            {url.trim() !== PLAY_STORE_URL && (
              <button onClick={() => setUrl(PLAY_STORE_URL)} className="text-xs text-[#C25E00] font-medium mt-1 hover:underline">
                Reset to the CarSa Play Store link
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800">Printed size (mm)</label>
              <input
                type="number"
                min={10}
                max={200}
                value={sizeMm}
                onChange={(e) => setSizeMm(Math.min(Math.max(Number(e.target.value) || 10, 10), 200))}
                className={inputClass}
              />
              <p className="text-xs text-gray-600 mt-1">Keep it at least 15 mm wide so phones can scan it.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800">Text under the code (print)</label>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={downloadSvg}
              disabled={!svg}
              className="px-4 py-2 bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21] disabled:opacity-50 text-sm font-medium"
            >
              Download SVG (for printing)
            </button>
            <button
              onClick={downloadPng}
              disabled={!svg}
              className="px-4 py-2 border border-gray-400 text-gray-900 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
            >
              Download PNG
            </button>
            <button
              onClick={print}
              disabled={!svg}
              className="px-4 py-2 border border-gray-400 text-gray-900 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
            >
              Print
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6 flex flex-col items-center justify-center">
          {error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : (
            <>
              <div
                className="w-56 h-56 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              {caption.trim() && <p className="mt-3 font-bold text-gray-900">{caption}</p>}
              <p className="mt-4 text-xs text-gray-600 text-center break-all max-w-sm">{url}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataMatrix;
