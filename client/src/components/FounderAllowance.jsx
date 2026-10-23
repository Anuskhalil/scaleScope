import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, X } from 'lucide-react';
import { backendApi } from '../lib/backendApi';

export function FounderAllowance() {
  const [usage, setUsage] = useState(null);
  useEffect(() => {
    let mounted = true;
    const load = () => backendApi.getBillingUsage('connection_requests')
      .then(data => { if (mounted) setUsage(data.limit); })
      .catch(() => { if (mounted) setUsage(null); });
    load();
    window.addEventListener('scalescope:request-sent', load);
    window.addEventListener('scalescope:billing-updated', load);
    return () => { mounted = false; window.removeEventListener('scalescope:request-sent', load); window.removeEventListener('scalescope:billing-updated', load); };
  }, []);
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-gray-200 py-3 text-sm">
    <p>{usage ? `${usage.used} of ${usage.limit} monthly requests used` : 'Request allowance unavailable'}<span className="block text-xs text-gray-500 mt-1">Combined across investors, co-founders and founders. Resets monthly at 00:00 UTC.</span></p>
    <Link className="font-semibold text-[#1B2D7F] underline" to={usage?.limit === 50 ? '/billing' : '/pricing'}>{usage?.limit === 50 ? 'Plan & Billing' : 'View plans'}</Link>
  </div>;
}

export function FounderRequestConfirmation({ enabled }) {
  const [request, setRequest] = useState(null);
  const pending = useRef(null);
  const dialog = useRef(null);
  const isOpen = Boolean(request);
  const close = (confirmed) => { pending.current?.(confirmed); pending.current = null; setRequest(null); };
  useEffect(() => {
    if (!enabled) return;
    const handle = async (event) => {
      event.detail.handled = true;
      if (pending.current) { event.detail.resolve(false); return; }
      pending.current = event.detail.resolve;
      setRequest({ loading: true });
      try {
        const data = await backendApi.getBillingUsage('connection_requests');
        if (pending.current === event.detail.resolve) setRequest({ limit: data.limit });
      } catch {
        if (pending.current === event.detail.resolve) setRequest({ error: 'Could not load your allowance. Cancel and try again.' });
      }
    };
    window.addEventListener('scalescope:confirm-request', handle);
    return () => { window.removeEventListener('scalescope:confirm-request', handle); pending.current?.(false); pending.current = null; };
  }, [enabled]);
  useEffect(() => {
    if (isOpen && enabled && !dialog.current?.open) dialog.current?.showModal();
  }, [isOpen, enabled]);
  if (!request || !enabled) return null;
  const limit = request.limit;
  return <dialog ref={dialog} aria-labelledby="request-confirm-title" onCancel={event => { event.preventDefault(); close(false); }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-white p-5 shadow-xl backdrop:bg-black/40">
    <section>
      <div className="flex items-center justify-between gap-3"><h2 id="request-confirm-title" className="text-lg font-bold">Send connection request?</h2><button autoFocus type="button" aria-label="Cancel request" onClick={() => close(false)}><X size={20}/></button></div>
      <p role="status" className="my-4 text-sm">{request.loading ? 'Checking your allowance...' : request.error || `${limit?.used} of ${limit?.limit} monthly requests used. ${Math.max(0, (limit?.limit || 0) - (limit?.used || 0))} remaining.`}</p>
      <p className="text-sm text-gray-600">One new request uses one allowance. Existing conversations stay available. Requests that are declined or withdrawn are not refunded.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={() => close(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
        {limit && limit.used >= limit.limit ? <Link to={limit.limit === 5 ? '/pricing' : '/billing'} onClick={() => close(false)} className="px-4 py-2 bg-[#98DE38] rounded-lg font-semibold">{limit.limit === 5 ? 'Compare Pro' : 'View limits'}</Link> : <button disabled={request.loading || !!request.error || !limit} type="button" onClick={() => close(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#98DE38] rounded-lg font-semibold disabled:opacity-50"><Send size={16}/>Send request</button>}
      </div>
    </section>
  </dialog>;
}
