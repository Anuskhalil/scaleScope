import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Copy,
  Loader,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import { backendApi } from '../lib/backendApi';

const LIVEKIT_CDN =
  'https://cdn.jsdelivr.net/npm/livekit-client@2.15.7/dist/livekit-client.umd.min.js';

let liveKitLoader = null;

function loadLiveKitClient() {
  const existingClient = window.LivekitClient || window.LiveKitClient || window.LiveKit;
  if (existingClient) return Promise.resolve(existingClient);

  if (!liveKitLoader) {
    liveKitLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-livekit-client]');

      if (existing) {
        existing.addEventListener('load', () => resolve(window.LivekitClient));
        existing.addEventListener('error', () => reject(new Error('LiveKit SDK failed to load')));
        return;
      }

      const script = document.createElement('script');
      script.src = LIVEKIT_CDN;
      script.async = true;
      script.dataset.livekitClient = 'true';
      script.onload = () => {
        const client = window.LivekitClient || window.LiveKitClient || window.LiveKit;

        if (!client) {
          reject(new Error('LiveKit SDK loaded but global client was not found'));
          return;
        }

        resolve(client);
      };
      script.onerror = () => reject(new Error('LiveKit SDK failed to load'));
      document.head.appendChild(script);
    });
  }

  return liveKitLoader;
}

const CSS = `
  .meeting-bg {
    background: #0f172a;
    background-image:
      radial-gradient(circle at 20% 10%, rgba(152,222,56,.16), transparent 30%),
      radial-gradient(circle at 80% 0%, rgba(27,45,127,.22), transparent 28%);
  }
  .meeting-panel { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); }
  .meeting-control { transition: transform .15s ease, background .15s ease; }
  .meeting-control:hover { transform: translateY(-1px); }
`;

const initials = (name = '') => {
  return String(name || '?')
    .split(' ')
    .map((item) => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const TrackView = memo(function TrackView({ track, muted, className }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!track || !ref.current) return undefined;

    const element = ref.current;
    track.attach(element);

    return () => {
      track.detach(element);
    };
  }, [track]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
});

const AudioTrack = memo(function AudioTrack({ track }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!track || !ref.current) return undefined;

    const element = ref.current;
    track.attach(element);

    return () => {
      track.detach(element);
    };
  }, [track]);

  return <audio ref={ref} autoPlay />;
});

function collectMedia(room) {
  if (!room) {
    return {
      videoTracks: [],
      audioTracks: [],
      participants: [],
    };
  }

  const videoTracks = [];
  const audioTracks = [];
  const participants = [];

  const addParticipant = (participant, isLocal = false) => {
    const name = participant.name || participant.identity || 'Participant';
    participants.push({
      sid: participant.sid || participant.identity,
      identity: participant.identity,
      name,
      isLocal,
    });

    const publications = [
      ...participant.videoTrackPublications.values(),
      ...participant.audioTrackPublications.values(),
    ];

    publications.forEach((publication) => {
      if (!publication.track) return;

      const item = {
        id: `${participant.identity}-${publication.trackSid || publication.source}`,
        participantId: participant.identity,
        participantName: name,
        source: publication.source,
        track: publication.track,
        isLocal,
      };

      if (publication.kind === 'video') {
        videoTracks.push(item);
      } else if (!isLocal && publication.kind === 'audio') {
        audioTracks.push(item);
      }
    });
  };

  addParticipant(room.localParticipant, true);
  room.remoteParticipants.forEach((participant) => addParticipant(participant, false));

  return {
    videoTracks,
    audioTracks,
    participants,
  };
}

