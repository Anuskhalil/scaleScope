import { Link } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
export default function EvidenceEntry() {
 return <Link to="/trust-workspace?tab=evidence" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B2D7F] py-3"><LockKeyhole size={16}/> Private evidence and claim reviews</Link>;
}
