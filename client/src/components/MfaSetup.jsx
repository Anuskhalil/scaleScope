import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck,
    ArrowLeft,
    Loader,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

export default function MfaSetup() {
    const navigate = useNavigate();
    const { refreshMfaLevel } = useAuth();

    const [factorId, setFactorId] = useState('');
    const [qrImage, setQrImage] = useState('');
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [alreadyEnabled, setAlreadyEnabled] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const cleanupUnverifiedTotpFactors = async () => {
        const { data, error } = await supabase.auth.mfa.listFactors();

        if (error) throw error;

        const verifiedFactor = data?.totp?.find((factor) => factor.status === 'verified');

        if (verifiedFactor) {
            return {
                verified: true,
                verifiedFactor,
            };
        }

        const unverifiedFactors = data?.totp?.filter(
            (factor) => factor.status !== 'verified'
        ) || [];

        for (const factor of unverifiedFactors) {
            await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch((err) => {
                console.warn('Could not remove stale MFA factor:', err?.message || err);
            });
        }

        return {
            verified: false,
            verifiedFactor: null,
        };
    };

    const startEnrollment = async () => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            setAlreadyEnabled(false);
            setFactorId('');
            setQrImage('');
            setSecret('');
            setCode('');

            const cleanup = await cleanupUnverifiedTotpFactors();

            if (cleanup.verified) {
                setAlreadyEnabled(true);
                setSuccess('Google Authenticator is already enabled on your account.');
                return;
            }

            const uniqueName = `Google Authenticator ${Date.now()}`;

            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: uniqueName,
                issuer: 'ScaleScope',
            });

            if (error) throw error;

            setFactorId(data.id);

            const qrCode = data?.totp?.qr_code || '';

            if (qrCode.startsWith('<svg')) {
                setQrImage(`data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`);
            } else {
                setQrImage(qrCode);
            }

            setSecret(data?.totp?.secret || '');
            setQrImage(data.totp.qr_code);
            setSecret(data.totp.secret || '');
        } catch (err) {
            console.error('MFA enroll error:', err);
            setError(err.message || 'Could not start MFA setup');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        startEnrollment();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const verifyEnrollment = async () => {
        if (!factorId || code.length !== 6) return;

        try {
            setVerifying(true);
            setError('');
            setSuccess('');

            const { data: challengeData, error: challengeError } =
                await supabase.auth.mfa.challenge({
                    factorId,
                });

            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code,
            });

            if (verifyError) throw verifyError;

            await refreshMfaLevel?.();

            setSuccess('Google Authenticator has been enabled successfully.');
            setAlreadyEnabled(true);

            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 1200);
        } catch (err) {
            console.error('MFA verify error:', err);
            setError(err.message || 'Invalid code. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const disableMfa = async () => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const { data, error } = await supabase.auth.mfa.listFactors();

            if (error) throw error;

            const factors = data?.totp || [];

            for (const factor of factors) {
                await supabase.auth.mfa.unenroll({ factorId: factor.id });
            }

            await refreshMfaLevel?.();

            setAlreadyEnabled(false);
            setSuccess('Google Authenticator has been removed.');
            await startEnrollment();
        } catch (err) {
            console.error('MFA disable error:', err);
            setError(err.message || 'Could not remove authenticator.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-md w-full">
                <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5"
                >
                    <ArrowLeft className="w-4" />
                    Back
                </button>

                <div className="w-14 h-14 rounded-2xl bg-[#98DE38]/20 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-7 h-7 text-[#1B2D7F]" />
                </div>

                <h1 className="text-2xl font-black text-gray-900 mb-2">
                    Set up Google Authenticator
                </h1>

                <p className="text-sm text-gray-500 mb-5">
                    Scan the QR code using Google Authenticator, then enter the 6-digit code.
                </p>

                {loading ? (
                    <div className="py-10 flex justify-center">
                        <Loader className="w-7 h-7 animate-spin text-[#1B2D7F]" />
                    </div>
                ) : (
                    <>
                        {alreadyEnabled && (
                            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-green-700 font-bold">
                                        Google Authenticator is enabled.
                                    </p>
                                    <p className="text-xs text-green-600 mt-1">
                                        Next login will require a 6-digit code from your authenticator app.
                                    </p>
                                </div>
                            </div>
                        )}

                        {!alreadyEnabled && qrImage && (
                            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex justify-center mb-4">
                                <img
                                    src={qrImage}
                                    alt="Google Authenticator QR Code"
                                    className="w-[190px] h-[190px]"
                                />
                            </div>
                        )}

                        {!alreadyEnabled && secret && (
                            <div className="mb-4">
                                <p className="text-xs text-gray-500 mb-1">
                                    Can’t scan? Enter this secret manually:
                                </p>
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono break-all">
                                    {secret}
                                </div>
                            </div>
                        )}

                        {!alreadyEnabled && (
                            <>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    6-digit code
                                </label>

                                <input
                                    value={code}
                                    onChange={(e) => {
                                        setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                        setError('');
                                    }}
                                    inputMode="numeric"
                                    placeholder="123456"
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-black tracking-[0.35em] outline-none focus:border-[#98DE38]"
                                />
                            </>
                        )}

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mt-4">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {success && !alreadyEnabled && (
                            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mt-4">
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-green-700">{success}</p>
                            </div>
                        )}

                        {!alreadyEnabled ? (
                            <button
                                type="button"
                                onClick={verifyEnrollment}
                                disabled={code.length !== 6 || verifying || !factorId}
                                className="w-full mt-5 py-3 rounded-xl bg-[#98DE38] text-black font-black disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {verifying ? 'Verifying...' : 'Verify and Enable'}
                            </button>
                        ) : (
                            <div className="space-y-3 mt-5">
                                <button
                                    type="button"
                                    onClick={() => navigate('/dashboard')}
                                    className="w-full py-3 rounded-xl bg-[#98DE38] text-black font-black"
                                >
                                    Continue
                                </button>

                                <button
                                    type="button"
                                    onClick={disableMfa}
                                    className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50"
                                >
                                    Disable and set up again
                                </button>
                            </div>
                        )}

                        {!alreadyEnabled && (
                            <button
                                type="button"
                                onClick={startEnrollment}
                                className="w-full mt-3 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold flex items-center justify-center gap-2 hover:bg-gray-50"
                            >
                                <RefreshCw className="w-4" />
                                Reset setup
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}