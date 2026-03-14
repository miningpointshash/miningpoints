import ptBR from './pt-BR';
import en from './en';
import es from './es';
import fr from './fr';
import ru from './ru';
import zh from './zh';

export const AVAILABLE_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'fr', name: 'Francês', flag: '🇫🇷' },
    { code: 'ru', name: 'Russo', flag: '🇷🇺' },
    { code: 'zh', name: 'Chinês', flag: '🇨🇳' }
];

export const LOCALES = {
    'pt-BR': ptBR,
    'en': en,
    'es': es,
    'fr': fr,
    'ru': ru,
    'zh': zh
};
