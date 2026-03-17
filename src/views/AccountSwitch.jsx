import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const AccountSwitchView = ({ currentUsername, referralUsername, onProceed, onCancel }) => {
  return (
    <div className="min-h-screen bg-black text-gray-200 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-gray-700 p-6">
        <div className="space-y-2">
          <div className="text-xl font-bold text-white">Cadastro por convite</div>
          <div className="text-sm text-gray-400">
            Você já está logado como <span className="text-purple-300 font-bold">{currentUsername || 'usuário'}</span>.
          </div>
          <div className="text-sm text-gray-400">
            Para cadastrar um novo participante com patrocinador <span className="text-green-300 font-bold">{referralUsername}</span>, é necessário sair desta conta.
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <Button className="w-full" onClick={onProceed}>
            Sair e ir para o cadastro
          </Button>
          <Button className="w-full" variant="outline" onClick={onCancel}>
            Continuar logado
          </Button>
        </div>
      </Card>
    </div>
  );
};

