import React, { useContext, useState, useEffect } from 'react';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Coins, X, AlertTriangle } from 'lucide-react';
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

  // Carregar moedas ativas do banco (via Admin Settings)
  useEffect(() => {
      // Mock inicial, idealmente viria do Context ou API
      // Mas como payment_settings é protegido, para a Wallet pública
      // deveríamos ter um endpoint público que retorna apenas as moedas ativas.
      // Para este MVP, vamos assumir que todas estão ativas ou implementar um fetch simples se possível.
      // Como não temos endpoint público, vamos manter hardcoded mas preparado para receber props.
  }, []);

  const [swapDir, setSwapDir] = useState('usd_to_mph');
  const [transferUser, setTransferUser] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('usdt_bep20');
  const [withdrawPwd, setWithdrawPwd] = useState('');

  const wallets = (state.user && state.user.wallets) || {};
  const withdrawAddress = wallets[withdrawMethod] || '';

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

    if (mode === 'deposit') {
      const minDeposit = 10;
      if (val < minDeposit) return alert(`Depósito mínimo: $${minDeposit}`);
      
      // Lógica de depósito (Mock)
      // Em produção, isso abriria gateway de pagamento ou geraria invoice real
      
      // Simula crédito após confirmação
      addNotification('Depósito iniciado! Aguardando confirmação da rede...', 'info');
      setMode('main');
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
      }
      return;
    }

    if (mode === 'transfer') {
      const username = transferUser.trim();
      if (!username) return alert("Informe o username de destino");
      if (val < 10) return alert("Valor mínimo para transferência é $10");
      if (state.wallet.usd < val) return alert("Saldo insuficiente");

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
      }
    }

    if (mode === 'swap') {
        if (swapDir === 'usd_to_mph') {
            if (state.wallet.usd < val) return alert("Saldo insuficiente em USD");
            const mphAmount = val * 100;
            setState(prev => ({
                ...prev,
                wallet: {
                    ...prev.wallet,
                    usd: prev.wallet.usd - val,
                    mph: prev.wallet.mph + mphAmount
                }
            }));
            addNotification(`Swap USDT -> MPH: -$${val} / +${mphAmount} MPH`, 'swap');
        } else {
            // mph_to_usd
            const mphVal = val; // input em MPH
            if (state.wallet.mph < mphVal) return alert("Saldo insuficiente em MPH");
            
            // Burn 2%
            const burnAmount = mphVal * 0.02;
            const netMph = mphVal - burnAmount;
            const usdCredit = netMph / 100;

            setState(prev => ({
                ...prev,
                wallet: {
                    ...prev.wallet,
                    mph: prev.wallet.mph - mphVal,
                    usd: prev.wallet.usd + usdCredit
                }
            }));
            addNotification(`Swap MPH -> USDT: -${mphVal} MPH / +$${usdCredit.toFixed(2)} (Burn: -${burnAmount.toFixed(0)} MPH)`, 'swap');
        }
        setMode('main');
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
                    onChange={(e) => setSelectedCrypto(e.target.value)}
                    value={selectedCrypto}
                >
                    {Object.entries(withdrawLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
                {selectedCrypto === 'pix' ? (
                    <div className="mt-2 p-2 bg-white rounded text-center">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865802BR5913MiningPoints6008Brasilia62070503***63041234" className="mx-auto w-32 h-32" alt="QR Code PIX"/>
                        <p className="text-xs text-black mt-1 font-mono">Copia e Cola: 000201... (Simulado)</p>
                    </div>
                ) : (
                    <div className="mt-2 p-3 bg-gray-900 border border-gray-700 rounded flex flex-col items-center">
                         <p className="text-xs text-gray-400 mb-2">Envie exatamente o valor para o endereço abaixo:</p>
                         <div className="bg-black p-2 rounded w-full flex justify-between items-center">
                            <span className="text-xs font-mono text-gray-300 break-all">
                                {selectedCrypto.includes('usdt') ? '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' : 
                                 selectedCrypto.includes('btc') ? 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' :
                                 '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'}
                            </span>
                            <button className="ml-2 text-purple-400 hover:text-purple-300"><RefreshCw size={14}/></button>
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
            </div>
          )}

          <Button onClick={handleAction} className="w-full">
            {{
              deposit: t('wallet.confirm_deposit'),
              withdraw: t('wallet.confirm_withdraw'),
              transfer: t('wallet.confirm_transfer'),
              swap: t('wallet.confirm_swap')
            }[mode]}
          </Button>
        </Card>
      )}
    </div>
  );
};
