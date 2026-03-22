import React, { useContext, useState, useEffect } from 'react';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Coins, X, AlertTriangle, Copy } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const WalletView = ({ navigate }) => {
  const { state, updateWallet, addNotification, setState, t } = useContext(AppContext);
  const [mode, setMode] = useState('main'); 
  const [inputValue, setInputValue] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('usdt_bep20');
  const [activeCoins, setActiveCoins] = useState(null);
  const [cpf, setCpf] = useState('');
  const usdToBrl = Number(import.meta?.env?.VITE_USD_TO_BRL || 0);
  const pixFeePercent = Number(import.meta?.env?.VITE_PIX_FEE_PERCENT || 0);
  const [pixInvoice, setPixInvoice] = useState(null);
  const [cryptoInvoice, setCryptoInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pixPollCount, setPixPollCount] = useState(0);
  const [cryptoPollCount, setCryptoPollCount] = useState(0);
  const [pendingPixDeposits, setPendingPixDeposits] = useState([]);
  const [isPendingPixLoading, setIsPendingPixLoading] = useState(false);
  const [pendingCryptoDeposits, setPendingCryptoDeposits] = useState([]);
  const [isPendingCryptoLoading, setIsPendingCryptoLoading] = useState(false);
  const [swapHistoryLoading, setSwapHistoryLoading] = useState(false);
  const [swapHistory, setSwapHistory] = useState([]);
  const [depositHistoryLoading, setDepositHistoryLoading] = useState(false);
  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawHistoryLoading, setWithdrawHistoryLoading] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [transferHistoryLoading, setTransferHistoryLoading] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);

  // Carregar moedas ativas do banco (via Admin Settings)
  useEffect(() => {
      // Mock inicial, idealmente viria do Context ou API
      // Mas como payment_settings é protegido, para a Wallet pública
      // deveríamos ter um endpoint público que retorna apenas as moedas ativas.
      // Para este MVP, vamos assumir que todas estão ativas ou implementar um fetch simples se possível.
      // Como não temos endpoint público, vamos manter hardcoded mas preparado para receber props.
  }, []);

  const loadSwapHistory = async () => {
    if (swapHistoryLoading) return;
    setSwapHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('id,type,amount,currency,fee,status,description,created_at')
        .eq('user_id', userId)
        .in('type', ['swap_usd_to_mph', 'swap_mph_to_usd'])
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) throw error;
      setSwapHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar histórico de swaps:', err);
      addNotification('Falha ao carregar histórico de swaps.', 'danger');
    } finally {
      setSwapHistoryLoading(false);
    }
  };

  const loadDepositHistory = async () => {
    if (depositHistoryLoading) return;
    setDepositHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('deposits')
        .select('id,method,status,amount_usd,provider_reference,pay_currency,created_at,paid_at,expires_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setDepositHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar histórico de depósitos:', err);
      addNotification('Falha ao carregar histórico de depósitos.', 'danger');
    } finally {
      setDepositHistoryLoading(false);
    }
  };

  const loadWithdrawHistory = async () => {
    if (withdrawHistoryLoading) return;
    setWithdrawHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('id,type,amount,currency,fee,status,description,created_at')
        .eq('user_id', userId)
        .eq('type', 'withdrawal')
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) throw error;
      setWithdrawHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar histórico de saques:', err);
      addNotification('Falha ao carregar histórico de saques.', 'danger');
    } finally {
      setWithdrawHistoryLoading(false);
    }
  };

  const loadTransferHistory = async () => {
    if (transferHistoryLoading) return;
    setTransferHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('id,type,amount,currency,fee,status,description,created_at')
        .eq('user_id', userId)
        .in('type', ['transfer_in', 'transfer_out'])
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) throw error;
      setTransferHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar histórico de transferências:', err);
      addNotification('Falha ao carregar histórico de transferências.', 'danger');
    } finally {
      setTransferHistoryLoading(false);
    }
  };

  useEffect(() => {
    setPixInvoice(null);
    setCryptoInvoice(null);
    setPixPollCount(0);
    setCryptoPollCount(0);
  }, [inputValue]);

  useEffect(() => {
    if (mode !== 'swap') return;
    loadSwapHistory();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'deposit') return;
    loadDepositHistory();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'withdraw') return;
    loadWithdrawHistory();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'transfer') return;
    loadTransferHistory();
  }, [mode]);

  const loadPendingPixDeposits = async () => {
    if (isPendingPixLoading) return;
    setIsPendingPixLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('deposits')
        .select('id, status, amount_usd, amount_brl_expected, provider_reference, created_at')
        .eq('user_id', userId)
        .eq('method', 'pix')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPendingPixDeposits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar depósitos PIX pendentes:', err);
      addNotification('Falha ao carregar depósitos PIX pendentes.', 'danger');
    } finally {
      setIsPendingPixLoading(false);
    }
  };

  const loadPendingCryptoDeposits = async () => {
    if (isPendingCryptoLoading) return;
    setIsPendingCryptoLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('deposits')
        .select('id, status, amount_usd, pay_currency, pay_amount, pay_address, provider_reference, checkout_url, created_at')
        .eq('user_id', userId)
        .eq('method', 'crypto')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPendingCryptoDeposits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar depósitos cripto pendentes:', err);
      addNotification('Falha ao carregar depósitos cripto pendentes.', 'danger');
    } finally {
      setIsPendingCryptoLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== 'deposit') return;
    if (selectedCrypto !== 'pix') return;
    loadPendingPixDeposits();
  }, [mode, selectedCrypto]);

  useEffect(() => {
    if (mode !== 'deposit') return;
    if (selectedCrypto === 'pix') return;
    loadPendingCryptoDeposits();
  }, [mode, selectedCrypto]);

  useEffect(() => {
    if (!pixInvoice?.deposit_id) return;
    if (selectedCrypto !== 'pix') return;
    if (pixInvoice?.status === 'paid') return;
    if (pixInvoice?.qr_pending) return;
    if (pixPollCount >= 8) return;

    const timer = setTimeout(() => {
      setPixPollCount((c) => c + 1);
      refreshPixInvoice(pixInvoice.deposit_id);
    }, 6000);

    return () => clearTimeout(timer);
  }, [pixInvoice?.deposit_id, pixInvoice?.status, pixInvoice?.qr_pending, pixPollCount, selectedCrypto]);

  useEffect(() => {
    if (!cryptoInvoice?.deposit_id) return;
    if (selectedCrypto === 'pix') return;
    if (cryptoInvoice?.status === 'paid') return;
    // Aumentado para 150 tentativas de 6s = 15 minutos de monitoramento
    if (cryptoPollCount >= 150) return;

    const timer = setTimeout(() => {
      setCryptoPollCount((c) => c + 1);
      refreshCryptoInvoice(cryptoInvoice.deposit_id);
    }, 6000);

    return () => clearTimeout(timer);
  }, [cryptoInvoice?.deposit_id, cryptoInvoice?.status, cryptoPollCount, selectedCrypto]);

  const [swapDir, setSwapDir] = useState('usd_to_mph');
  const [transferUser, setTransferUser] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('usdt_bep20');
  const [withdrawPwd, setWithdrawPwd] = useState('');

  const wallets = (state.user && state.user.wallets) || {};
  const withdrawAddress = wallets[withdrawMethod] || '';
  const depositUsd = Math.max(0, parseFloat(inputValue || '0') || 0);
  const baseBrl = usdToBrl > 0 ? depositUsd * usdToBrl : 0;
  const feeBrl = baseBrl > 0 && pixFeePercent > 0 ? baseBrl * (pixFeePercent / 100) : 0;
  const totalBrl = baseBrl + feeBrl;

  const getInvokeErrorMessage = (err, fallback) => {
    const ctxBody = err?.context?.body;
    let parsedBody = null;
    if (typeof ctxBody === 'string') {
      try { parsedBody = JSON.parse(ctxBody); } catch { parsedBody = null; }
    } else if (ctxBody && typeof ctxBody === 'object') {
      parsedBody = ctxBody;
    }
    const bodyError = parsedBody?.error || parsedBody?.message;
    const bodyDetails = parsedBody?.details?.message || parsedBody?.details;
    const status = err?.context?.status;
    const rawBody = ctxBody && !bodyError && !bodyDetails ? String(ctxBody) : '';
    const hasUsefulRawBody = rawBody && rawBody !== '{}' && rawBody !== 'null' && rawBody !== '[object Object]' && rawBody !== '[object ReadableStream]';
    return (
      bodyError ||
      bodyDetails ||
      (hasUsefulRawBody ? rawBody : '') ||
      err?.context?.message ||
      err?.message ||
      (status ? `HTTP ${status}` : '') ||
      fallback ||
      'Erro inesperado.'
    );
  };

  const refreshPixInvoice = async (depositId) => {
    if (!depositId) return;
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        addNotification('Sessão expirada ou inválida. Faça login novamente.', 'danger');
        return;
      }

      const { data, error } = await supabase.functions.invoke('pix-refresh', {
        body: { deposit_id: depositId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-user-jwt': accessToken,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });

      if (error) throw error;
      setPixInvoice(data);
      if (data?.status === 'paid') {
        addNotification('Depósito PIX confirmado com sucesso.', 'success');
        try {
          const { data: walletData } = await supabase
            .from('wallets')
            .select('balance_usd, balance_mph, balance_frozen_usd, total_deposited_usd, total_withdrawn_usd, total_earnings_usd')
            .eq('user_id', session.user.id)
            .single();

          if (walletData) {
            setState(prev => ({
              ...prev,
              wallet: {
                ...prev.wallet,
                usd: walletData.balance_usd || 0,
                balance_usd: walletData.balance_usd || 0,
                balance_frozen_usd: walletData.balance_frozen_usd || 0,
                mph: walletData.balance_mph || 0,
                deposited: walletData.total_deposited_usd || 0,
                withdrawn: walletData.total_withdrawn_usd || 0,
                totalEarnings: walletData.total_earnings_usd || 0
              }
            }));
          }
        } catch {}

        setMode('main');
        setInputValue('');
        setCpf('');
        setPixInvoice(null);
        loadPendingPixDeposits();
        return;
      }

      if (data?.provider_observed?.status) {
        addNotification(`Status no gateway: ${String(data.provider_observed.status)}`, 'info');
      }

      if (data?.qr_pending) {
        addNotification('PIX criado, mas o QR ainda está sendo gerado pelo gateway. Tente atualizar em instantes.', 'info');
      } else {
        addNotification('PIX ainda pendente. Se já pagou, aguarde alguns segundos e atualize novamente.', 'info');
      }
      loadPendingPixDeposits();
    } catch (err) {
      console.error('Erro ao atualizar PIX:', err);
      addNotification(`Erro ao atualizar PIX: ${getInvokeErrorMessage(err, 'Falha ao atualizar PIX.')}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCryptoInvoice = async (depositId) => {
    if (!depositId) return;
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        addNotification('Sessão expirada ou inválida. Faça login novamente.', 'danger');
        return;
      }

      const { data, error } = await supabase.functions.invoke('nowpayments-refresh', {
        body: { deposit_id: depositId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-user-jwt': accessToken,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });

      if (error) throw error;
      setCryptoInvoice((prev) => ({ ...(prev || {}), ...(data || {}) }));

      if (data?.status === 'paid') {
        addNotification('Depósito cripto confirmado com sucesso.', 'success');
        try {
          const { data: walletData } = await supabase
            .from('wallets')
            .select('balance_usd, balance_mph, balance_frozen_usd, total_deposited_usd, total_withdrawn_usd, total_earnings_usd')
            .eq('user_id', session.user.id)
            .single();

          if (walletData) {
            setState(prev => ({
              ...prev,
              wallet: {
                ...prev.wallet,
                usd: walletData.balance_usd || 0,
                balance_usd: walletData.balance_usd || 0,
                balance_frozen_usd: walletData.balance_frozen_usd || 0,
                mph: walletData.balance_mph || 0,
                deposited: walletData.total_deposited_usd || 0,
                withdrawn: walletData.total_withdrawn_usd || 0,
                totalEarnings: walletData.total_earnings_usd || 0
              }
            }));
          }
        } catch {}

        setMode('main');
        setInputValue('');
        setCryptoInvoice(null);
        setCryptoPollCount(0);
        loadPendingCryptoDeposits();
        return;
      }

      if (data?.provider_observed?.payment_status) {
        addNotification(`Status na cripto: ${String(data.provider_observed.payment_status)}`, 'info');
      } else {
        addNotification('Depósito cripto ainda pendente. Se já pagou, aguarde confirmações e atualize novamente.', 'info');
      }
    } catch (err) {
      console.error('Erro ao atualizar cripto:', err);
      addNotification(`Erro ao atualizar cripto: ${getInvokeErrorMessage(err, 'Falha ao atualizar cripto.')}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text, successMsg) => {
    const value = String(text || '');
    if (!value) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const el = document.createElement('textarea');
        el.value = value;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      addNotification(successMsg || 'Copiado!', 'success');
    } catch (err) {
      console.error('Erro ao copiar:', err);
      addNotification('Falha ao copiar. Copie manualmente.', 'danger');
    }
  };

  const withdrawLabels = {
    usdt_bep20: 'USDT (BEP-20)',
    usdt_trc20: 'USDT (TRC-20)',
    usdt_polygon: 'USDT (Polygon)',
    usdt_arbitrum: 'USDT (Arbitrum)',
    usdc_bep20: 'USDC (BEP-20)',
    usdc_arbitrum: 'USDC (Arbitrum)',
    btc: 'Bitcoin (BTC)',
    eth: 'Ethereum (ETH)',
    xrp: 'XRP (Ripple)',
    pix: 'PIX'
  };

  const handleAction = async () => {
    const rawVal = parseFloat(inputValue);
    const val = Number.isFinite(rawVal) ? Math.abs(rawVal) : 0;
    if (!val || val <= 0) return;

    if (isLoading) return;

    if (mode === 'deposit') {
      const minDeposit = 10;
      if (val < minDeposit) return alert(`Depósito mínimo: $${minDeposit}`);
      
      setIsLoading(true);
      try {
        if (selectedCrypto === 'pix') {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          
          console.log('--- DEBUG PIX START ---');
          console.log('Session User:', session?.user?.id);
          console.log('Has Access Token:', !!accessToken);

          if (!accessToken) {
            addNotification('Sessão expirada ou inválida. Faça login novamente.', 'danger');
            return;
          }

          const { data, error } = await supabase.functions.invoke('pix-create', {
            body: { 
              amount_usd: val,
              document_number: cpf.replace(/\D/g, '') 
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'x-user-jwt': accessToken,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
            }
          });

          console.log('--- DEBUG PIX END ---');
          console.log('Response Data:', data);
          console.log('Response Error:', error);

          if (error) throw error;
          setPixInvoice(data);
          if (data?.qr_pending) {
            addNotification('PIX criado. Gerando QR pelo gateway, aguarde alguns segundos.', 'info');
            setTimeout(() => refreshPixInvoice(data?.deposit_id), 2500);
          } else if (data?.gateway && data.gateway.ok === false) {
            addNotification('PIX gerado (modo alternativo). Se o gateway estiver instável, pague pelo QR/Copia e Cola e aguarde confirmação.', 'info');
          } else {
            addNotification('PIX gerado. Pague usando o QR ou Copia e Cola.', 'deposit');
          }
        } else {
          // Crypto Logic
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          if (!accessToken) {
            addNotification('Sessão expirada ou inválida. Faça login novamente.', 'danger');
            return;
          }

          const currencyMap = {
            usdt_bep20: 'usdtbsc',
            usdt_trc20: 'usdttrc20',
            usdt_polygon: 'usdtmatic',
            usdt_arbitrum: 'usdtarbitrum',
            usdc_bep20: 'usdcbsc',
            usdc_arbitrum: 'usdcarbitrum',
            btc: 'btc',
            eth: 'eth',
            xrp: 'xrp'
          };
          const payCurrency = currencyMap[selectedCrypto] || selectedCrypto.split('_')[0] || 'btc';

          const { data, error } = await supabase.functions.invoke('nowpayments-create', {
            body: {
              amount_usd: val,
              pay_currency: payCurrency,
              order_description: `Depósito ${payCurrency.toUpperCase()}`
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'x-user-jwt': accessToken,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
            }
          });

          if (error) throw error;
          setCryptoInvoice({ ...data, pay_currency: payCurrency, method_key: selectedCrypto });
          addNotification('Endereço gerado. Envie o valor exato para confirmar o depósito.', 'info');
          setTimeout(() => refreshCryptoInvoice(data?.deposit_id), 3000);
          loadPendingCryptoDeposits();
        }
      } catch (err) {
          console.error('Erro na operação:', err);
          if (selectedCrypto === 'pix') {
             addNotification(`Erro ao gerar PIX: ${getInvokeErrorMessage(err, 'Falha ao gerar PIX.')}`, 'danger');
          } else {
             const status = err?.context?.status;
             const message = err?.message || (status ? `HTTP ${status}` : '') || 'Falha ao gerar depósito cripto.';
             addNotification(`Erro no depósito cripto: ${message}`, 'danger');
          }
      } finally {
          setIsLoading(false);
      }
      return;
    }
    
    if (mode === 'withdraw') {
      // Bloqueio para Contas Patrocinadas
      if (state.user.account_status === 'sponsored') {
          const totalEarnings = wallets.total_earnings_usd || 0;
          const sponsoredAmount = state.user.sponsored_amount || 0;
          const multiplier = state.user.sponsored_multiplier || 2;
          const meta = sponsoredAmount * multiplier;
          
          if (totalEarnings < meta) {
              addNotification(`Conta Patrocinada (${multiplier}00%): Saque liberado apenas após atingir $${meta} em ganhos. Atual: $${totalEarnings.toFixed(2)}`, 'danger');
              return;
          }
      }

      if (val < 10) return alert("Mínimo $10");
      if (state.wallet.usd < val) return alert("Saldo insuficiente");
      if (!withdrawMethod) return alert("Selecione o método de saque");

      if (!withdrawAddress) {
        const goConfig = window.confirm("Carteira não cadastrada para este método. Deseja ir para Configurações para cadastrar?");
        if (goConfig && navigate) navigate('menu:config');
        return;
      }

      if (!state.user.financialPassword) {
        const goConfig = window.confirm("Defina sua Senha Financeira em Configurações para habilitar saques. Ir para Configurações agora?");
        if (goConfig && navigate) navigate('menu:config');
        return;
      }

      if (!withdrawPwd) return alert("Informe a senha financeira");
      if (withdrawPwd !== state.user.financialPassword) return alert("Senha financeira incorreta");

      setIsLoading(true);
      try {
          const { data, error } = await supabase.rpc('request_withdrawal', {
              amount_req: val,
              method: withdrawMethod,
              address: withdrawAddress
          });

          if (error) throw error;

          // Atualiza saldo localmente para refletir imediatamente
          updateWallet(-val, 'withdraw');
          
          if (data.status === 'completed') {
              addNotification(t('wallet.processingWithdrawal'), 'success');
          } else {
              addNotification(t('wallet.withdrawalPending'), 'info');
          }

          setMode('main');
          setInputValue('');
          setWithdrawPwd('');
      } catch (err) {
          console.error("Erro no saque:", err);
          alert("Erro ao processar saque: " + (err.message || "Tente novamente."));
      } finally {
          setIsLoading(false);
      }
      return;
    }

    if (mode === 'transfer') {
      const username = transferUser.trim();
      if (!username) return alert("Informe o username de destino");
      if (val < 10) return alert("Valor mínimo para transferência é $10");
      if (state.wallet.usd < val) return alert("Saldo insuficiente");

      setIsLoading(true);
      try {
          const { data, error } = await supabase.rpc('transfer_funds', {
              sender_user_id: state.user.id,
              receiver_username: username,
              transfer_amount: val
          });

          if (error) throw error;

          // Atualiza saldo local
          updateWallet(-val, 'transfer');
          addNotification(`Transferência de $${val} para ${username} realizada com sucesso!`, 'success');
          
          setMode('main');
          setInputValue('');
          setTransferUser('');
      } catch (err) {
          console.error("Erro na transferência:", err);
          alert(err.message || "Erro ao processar transferência.");
      } finally {
          setIsLoading(false);
      }
      return;
    }

    if (mode === 'swap') {
        setIsLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) return alert("Sessão expirada. Faça login novamente.");

          const { data, error } = await supabase.rpc('swap_wallet', {
            p_user_id: session.user.id,
            p_direction: swapDir,
            p_amount: val
          });

          if (error) throw error;
          if (!data?.ok) throw new Error(data?.error || 'Falha no swap.');

          const newUsd = Number(data.balance_usd || 0);
          const newMph = Number(data.balance_mph || 0);
          const burnMph = Number(data.burn_mph || 0);

          setState(prev => ({
            ...prev,
            wallet: {
              ...prev.wallet,
              usd: newUsd,
              balance_usd: newUsd,
              mph: newMph
            }
          }));

          if (swapDir === 'usd_to_mph') {
            addNotification(`Swap USDT -> MPH: -$${val} / +${Number(data.mph_delta || 0).toFixed(0)} MPH`, 'swap');
          } else {
            addNotification(`Swap MPH -> USDT: -${val} MPH / +$${Number(data.usd_delta || 0).toFixed(2)} (Burn: -${burnMph.toFixed(0)} MPH)`, 'swap');
          }

          setMode('main');
          setInputValue('');
        } catch (err) {
          console.error("Erro no swap:", err);
          alert(err.message || "Erro ao processar swap.");
        } finally {
          setIsLoading(false);
        }
    }
  };

  return (
    <div className="px-4 pb-24 animate-fadeIn">
      {/* Cards de Saldo */}
      <div className="grid grid-cols-2 gap-4 my-6">
        <div className="bg-gradient-to-br from-purple-900 to-black p-4 rounded-xl border border-purple-500">
          <p className="text-xs text-purple-200 mb-1">{t('wallet.balance_usd')}</p>
          <h2 className="text-2xl font-bold text-white">${state.wallet.usd.toFixed(2)}</h2>
        </div>
        <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-xl border border-[#ff00ff]">
          <p className="text-xs text-pink-200 mb-1">{t('wallet.balance_mph')}</p>
          <h2 className="text-2xl font-bold text-[#ff00ff]">{state.wallet.mph.toFixed(2)}</h2>
        </div>
      </div>

      {mode === 'main' && (
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => setMode('deposit')} className="flex flex-col items-center py-4 gap-2">
            <ArrowDownCircle /> {t('wallet.deposit')}
          </Button>
          <Button onClick={() => setMode('withdraw')} variant="outline" className="flex flex-col items-center py-4 gap-2">
            <ArrowUpCircle /> {t('wallet.withdraw')}
          </Button>
          <Button onClick={() => setMode('transfer')} variant="secondary" className="flex flex-col items-center py-4 gap-2">
            <RefreshCw /> {t('wallet.transfer')}
          </Button>
           <Button onClick={() => setMode('swap')} variant="secondary" className="flex flex-col items-center py-4 gap-2">
            <Coins /> {t('wallet.swap')}
          </Button>
        </div>
      )}

      {mode !== 'main' && (
        <Card className="animate-slideUp">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold uppercase">{mode}</h3>
            <button onClick={() => setMode('main')} className="text-gray-400"><X size={20}/></button>
          </div>
          
          <div className="mb-4">
            {mode === 'transfer' && (
              <div className="mb-3">
                <label className="text-xs text-gray-500 block mb-2">{t('wallet.transfer_username')}</label>
                <input
                  type="text"
                  value={transferUser}
                  onChange={(e) => setTransferUser(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded p-2 text-white text-sm outline-none focus:ring-2 ring-purple-500"
                  placeholder="ex: investor_02"
                />
                {transferUser.trim() && (
                  <div className="mt-2 bg-gray-900 border border-gray-700 rounded p-2 text-[11px] text-gray-300">
                    <p>Usuário: <span className="text-white font-semibold">{transferUser.trim()}</span></p>
                    <p>{t('wallet.transfer_user_email')} <span className="text-purple-300">{`${transferUser.trim()}@miningpoints.io`}</span></p>
                  </div>
                )}

                <div className="mt-4 bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-300 font-semibold">{t('wallet.transfer_history_title')}</div>
                    <button
                      type="button"
                      onClick={loadTransferHistory}
                      className="text-xs text-purple-300 hover:text-purple-200"
                      disabled={transferHistoryLoading}
                    >
                      {transferHistoryLoading ? t('wallet.transfer_history_loading') : t('wallet.transfer_history_refresh')}
                    </button>
                  </div>
                  {transferHistory.length === 0 ? (
                    <div className="mt-2 text-[11px] text-gray-400">
                      {t('wallet.transfer_history_empty')}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                      {transferHistory.map((tx) => {
                        const type = String(tx.type || '');
                        const amount = Number(tx.amount || 0);
                        const signed = type === 'transfer_out' ? -Math.abs(amount) : Math.abs(amount);
                        const label = type === 'transfer_out' ? t('wallet.transfer_history_out') : t('wallet.transfer_history_in');
                        const when = tx.created_at ? new Date(tx.created_at).toLocaleString() : '';
                        const signClass = signed >= 0 ? 'text-green-400' : 'text-red-400';
                        return (
                          <div key={tx.id} className="flex items-center justify-between gap-2 bg-black/40 border border-gray-800 rounded p-2">
                            <div className="min-w-0">
                              <div className="text-[11px] text-gray-200 truncate">{label}</div>
                              <div className="text-[10px] text-gray-500 truncate">{when}</div>
                            </div>
                            <div className={`text-[11px] font-mono font-bold ${signClass} whitespace-nowrap`}>
                              {signed >= 0 ? '+' : '-'}${Math.abs(signed).toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode === 'swap' ? (
              <div className="mb-3">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => { setSwapDir('usd_to_mph'); setInputValue(''); }}
                    className={`flex-1 px-3 py-2 rounded text-xs border ${swapDir === 'usd_to_mph' ? 'bg-purple-700 text-white border-purple-500' : 'bg-gray-900 text-gray-300 border-gray-700'}`}
                  >
                    {t('wallet.swap_usd_to_mph')}
                  </button>
                  <button
                    onClick={() => { setSwapDir('mph_to_usd'); setInputValue(''); }}
                    className={`flex-1 px-3 py-2 rounded text-xs border ${swapDir === 'mph_to_usd' ? 'bg-purple-700 text-white border-purple-500' : 'bg-gray-900 text-gray-300 border-gray-700'}`}
                  >
                    {t('wallet.swap_mph_to_usd')}
                  </button>
                </div>
                <label className="text-xs text-gray-500 block mb-2">
                  {swapDir === 'usd_to_mph' ? t('wallet.value_usd') : t('wallet.value_mph')}
                </label>
                <input 
                  type="number" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.replace('-', ''))}
                  inputMode="numeric"
                  min="0"
                  className="w-full bg-black border border-purple-500 rounded p-3 text-white text-lg outline-none focus:ring-2 ring-purple-500"
                  placeholder={swapDir === 'usd_to_mph' ? '0.00' : '0'}
                />
                <div className="text-[11px] text-gray-400 mt-2">
                  {t('wallet.swap_rate_prefix')} 
                  {(() => {
                    const v = Math.max(0, parseFloat(inputValue || '0') || 0);
                    if (swapDir === 'mph_to_usd') {
                        const burn = v * 0.02;
                        const net = v - burn;
                        return ` +$${(net / 100).toFixed(2)} (Burn: -${burn.toFixed(0)} MPH)`;
                    }
                    return ` +${(v * 100).toFixed(0)} MPH`;
                  })()}
                </div>

                <div className="mt-4 bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-300 font-semibold">{t('wallet.swap_history_title')}</div>
                    <button
                      type="button"
                      onClick={loadSwapHistory}
                      className="text-xs text-purple-300 hover:text-purple-200"
                      disabled={swapHistoryLoading}
                    >
                      {swapHistoryLoading ? t('wallet.swap_history_loading') : t('wallet.swap_history_refresh')}
                    </button>
                  </div>
                  {swapHistory.length === 0 ? (
                    <div className="mt-2 text-[11px] text-gray-400">
                      {t('wallet.swap_history_empty')}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                      {swapHistory.map((tx) => {
                        const type = String(tx.type || '');
                        const currency = String(tx.currency || '');
                        const amount = Number(tx.amount || 0);
                        const fee = Number(tx.fee || 0);
                        const label = type === 'swap_usd_to_mph'
                          ? 'USD → MPH'
                          : type === 'swap_mph_to_usd'
                            ? 'MPH → USD'
                            : type;

                        const amountText = currency === 'USD'
                          ? `${amount >= 0 ? '+' : ''}$${Math.abs(amount).toFixed(2)}`
                          : `${amount >= 0 ? '+' : ''}${Math.abs(amount).toFixed(2)} MPH`;

                        const signClass = amount >= 0 ? 'text-green-400' : 'text-red-400';
                        const when = tx.created_at ? new Date(tx.created_at).toLocaleString('pt-BR') : '';

                        return (
                          <div key={tx.id} className="flex items-center justify-between gap-2 bg-black/40 border border-gray-800 rounded p-2">
                            <div className="min-w-0">
                              <div className="text-[11px] text-gray-200 truncate">{label}</div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {when}{fee > 0 ? ` • Burn: -${fee.toFixed(2)} MPH` : ''}
                              </div>
                            </div>
                            <div className={`text-[11px] font-mono font-bold ${signClass} whitespace-nowrap`}>
                              {amountText}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <label className="text-xs text-gray-500 block mb-2">{t('wallet.value_usd')}</label>
                <input 
                  type="number" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.replace('-', ''))}
                  inputMode="decimal"
                  min="0"
                  className="w-full bg-black border border-purple-500 rounded p-3 text-white text-lg outline-none focus:ring-2 ring-purple-500"
                  placeholder="0.00"
                />
              </>
            )}
            {mode === 'deposit' && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {[10, 20, 50, 100, 500, 1000].map(v => (
                        <button key={v} onClick={() => setInputValue(v)} className="bg-gray-800 text-xs px-3 py-1 rounded text-gray-300 hover:bg-gray-700">${v}</button>
                    ))}
                </div>
            )}
          </div>

          {mode === 'deposit' && (
            <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-2">{t('wallet.method')}</label>
                <select 
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                    onChange={(e) => { setSelectedCrypto(e.target.value); setPixInvoice(null); setCryptoInvoice(null); }}
                    value={selectedCrypto}
                >
                    {Object.entries(withdrawLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
                {selectedCrypto === 'pix' && (
                    <div className="mt-3">
                        <label className="text-xs text-gray-500 block mb-2">CPF do Pagador (Opcional, evita recusa)</label>
                        <input
                            type="text"
                            value={cpf}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                                setCpf(v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'));
                            }}
                            className="w-full bg-black border border-gray-700 rounded p-2 text-white text-sm outline-none focus:ring-2 ring-purple-500"
                            placeholder="000.000.000-00"
                        />
                    </div>
                )}
                {selectedCrypto === 'pix' && !pixInvoice && (
                  <div className="mt-3 bg-gray-900 border border-gray-700 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-300 font-semibold">Depósitos PIX pendentes</div>
                      <button
                        type="button"
                        onClick={loadPendingPixDeposits}
                        className="text-xs text-purple-300 hover:text-purple-200"
                        disabled={isPendingPixLoading}
                      >
                        {isPendingPixLoading ? 'Carregando...' : 'Atualizar'}
                      </button>
                    </div>
                    {pendingPixDeposits.length === 0 ? (
                      <div className="mt-2 text-[11px] text-gray-400">
                        Nenhum depósito PIX pendente encontrado.
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {pendingPixDeposits.slice(0, 5).map((d) => (
                          <div key={d.id} className="flex items-center justify-between gap-2 bg-black/40 border border-gray-800 rounded p-2">
                            <div className="min-w-0">
                              <div className="text-[11px] text-gray-200 truncate">
                                ${Number(d.amount_usd || 0).toFixed(2)} •{' '}
                                {d.amount_brl_expected != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(d.amount_brl_expected || 0)) : '—'}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">
                                {d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : ''} • {String(d.status || 'pending')}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => refreshPixInvoice(d.id)}
                              className="px-3 py-2 rounded bg-purple-700 text-white text-xs flex-shrink-0"
                              disabled={isLoading}
                            >
                              Retomar
                            </button>
                          </div>
                        ))}
                        {pendingPixDeposits.length > 5 && (
                          <div className="text-[10px] text-gray-400">
                            Mostrando 5 de {pendingPixDeposits.length} pendentes.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {selectedCrypto !== 'pix' && !cryptoInvoice && (
                  <div className="mt-3 bg-gray-900 border border-gray-700 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-300 font-semibold">Depósitos cripto pendentes</div>
                      <button
                        type="button"
                        onClick={loadPendingCryptoDeposits}
                        className="text-xs text-purple-300 hover:text-purple-200"
                        disabled={isPendingCryptoLoading}
                      >
                        {isPendingCryptoLoading ? 'Carregando...' : 'Atualizar'}
                      </button>
                    </div>
                    {pendingCryptoDeposits.length === 0 ? (
                      <div className="mt-2 text-[11px] text-gray-400">
                        Nenhum depósito cripto pendente encontrado.
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {pendingCryptoDeposits.slice(0, 5).map((d) => (
                          <div key={d.id} className="flex items-center justify-between gap-2 bg-black/40 border border-gray-800 rounded p-2">
                            <div className="min-w-0">
                              <div className="text-[11px] text-gray-200 truncate">
                                ${Number(d.amount_usd || 0).toFixed(2)} • {String(d.pay_currency || '').toUpperCase()} • {d.pay_amount != null ? Number(d.pay_amount).toString() : '—'}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">
                                {d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : ''} • {String(d.status || 'pending')} • {String(d.provider_reference || '').slice(0, 10)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const reverseMap = {
                                  usdtbsc: 'usdt_bep20',
                                  usdttrc20: 'usdt_trc20',
                                  usdtmatic: 'usdt_polygon',
                                  usdtarbitrum: 'usdt_arbitrum',
                                  usdcbsc: 'usdc_bep20',
                                  usdcarbitrum: 'usdc_arbitrum',
                                  btc: 'btc',
                                  eth: 'eth',
                                  xrp: 'xrp'
                                };
                                const suggestedKey = reverseMap[String(d.pay_currency || '').toLowerCase()] || selectedCrypto;
                                setSelectedCrypto(suggestedKey);
                                setCryptoInvoice({
                                  deposit_id: d.id,
                                  provider_reference: d.provider_reference,
                                  pay_currency: d.pay_currency,
                                  pay_amount: d.pay_amount,
                                  pay_address: d.pay_address,
                                  checkout_url: d.checkout_url || null,
                                  method_key: suggestedKey
                                });
                                setCryptoPollCount(0);
                                refreshCryptoInvoice(d.id);
                              }}
                              className="px-3 py-2 rounded bg-purple-700 text-white text-xs flex-shrink-0"
                              disabled={isLoading}
                            >
                              Retomar
                            </button>
                          </div>
                        ))}
                        {pendingCryptoDeposits.length > 5 && (
                          <div className="text-[10px] text-gray-400">
                            Mostrando 5 de {pendingCryptoDeposits.length} pendentes.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-300 font-semibold">{t('wallet.deposit_history_title')}</div>
                    <button
                      type="button"
                      onClick={loadDepositHistory}
                      className="text-xs text-purple-300 hover:text-purple-200"
                      disabled={depositHistoryLoading}
                    >
                      {depositHistoryLoading ? t('wallet.deposit_history_loading') : t('wallet.deposit_history_refresh')}
                    </button>
                  </div>
                  {depositHistory.length === 0 ? (
                    <div className="mt-2 text-[11px] text-gray-400">
                      {t('wallet.deposit_history_empty')}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                      {depositHistory.map((d) => {
                        const method = String(d.method || '').toUpperCase();
                        const status = String(d.status || '');
                        const usd = Number(d.amount_usd || 0);
                        const when = d.created_at ? new Date(d.created_at).toLocaleString() : '';
                        const statusClass = status === 'paid' ? 'text-green-400' : status === 'pending' ? 'text-yellow-400' : 'text-gray-400';
                        const ref = d.provider_reference ? String(d.provider_reference).slice(0, 10) : '';
                        return (
                          <div key={d.id} className="flex items-center justify-between gap-2 bg-black/40 border border-gray-800 rounded p-2">
                            <div className="min-w-0">
                              <div className="text-[11px] text-gray-200 truncate">{method}{ref ? ` • ${ref}` : ''}</div>
                              <div className="text-[10px] text-gray-500 truncate">
                                <span className={statusClass}>{status}</span>{when ? ` • ${when}` : ''}
                              </div>
                            </div>
                            <div className="text-[11px] font-mono font-bold text-green-400 whitespace-nowrap">
                              +${usd.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedCrypto === 'pix' ? (
                    pixInvoice && (
                    <div className="mt-2 p-2 bg-white rounded text-center animate-fadeIn">
                        <div className="text-[10px] text-black/60 text-left mb-2">
                          Depósito: <span className="font-mono">{String(pixInvoice.deposit_id || '').slice(0, 8)}</span>{' '}
                          • Gateway: <span className="font-mono">{String(pixInvoice.provider_reference || '').slice(0, 8)}</span>
                        </div>
                        {pixInvoice?.qr_pending ? (
                          <div className="p-3 text-left">
                            <div className="text-[12px] text-black">
                              PIX criado, mas o QR ainda está sendo gerado pelo gateway.
                            </div>
                            {pixInvoice?.qr_code_url && (
                              <div className="mt-3 text-center">
                                <img src={pixInvoice.qr_code_url} className="mx-auto w-40 h-40" alt="QR Code PIX"/>
                                <div className="mt-2 text-[11px] text-black/70">
                                  QR disponível (sem Copia e Cola). Se possível, pague pelo QR e depois tente atualizar para obter o Copia e Cola.
                                </div>
                              </div>
                            )}
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => refreshPixInvoice(pixInvoice?.deposit_id)}
                                className="px-3 py-2 rounded bg-black text-white text-xs"
                                disabled={isLoading}
                              >
                                Atualizar QR
                              </button>
                              <button
                                type="button"
                                onClick={() => { setPixInvoice(null); }}
                                className="px-3 py-2 rounded bg-black/10 text-black text-xs"
                                disabled={isLoading}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {pixInvoice.qr_code_url ? (
                              <img src={pixInvoice.qr_code_url} className="mx-auto w-40 h-40" alt="QR Code PIX"/>
                            ) : (
                              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pixInvoice.payload)}`} className="mx-auto w-32 h-32" alt="QR Code PIX"/>
                            )}
                            <div className="mt-2 bg-black/10 rounded p-2 text-left">
                              {pixInvoice?.payload ? (
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[11px] text-black font-mono break-all flex-1">{pixInvoice.payload}</p>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(pixInvoice.payload, 'PIX Copia e Cola copiado!')}
                                    className="text-black/70 hover:text-black flex-shrink-0"
                                    aria-label="Copiar PIX Copia e Cola"
                                    title="Copiar"
                                  >
                                    <Copy size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[11px] text-black/70">
                                  Copia e Cola indisponível no momento. Use o QR Code acima ou clique em “Atualizar QR” para tentar obter o código.
                                </div>
                              )}
                              {usdToBrl > 0 && (
                                <div className="mt-2 text-[11px] text-black/70">
                                  <div>Taxa usada: <span className="font-bold">1 USD = {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usdToBrl)}</span></div>
                                  <div className="mt-1">
                                    Valor para envio (aprox.):{' '}
                                    <span className="font-bold">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pixInvoice.amount_brl_expected || totalBrl)}
                                    </span>
                                  </div>
                                  {pixFeePercent > 0 && (
                                    <div className="mt-1">
                                      Taxa/fee do gateway: <span className="font-bold">{pixFeePercent}%</span> ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(feeBrl)})
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                    </div>
                    )
                ) : (
                    cryptoInvoice && cryptoInvoice.method_key === selectedCrypto && (
                    <div className="mt-2 p-3 bg-gray-900 border border-gray-700 rounded flex flex-col items-center animate-fadeIn">
                         <p className="text-xs text-gray-400 mb-2">Envie exatamente o valor para o endereço abaixo:</p>
                         {cryptoInvoice.qr_code_url && (
                            <img src={cryptoInvoice.qr_code_url} className="mx-auto w-32 h-32 mb-2 bg-white p-1 rounded" alt="QR Code Cripto"/>
                         )}
                         {cryptoInvoice.pay_amount && cryptoInvoice.pay_currency && (
                            <p className="text-[11px] text-gray-300 mb-2">
                                Valor exato: <span className="text-white font-semibold">{cryptoInvoice.pay_amount} {String(cryptoInvoice.pay_currency).toUpperCase()}</span>
                            </p>
                         )}
                         <div className="bg-black p-2 rounded w-full flex justify-between items-center">
                            <span className="text-xs font-mono text-gray-300 break-all">
                                {cryptoInvoice.pay_address}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(cryptoInvoice.pay_address, 'Endereço copiado!')}
                              className="ml-2 text-purple-400 hover:text-purple-300"
                              aria-label="Copiar endereço"
                              title="Copiar"
                            >
                              <Copy size={14}/>
                            </button>
                         </div>
                         <p className="text-[10px] text-yellow-500 mt-2 flex items-center gap-1">
                            <AlertTriangle size={10} /> Rede Obrigatória: 
                            <span className="font-bold uppercase ml-1">
                                {selectedCrypto.includes('bep20') ? 'BEP-20 (BSC)' : 
                                 selectedCrypto.includes('trc20') ? 'TRC-20' : 
                                 selectedCrypto.includes('polygon') ? 'POLYGON' :
                                 selectedCrypto.includes('arbitrum') ? 'ARBITRUM' :
                                 selectedCrypto === 'btc' ? 'BITCOIN' : 'ERC-20'}
                            </span>
                         </p>
                    </div>
                    )
                )}
            </div>
          )}

          {mode === 'withdraw' && (
            <div className="mb-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-2">{t('wallet.withdraw_method')}</label>
                <select
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                >
                    {Object.entries(withdrawLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
                <div className="mt-2 text-[11px] text-gray-400">
                  {withdrawAddress ? (
                    <span>{t('wallet.wallet_registered')} <span className="text-purple-300 break-all">{withdrawAddress}</span></span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate && navigate('menu:config')}
                      className="text-purple-400 underline"
                    >
                      {t('wallet.register_wallet')}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-2">{t('wallet.financial_password')}</label>
                <input
                  type="password"
                  value={withdrawPwd}
                  onChange={(e) => setWithdrawPwd(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded p-2 text-white text-sm outline-none focus:ring-2 ring-purple-500"
                  placeholder={t('wallet.financial_password_placeholder')}
                />
                {!state.user.financialPassword && (
                  <p className="text-[11px] text-yellow-400 mt-1">
                    {t('wallet.financial_password_hint')}
                  </p>
                )}
              </div>

              <div className="mt-2 bg-gray-900 border border-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-300 font-semibold">{t('wallet.withdraw_history_title')}</div>
                  <button
                    type="button"
                    onClick={loadWithdrawHistory}
                    className="text-xs text-purple-300 hover:text-purple-200"
                    disabled={withdrawHistoryLoading}
                  >
                    {withdrawHistoryLoading ? t('wallet.withdraw_history_loading') : t('wallet.withdraw_history_refresh')}
                  </button>
                </div>
                {withdrawHistory.length === 0 ? (
                  <div className="mt-2 text-[11px] text-gray-400">
                    {t('wallet.withdraw_history_empty')}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                    {withdrawHistory.map((tx) => {
                      const amount = Number(tx.amount || 0);
                      const fee = Number(tx.fee || 0);
                      const status = String(tx.status || '');
                      const when = tx.created_at ? new Date(tx.created_at).toLocaleString() : '';
                      const statusClass = status === 'completed' ? 'text-green-400' : status === 'pending' ? 'text-yellow-400' : status === 'rejected' ? 'text-red-400' : 'text-gray-400';
                      return (
                        <div key={tx.id} className="flex items-center justify-between gap-2 bg-black/40 border border-gray-800 rounded p-2">
                          <div className="min-w-0">
                            <div className="text-[11px] text-gray-200 truncate">{t('wallet.withdraw_history_item')}</div>
                            <div className="text-[10px] text-gray-500 truncate">
                              <span className={statusClass}>{status}</span>{when ? ` • ${when}` : ''}{fee > 0 ? ` • Fee: $${fee.toFixed(2)}` : ''}
                            </div>
                          </div>
                          <div className="text-[11px] font-mono font-bold text-red-400 whitespace-nowrap">
                            -${amount.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'deposit' && selectedCrypto === 'pix' && pixInvoice?.deposit_id ? (
            <div className="space-y-2">
              <Button
                onClick={() => refreshPixInvoice(pixInvoice.deposit_id)}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Processando...' : 'ATUALIZAR STATUS DO PIX'}
              </Button>
              <Button
                onClick={() => { setPixInvoice(null); setPixPollCount(0); }}
                className="w-full"
                variant="outline"
                disabled={isLoading}
              >
                GERAR NOVO PIX
              </Button>
            </div>
          ) : (mode === 'deposit' && selectedCrypto !== 'pix' && cryptoInvoice?.deposit_id) ? (
            <div className="space-y-2">
              <Button
                onClick={() => refreshCryptoInvoice(cryptoInvoice.deposit_id)}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Processando...' : 'ATUALIZAR STATUS CRIPTO'}
              </Button>
              <Button
                onClick={() => { setCryptoInvoice(null); setCryptoPollCount(0); }}
                className="w-full"
                variant="outline"
                disabled={isLoading}
              >
                GERAR NOVO ENDEREÇO
              </Button>
            </div>
          ) : (
            <Button onClick={handleAction} className="w-full" disabled={isLoading}>
              {isLoading ? 'Processando...' : {
                deposit: t('wallet.confirm_deposit'),
                withdraw: t('wallet.confirm_withdraw'),
                transfer: t('wallet.confirm_transfer'),
                swap: t('wallet.confirm_swap')
              }[mode]}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};