export default function MeetingRoomPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const roomRef = useRef(null);
  const autoJoinAttemptedRef = useRef(false);

  const [state, setState] = useState({
    loading: true,
    joining: false,
    error: '',
    connected: false,
    mic: true,
    camera: true,
    screen: false,
  });
  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [videoTracks, setVideoTracks] = useState([]);
  const [audioTracks, setAudioTracks] = useState([]);
  const messagesPath = profile?.user_type === 'early-stage-founder'
    ? '/founder/messages'
    : '/student/messages';

  const refreshMedia = useCallback(() => {
    const media = collectMedia(roomRef.current);
    setVideoTracks(media.videoTracks);
    setAudioTracks(media.audioTracks);
    setParticipants(media.participants);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await backendApi.getMeeting(meetingId);
        if (!mounted) return;
        setMeeting(response.data?.meeting || null);
      } catch (err) {
        if (!mounted) return;
        setState((prev) => ({
          ...prev,
          error: err.message || 'Could not load meeting',
        }));
      } finally {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
          }));
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [meetingId]);

  const joinMeeting = useCallback(async () => {
    if (!meetingId || state.joining || state.connected) return;

    setState((prev) => ({
      ...prev,
      joining: true,
      error: '',
    }));

    try {
      const [LK, tokenResponse] = await Promise.all([
        loadLiveKitClient(),
        backendApi.getMeetingToken(meetingId),
      ]);

      const tokenData = tokenResponse.data || {};
      const room = new LK.Room({
        adaptiveStream: true,
        dynacast: true,
      });

      const rerenderEvents = [
        LK.RoomEvent.TrackSubscribed,
        LK.RoomEvent.TrackUnsubscribed,
        LK.RoomEvent.LocalTrackPublished,
        LK.RoomEvent.LocalTrackUnpublished,
        LK.RoomEvent.ParticipantConnected,
        LK.RoomEvent.ParticipantDisconnected,
        LK.RoomEvent.ConnectionStateChanged,
      ].filter(Boolean);

      rerenderEvents.forEach((eventName) => {
        room.on(eventName, refreshMedia);
      });

      room.on(LK.RoomEvent.Disconnected, () => {
        setState((prev) => ({
          ...prev,
          connected: false,
        }));
        refreshMedia();
      });

      await room.connect(tokenData.url, tokenData.token);
      roomRef.current = room;

      await Promise.allSettled([
        room.localParticipant.setMicrophoneEnabled(true),
        room.localParticipant.setCameraEnabled(true),
      ]);

      setState((prev) => ({
        ...prev,
        connected: true,
        joining: false,
        mic: true,
        camera: true,
      }));

      refreshMedia();
      toast.success('Joined meeting');
    } catch (err) {
      console.error('Join LiveKit meeting failed:', err);
      setState((prev) => ({
        ...prev,
        joining: false,
        error: err.message || 'Could not join meeting',
      }));
      toast.error(err.message || 'Could not join meeting');
    }
  }, [meetingId, refreshMedia, state.connected, state.joining]);

  useEffect(() => {
    if (
      !state.loading &&
      meeting &&
      !state.connected &&
      !state.joining &&
      !state.error &&
      !autoJoinAttemptedRef.current
    ) {
      autoJoinAttemptedRef.current = true;
      joinMeeting();
    }
  }, [joinMeeting, meeting, state.connected, state.error, state.joining, state.loading]);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;

    const next = !state.mic;
    await room.localParticipant.setMicrophoneEnabled(next);
    setState((prev) => ({ ...prev, mic: next }));
    refreshMedia();
  };

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room) return;

    const next = !state.camera;
    await room.localParticipant.setCameraEnabled(next);
    setState((prev) => ({ ...prev, camera: next }));
    refreshMedia();
  };

  const toggleScreen = async () => {
    const room = roomRef.current;
    if (!room) return;

    const next = !state.screen;
    await room.localParticipant.setScreenShareEnabled(next);
    setState((prev) => ({ ...prev, screen: next }));
    refreshMedia();
  };

  const leaveMeeting = async () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setState((prev) => ({ ...prev, connected: false }));
    navigate(messagesPath);
  };

  const copyMeetingLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success('Meeting link copied');
  };

  const primaryTracks = useMemo(() => {
    return videoTracks.length ? videoTracks : participants.map((participant) => ({
      id: `empty-${participant.identity}`,
      participantId: participant.identity,
      participantName: participant.name,
      isLocal: participant.isLocal,
      track: null,
    }));
  }, [participants, videoTracks]);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader className="w-8 h-8 animate-spin text-[#98DE38]" />
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen meeting-bg text-white pt-16">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="min-w-0">
            <Link
              to={messagesPath}
              className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white mb-2"
            >
              <ArrowLeft className="w-4" />
              Back to messages
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black truncate">
              {meeting?.title || 'ScaleScope Meeting'}
            </h1>
            <p className="text-sm text-slate-300">
              LiveKit room for connected ScaleScope users.
            </p>
          </div>

          <div className="md:ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyMeetingLink}
              className="meeting-control px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-bold inline-flex items-center gap-2"
            >
              <Copy className="w-4" />
              Copy Link
            </button>
            <div className="px-3 py-2 rounded-xl bg-white/10 text-sm font-bold inline-flex items-center gap-2">
              <Users className="w-4 text-[#98DE38]" />
              {participants.length || 1}
            </div>
          </div>
        </header>

        {state.error && (
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="bg-red-500/10 border border-red-400/30 text-red-100 rounded-2xl p-4">
              <p className="font-bold">Meeting issue</p>
              <p className="text-sm mt-1">{state.error}</p>
              <button
                type="button"
                onClick={() => {
                  autoJoinAttemptedRef.current = false;
                  joinMeeting();
                }}
                className="mt-3 px-4 py-2 rounded-xl bg-[#98DE38] text-black text-sm font-black"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-28">
          <section className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {primaryTracks.map((item) => (
                <article
                  key={item.id}
                  className="meeting-panel rounded-2xl overflow-hidden min-h-64 relative"
                >
                  {item.track ? (
                    <TrackView
                      track={item.track}
                      muted={item.isLocal}
                      className="w-full h-full min-h-64 object-cover bg-black"
                    />
                  ) : (
                    <div className="min-h-64 flex items-center justify-center bg-slate-900">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl mx-auto bg-[#98DE38] text-black flex items-center justify-center font-black text-xl">
                          {initials(item.participantName)}
                        </div>
                        <p className="text-sm text-slate-300 mt-3">Camera off</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute left-3 bottom-3 px-3 py-1.5 rounded-xl bg-black/55 text-xs font-bold">
                    {item.participantName}
                    {item.isLocal ? ' (You)' : ''}
                  </div>
                </article>
              ))}

              {state.joining && (
                <div className="meeting-panel rounded-2xl min-h-64 flex items-center justify-center">
                  <Loader className="w-8 h-8 animate-spin text-[#98DE38]" />
                </div>
              )}
            </div>

            <aside className="meeting-panel rounded-2xl p-4 h-fit">
              <h2 className="font-black text-lg mb-3">Participants</h2>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.sid}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#98DE38] text-black flex items-center justify-center text-xs font-black">
                      {initials(participant.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{participant.name}</p>
                      <p className="text-xs text-slate-400">
                        {participant.isLocal ? 'You' : 'Guest'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        </main>

        {audioTracks.map((item) => (
          <AudioTrack key={item.id} track={item.track} />
        ))}

        <footer className="fixed left-0 right-0 bottom-0 z-40 px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="max-w-xl mx-auto meeting-panel rounded-2xl p-2 sm:p-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={toggleMic}
              disabled={!state.connected}
              className={`meeting-control p-3 rounded-xl ${state.mic ? 'bg-white/10' : 'bg-red-600'} disabled:opacity-50`}
              aria-label="Toggle microphone"
            >
              {state.mic ? <Mic className="w-5" /> : <MicOff className="w-5" />}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              disabled={!state.connected}
              className={`meeting-control p-3 rounded-xl ${state.camera ? 'bg-white/10' : 'bg-red-600'} disabled:opacity-50`}
              aria-label="Toggle camera"
            >
              {state.camera ? <Camera className="w-5" /> : <CameraOff className="w-5" />}
            </button>
            <button
              type="button"
              onClick={toggleScreen}
              disabled={!state.connected}
              className={`meeting-control p-3 rounded-xl ${state.screen ? 'bg-[#98DE38] text-black' : 'bg-white/10'} disabled:opacity-50`}
              aria-label="Toggle screen share"
            >
              <MonitorUp className="w-5" />
            </button>
            <button
              type="button"
              onClick={leaveMeeting}
              className="meeting-control px-4 sm:px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black inline-flex items-center gap-2"
            >
              <PhoneOff className="w-5" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
