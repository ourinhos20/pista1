import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

/**
 * O sistema abre no modo claro. Escuro (ou "seguir o aparelho") só se a pessoa escolher em Minha conta.
 * A chave mudou de nome para que a escolha antiga ("system", gravada sozinha antes) não valha mais.
 */
const KEY = 'pista1-aparencia';
const DEFAULT: Appearance = 'light';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const saved = (): Appearance => {
    try {
        return (localStorage.getItem(KEY) as Appearance) || DEFAULT;
    } catch {
        return DEFAULT;
    }
};

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const handleSystemThemeChange = () => applyTheme(saved());

export function initializeTheme() {
    applyTheme(saved());

    // só faz diferença para quem escolheu "seguir o aparelho"
    mediaQuery.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(DEFAULT);

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        try {
            localStorage.setItem(KEY, mode);
        } catch {
            // navegador sem armazenamento: vale só nesta visita
        }
        applyTheme(mode);
    };

    useEffect(() => {
        // só lê a escolha (não grava nada sozinho)
        const current = saved();
        setAppearance(current);
        applyTheme(current);

        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, []);

    return { appearance, updateAppearance };
}
