import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const EmailWelcomeView = ({ isAuthenticated, onGoLogin, onGoHome }) => {
  return (
    <div className="min-h-screen bg-black text-gray-200 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-gray-700 p-6">
        <div className="text-center space-y-3">
          <div className="text-xl font-bold text-white">E-mail confirmado com sucesso</div>
          <div className="text-sm text-gray-400">
            Bem-vindo(a) à Mining Points. Sua conta está pronta.
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {isAuthenticated ? (
            <Button className="w-full" onClick={onGoHome}>
              Entrar na plataforma
            </Button>
          ) : (
            <Button className="w-full" onClick={onGoLogin}>
              Ir para o login
            </Button>
          )}
          <Button className="w-full" variant="outline" onClick={() => (window.location.href = '/')}>
            Voltar para a landing page
          </Button>
        </div>
      </Card>
    </div>
  );
};

