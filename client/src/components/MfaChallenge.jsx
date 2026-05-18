import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader, AlertCircle, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

export default function MfaChallenge() {
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshMfaLevel, signOut } = useAuth();

    const [factorId, setFactorId] = useState('');
    const [challengeId, setChallengeId] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');

    const redirectTo = location.state?.from || '/dashboard';

    useEffect(() => {
        let cancelled = false;

        async function prepareChallenge() {
            try {
                setLoading(true);
                setError('');

                const { data: factorsData, error: factorsError } =
                    await supabase.auth.mfa.listFactors();

                if (factorsError) throw factorsError;

                const factor = factorsData?.totp?.find(
                    (item) => item.status === 'verified'
                );

                if (!factor) {
                    navigate('/mfa/setup', { replace: true });
                    return;
                }

                const { data: challengeData, error: challengeError } =
                    await supabase.auth.mfa.challenge({
                        factorId: factor.id,
                    });

                if (challengeError) throw challengeError;
                if (cancelled) return;

                setFactorId(factor.id);
                setChallengeId(challengeData.id);
            } catch (err) {
                console.error('MFA challenge error:', err);
                setError(err.message || 'Could not start MFA challenge');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        prepareChallenge();

        return () => {
            cancelled = true;
        };
    }, [navigate]);

    const verify = async () => {
        if (!factorId || !challengeId || code.length !== 6) return;

        try {
            setVerifying(true);
            setError('');

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId,
                code,
            });

            if (verifyError) throw verifyError;

            await refreshMfaLevel?.();

            navigate(redirectTo || '/dashboard', { replace: true });
        } catch (err) {
            setError(err.message || 'Invalid code. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handleSignOut = async () => {
        await signOut?.();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-md w-full">
                <div className="w-14 h-14 rounded-2xl bg-[#98DE38]/20 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-7 h-7 text-[#1B2D7F]" />
                </div>

                <h1 className="text-2xl font-black text-gray-900 mb-2">
                    Two-Factor Verification
                </h1>

                <p className="text-sm text-gray-500 mb-5">
                    Enter the 6-digit code from Google Authenticator to continue.
                </p>

                {loading ? (
                    <div className="py-10 flex justify-center">
                        <Loader className="w-7 h-7 animate-spin text-[#1B2D7F]" />
                    </div>
                ) : (
                    <>
                        <input
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                setError('');
                            }}
                            inputMode="numeric"
                            autoFocus
                            placeholder="123456"
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-black tracking-[0.35em] outline-none focus:border-[#98DE38]"
                        />

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mt-4">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={verify}
                            disabled={code.length !== 6 || verifying || !challengeId}
                            className="w-full mt-5 py-3 rounded-xl bg-[#98DE38] text-black font-black disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {verifying ? 'Verifying...' : 'Verify'}
                        </button>

                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full mt-3 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4" />
                            Sign out
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}