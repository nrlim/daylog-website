'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const FIBONACCI_CARDS = [1, 2, 3, 5, 8, 13];

interface Participant {
  name: string;
  card: number | null;
  revealed: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [playerName, setPlayerName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isInSession, setIsInSession] = useState(false);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [animatingCard, setAnimatingCard] = useState<number | null>(null);
  const [swiping, setSwiping] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [showRetroSpinner, setShowRetroSpinner] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [spinHistory, setSpinHistory] = useState<string[]>([]);

  // Check URL parameters for session ID on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('session');
    if (urlSessionId) {
      setSessionId(urlSessionId);
    }
  }, []);

  // Poll for session updates from backend
  useEffect(() => {
    if (isInSession && sessionId) {
      const interval = setInterval(async () => {
        try {
          const response = await api.get(`/poker/session/${sessionId}`);
          if (response.data) {
            const sessionData = response.data;
            setParticipants(sessionData.participants || []);
            setShowResults(sessionData.showResults || false);
            
            const myData = sessionData.participants.find((p: Participant) => p.name === playerName);
            if (myData) {
              setSelectedCard(myData.card);
              setIsRevealed(myData.revealed);
            }
          }
        } catch (error) {
          console.error('Failed to fetch session:', error);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isInSession, sessionId, playerName]);

  const generateSessionId = () => {
    return `poker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleCreateSession = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name first');
      return;
    }

    setIsCreatingSession(true);
    try {
      const newSessionId = generateSessionId();
      await api.post('/poker/session', {
        id: newSessionId,
        creatorName: playerName
      });

      setSessionId(newSessionId);
      setIsInSession(true);
      setParticipants([{
        name: playerName,
        card: null,
        revealed: false
      }]);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session. Please try again.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && sessionId.trim()) {
      try {
        const response = await api.post(`/poker/session/${sessionId}/join`, {
          playerName
        });

        if (response.data) {
          setParticipants(response.data.participants || []);
          setShowResults(response.data.showResults || false);
          setIsInSession(true);
        }
      } catch (error) {
        console.error('Failed to join session:', error);
        alert('Failed to join session. Please check the Session ID and try again.');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await authAPI.login(loginData);
      setUser(response.data.user);
      setShowLoginModal(false);
      router.push('/dashboard');
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCardSelect = async (value: number) => {
    setSwiping(true);
    setAnimatingCard(value);
    setSelectedCard(value);
    setIsRevealed(false);
    
    // Reset flip animation after it completes
    setTimeout(() => {
      setSwiping(false);
    }, 600);
    
    try {
      await api.post(`/poker/session/${sessionId}/vote`, {
        playerName,
        card: value,
        revealed: false
      });
    } catch (error) {
      console.error('Failed to select card:', error);
    }
  };

  const handleReveal = async () => {
    setIsRevealed(true);
    
    try {
      await api.post(`/poker/session/${sessionId}/vote`, {
        playerName,
        card: selectedCard,
        revealed: true
      });
    } catch (error) {
      console.error('Failed to reveal card:', error);
    }
  };

  const handleRevealAll = async () => {
    try {
      await api.post(`/poker/session/${sessionId}/reveal-all`);
      setShowResults(true);
    } catch (error) {
      console.error('Failed to reveal all cards:', error);
    }
  };

  const handleReset = async () => {
    try {
      await api.post(`/poker/session/${sessionId}/reset`);
      setShowResults(false);
      setSelectedCard(null);
      setIsRevealed(false);
    } catch (error) {
      console.error('Failed to reset session:', error);
    }
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}?session=${sessionId}`;
    navigator.clipboard.writeText(link);
    alert('Session link copied to clipboard!');
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    alert('Session ID copied to clipboard!');
  };

  const getCardDisplay = (value: number | null) => {
    if (value === null) return '-';
    if (value === 100) return '?';
    if (value === 101) return '☕';
    return value;
  };

  const getEstimateInsight = () => {
    const avg = parseFloat(calculateAverage());
    if (isNaN(avg)) {
      return {
        level: 'Menunggu',
        icon: '⏳',
        color: 'gray',
        title: 'Menunggu suara dari tim...',
        description: 'Estimasi akan muncul setelah semua anggota tim memberikan suara.',
        suggestion: '⏳ Pastikan semua anggota tim sudah memberikan estimasi mereka.'
      };
    }
    
    if (avg <= 2) {
      return {
        level: 'Sangat Kecil',
        icon: '✨',
        color: 'green',
        title: 'Task Sederhana (1-2 SP)',
        description: 'Task ini sangat sederhana dan dapat diselesaikan dengan cepat dalam satu hari kerja.',
        suggestion: '✓ Prioritas tinggi untuk sprint. Ideal untuk junior developer atau sebagai warm-up task sebelum task kompleks.'
      };
    } else if (avg <= 5) {
      return {
        level: 'Kecil hingga Sedang',
        icon: '⚙️',
        color: 'blue',
        title: 'Task Standar (3-5 SP)',
        description: 'Task dengan kompleksitas moderat yang memerlukan perencanaan dan diskusi tim untuk akurasi.',
        suggestion: '✓ Estimasi standar untuk sprint. Butuh persiapan teknis minor. Cocok untuk developer berpengalaman.'
      };
    } else if (avg <= 8) {
      return {
        level: 'Sedang hingga Besar',
        icon: '⚡',
        color: 'amber',
        title: 'Task Kompleks (8 SP)',
        description: 'Task yang cukup kompleks memerlukan diskusi mendalam, desain, dan testing menyeluruh dari tim.',
        suggestion: '⚠️ Pertimbangkan untuk dipecah menjadi sub-tasks lebih kecil (max 5 SP per task). Ada risiko teknis yang perlu dikelola.'
      };
    } else {
      return {
        level: 'Sangat Besar',
        icon: '🔥',
        color: 'red',
        title: 'Task Terlalu Besar (13+ SP)',
        description: 'Task ini sangat kompleks dan harus dipecah menjadi beberapa user stories yang lebih kecil sebelum planning.',
        suggestion: '❌ REKOMENDASI: Pecah task ini menjadi multiple stories terpisah (max 5 SP masing-masing). Hindari task besar di sprint planning.'
      };
    }
  };

  const getConsensusLevel = () => {
    const votes = participants.filter(p => p.card !== null && p.card < 100).map(p => p.card as number);
    if (votes.length === 0) return { level: 'Belum ada suara', emoji: '⏳', color: 'gray', detail: 'Menunggu tim memberikan estimasi mereka' };
    
    const max = Math.max(...votes);
    const min = Math.min(...votes);
    const range = max - min;
    
    if (range === 0) {
      return { level: 'Kesepakatan Kuat', emoji: '🎯', color: 'green', detail: 'Tim sepenuhnya setuju dengan estimasi ini. Lanjutkan ke sprint planning.' };
    } else if (range <= 2) {
      return { level: 'Kesepakatan Baik', emoji: '✓', color: 'blue', detail: 'Tim rata-rata setuju. Diskusi singkat mungkin diperlukan untuk kejelasan task.' };
    } else if (range <= 5) {
      return { level: 'Kesepakatan Cukup', emoji: '⚠️', color: 'amber', detail: 'Ada perbedaan pendapat signifikan. Diskusi mendalam diperlukan untuk align dengan tim sebelum sprint dimulai.' };
    } else {
      return { level: 'Perbedaan Signifikan', emoji: '⚡', color: 'red', detail: 'Tim sangat tidak sepakat (range >5). Planning poker ulang atau diskusi teknis mendalam sangat diperlukan sebelum sprint dimulai.' };
    }
  };

  const calculateAverage = (): string => {
    const validCards = participants
      .filter(p => p.card !== null && p.card < 100)
      .map(p => p.card as number);
    
    if (validCards.length === 0) return '0';
    const sum = validCards.reduce((acc, val) => acc + val, 0);
    return (sum / validCards.length).toFixed(1);
  };

  const handleRetroSpin = () => {
    // Filter participants yang belum pernah berbicara
    const availableParticipants = participants.filter(p => !spinHistory.includes(p.name));
    
    if (availableParticipants.length === 0) {
      alert('Semua peserta sudah berbicara di retrospective!');
      return;
    }
    
    setIsSpinning(true);
    setSelectedSpeaker(null);
    
    // Simulate spinning animation - 3 seconds of fast random selections
    let currentIndex = 0;
    const spinInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      setSelectedSpeaker(availableParticipants[randomIndex].name);
      currentIndex++;
      
      if (currentIndex > 25) { // After 25 iterations (about 3 seconds)
        clearInterval(spinInterval);
        
        // Final selection - truly random
        const finalIndex = Math.floor(Math.random() * availableParticipants.length);
        const finalSpeaker = availableParticipants[finalIndex].name;
        setSelectedSpeaker(finalSpeaker);
        setSpinHistory([...spinHistory, finalSpeaker]);
        setIsSpinning(false);
      }
    }, 120);
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-md border-b border-blue-100 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-400 to-teal-500 p-2 rounded-xl shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent tracking-tight">DayLog</h1>
            </div>
            <button onClick={() => setShowLoginModal(true)} className="text-blue-600 hover:text-blue-700 transition-colors p-2 hover:bg-blue-50 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-88px)] px-4 py-8">
        {!isInSession ? (
          <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/20">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-teal-500 rounded-2xl mb-3 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-1 bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Estimation Session
              </h2>
              <p className="text-gray-600 text-sm">Collaborate and estimate together</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-semibold text-xs uppercase tracking-wide">
                Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800 transition-all duration-200"
                placeholder="Enter your name..."
              />
            </div>

            <button
              onClick={handleCreateSession}
              disabled={!playerName.trim() || isCreatingSession}
              className="w-full bg-gradient-to-r from-blue-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-teal-600 transition-all duration-200 mb-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isCreatingSession ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                <span className="flex items-center justify-center text-sm">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Session
                </span>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-500 font-medium">OR JOIN EXISTING</span>
              </div>
            </div>

            <form onSubmit={handleJoinSession}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-semibold text-xs uppercase tracking-wide">
                  Session ID
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800 transition-all duration-200"
                  placeholder="Enter session ID..."
                />
              </div>
              <button
                type="submit"
                disabled={!playerName.trim() || !sessionId.trim()}
                className="w-full bg-white text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blue-300 shadow-md hover:shadow-lg text-sm"
              >
                Join Session
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-7xl space-y-6">
            {/* Header Section */}
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/20">
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-gradient-to-br from-blue-400 to-teal-500 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Session {sessionId.substring(0, 12)}...</h3>
                      <p className="text-sm text-gray-600">Welcome, <span className="font-semibold text-blue-600">{playerName}</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={copySessionId} className="text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-all font-medium border border-blue-200">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy ID
                  </button>
                  <button onClick={copySessionLink} className="text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-all font-medium border border-blue-200">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Share
                  </button>
                  <button onClick={handleRevealAll} disabled={showResults} className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Reveal
                  </button>
                  <button onClick={handleReset} className="text-xs bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-all font-semibold shadow-md">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset
                  </button>
                  <button onClick={() => setShowRetroSpinner(true)} disabled={participants.length <= 1} className="text-xs bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4.804A7.968 7.968 0 015.25 9m19.5 0a7.967 7.967 0 01-3.75 5.196m0 0A7.968 7.968 0 019 20.196m19.5 0A7.968 7.968 0 0112 3.804" />
                    </svg>
                    Retrospective Spin
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column - Voting Section */}
              <div className="lg:col-span-2">
                <div className="bg-gradient-to-br from-white/98 to-white/90 backdrop-blur-md p-10 rounded-2xl shadow-lg border border-white/30">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-2">
                      {selectedCard === null ? 'Make Your Estimate' : 'Your Selection'}
                    </h2>
                    <p className="text-gray-500 font-medium text-sm">
                      {selectedCard === null ? 'Choose a number to estimate' : 'Click Change to adjust your choice'}
                    </p>
                  </div>
                  
                  {selectedCard === null || isEditingCard ? (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {FIBONACCI_CARDS.map((value) => (
                        <button key={value} onClick={() => {
                          handleCardSelect(value);
                          setIsEditingCard(false);
                        }} className={`aspect-[3/4] card-elegant disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${selectedCard === value && !isEditingCard ? 'ring-8 ring-blue-500 ring-offset-3 scale-110 shadow-2xl bg-gradient-to-br from-blue-100 to-blue-50 hover:scale-115 hover:shadow-3xl hover:ring-blue-600' : 'hover:ring-2 hover:ring-blue-200'} ${swiping && selectedCard !== value ? 'card-swiped card-back' : ''}`}>
                          <div className={`absolute inset-0 flex items-center justify-center card-number text-white ${selectedCard === value && !isEditingCard ? 'text-3xl font-bold' : 'text-2xl'} ${swiping && selectedCard !== value ? 'opacity-0' : ''}`}>{value}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="aspect-[3/4] w-32 card-elegant ring-8 ring-blue-500 ring-offset-3 shadow-2xl bg-gradient-to-br from-blue-100 to-blue-50 mb-8">
                        <div className="absolute inset-0 flex items-center justify-center card-number text-white text-5xl font-bold">{selectedCard}</div>
                      </div>
                      <button onClick={() => setIsEditingCard(true)} className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-blue-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-sm">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Change Selection
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Participants & Stats */}
              <div className="space-y-6">
                {/* Participants */}
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/20">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Participants ({participants.length})
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {participants.map((participant, index) => (
                      <div key={index} className={`p-3 rounded-lg border-2 transition-all ${participant.name === playerName ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-800">{participant.name}</div>
                            {participant.name === playerName && <div className="text-xs text-blue-600 font-medium">You</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {participant.card !== null && (showResults || participant.revealed) ? (
                                <span className="font-bold text-purple-600">{getCardDisplay(participant.card)}</span>
                              ) : participant.card !== null ? (
                                '🃏'
                              ) : (
                                '⏳'
                              )}
                            </span>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${participant.card !== null ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {participant.card !== null ? '✓' : '○'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                {showResults && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200 shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Estimation Results
                    </h3>
                    
                    {/* Estimate Insight */}
                    {(() => {
                      const insight = getEstimateInsight();
                      const consensus = getConsensusLevel();
                      return (
                        <div className="space-y-4">
                          {/* Main Estimate Card */}
                          <div className={`p-4 rounded-lg border-2 bg-white border-${insight.color}-300`}>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="text-3xl font-bold mb-1">{insight.icon}</div>
                                <div className="text-lg font-bold text-gray-800">{insight.title}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{calculateAverage()}</div>
                                <div className="text-xs text-gray-500 mt-1">{insight.level}</div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
                              <strong>💡 Suggestion:</strong> {insight.suggestion}
                            </div>
                          </div>

                          {/* Consensus Level */}
                          <div className={`p-3 rounded-lg border-2 bg-white border-${consensus.color}-300`}>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">Team Consensus</span>
                              <span className="text-lg font-bold flex items-center gap-2">
                                <span>{consensus.emoji}</span>
                                <span className={`text-${consensus.color}-600`}>{consensus.level}</span>
                              </span>
                            </div>
                          </div>

                          {/* Average Progress */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">Estimate Range</span>
                              <span className="text-sm font-bold text-gray-700">
                                {Math.min(...participants.filter(p => p.card !== null && p.card < 100).map(p => p.card as number), 0)} - {Math.max(...participants.filter(p => p.card !== null && p.card < 100).map(p => p.card as number), 0)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{width: `${(parseFloat(calculateAverage()) / 13) * 100}%`}}></div>
                            </div>
                          </div>

                          {/* Participation */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">Participation</span>
                              <span className="text-sm font-bold text-indigo-600">{participants.filter(p => p.card !== null).length}/{participants.length}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{width: `${(participants.filter(p => p.card !== null).length / participants.length) * 100}%`}}></div>
                            </div>
                          </div>

                          {/* Vote Distribution */}
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-600">Vote Distribution</span>
                            <div className="grid grid-cols-3 gap-2">
                              {[1, 2, 3, 5, 8, 13].map((card) => {
                                const count = participants.filter(p => p.card === card && (showResults || p.revealed)).length;
                                return (
                                  <div key={card} className={`p-2 rounded-lg text-center border-2 transition-all ${count > 0 ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-300'}`}>
                                    <div className="text-sm font-bold text-gray-800">{card}</div>
                                    <div className={`text-xs font-semibold ${count > 0 ? 'text-blue-600' : 'text-gray-500'}`}>{count}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="pt-3 border-t border-green-200">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-center">
                                <div className="text-green-600 font-bold">✓ {participants.filter(p => p.card !== null).length}</div>
                                <div className="text-gray-500">Voted</div>
                              </div>
                              <div className="text-center">
                                <div className="text-orange-600 font-bold">⏳ {participants.filter(p => p.card === null).length}</div>
                                <div className="text-gray-500">Waiting</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/20 relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-3 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-1 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Welcome Back
              </h2>
              <p className="text-gray-600 text-sm">Sign in to your DayLog account</p>
            </div>

            {loginError && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-start text-sm">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-semibold text-xs uppercase tracking-wide">
                  Username
                </label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 transition-all duration-200"
                  placeholder="Enter your username..."
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 font-semibold text-xs uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 transition-all duration-200"
                  placeholder="Enter your password..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Retrospective Spinner Modal */}
      {showRetroSpinner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-lg w-full border border-white/20 relative">
            <button
              onClick={() => setShowRetroSpinner(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-3 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4.804A7.968 7.968 0 015.25 9m19.5 0a7.967 7.967 0 01-3.75 5.196m0 0A7.968 7.968 0 019 20.196m19.5 0A7.968 7.968 0 0112 3.804" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-1 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Retrospective Spin
              </h2>
              <p className="text-gray-600 text-sm">Siapa yang akan berbicara pertama?</p>
            </div>

            {/* Spinner Wheel */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-48">
                {/* Spinner Background */}
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 shadow-xl transition-transform duration-500 ${isSpinning ? 'animate-spin' : ''}`}>
                  {/* Participant Names arranged in circle - hanya yang belum terpilih */}
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    {(() => {
                      const availableParticipants = participants.filter(p => !spinHistory.includes(p.name));
                      return availableParticipants.length > 0 && availableParticipants.map((participant, index) => {
                        const angle = (index / availableParticipants.length) * 360;
                        const x = 100 + 70 * Math.cos((angle - 90) * Math.PI / 180);
                        const y = 100 + 70 * Math.sin((angle - 90) * Math.PI / 180);
                        return (
                          <text
                            key={index}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-xs font-bold fill-purple-700"
                            style={{ fontSize: '11px' }}
                          >
                            {participant.name.substring(0, 4)}
                          </text>
                        );
                      });
                    })()}
                  </svg>
                </div>

                {/* Center Circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-xl flex items-center justify-center border-4 border-white">
                    {!selectedSpeaker || isSpinning ? (
                      <span className="text-white text-3xl animate-pulse">🎯</span>
                    ) : (
                      <span className="text-center">
                        <div className="text-white text-xs font-bold">Akan berbicara</div>
                      </span>
                    )}
                  </div>
                </div>

                {/* Pointer at top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-red-500" style={{borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '12px solid rgb(239, 68, 68)'}}></div>
                </div>
              </div>
            </div>

            {/* Selected Speaker Display */}
            {selectedSpeaker && !isSpinning && (
              <div className="text-center mb-6">
                <p className="text-gray-600 text-sm mb-2">Orang yang terpilih untuk retrospective:</p>
                <div className="inline-block px-6 py-3 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-xl">
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {selectedSpeaker}
                  </p>
                </div>
              </div>
            )}

            {/* Spin History */}
            {spinHistory.length > 0 && (
              <div className="mb-6 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">📋 Sudah Berbicara:</p>
                <div className="flex flex-wrap gap-2">
                  {spinHistory.map((name, index) => (
                    <span key={index} className="px-3 py-1 bg-gradient-to-r from-purple-200 to-pink-200 text-purple-700 rounded-full text-xs font-semibold">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleRetroSpin}
                disabled={isSpinning}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:-translate-y-0.5"
              >
                {isSpinning ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Spinning...
                  </span>
                ) : (
                  '🎡 SPIN!'
                )}
              </button>
              <button
                onClick={() => setShowRetroSpinner(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-400 transition-all duration-200 shadow-lg transform hover:-translate-y-0.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
