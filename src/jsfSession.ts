import { Logger } from './logger';

export class JsfSession {
    private static viewState: string | null = null;

    public static getViewState(): string {
        if (!this.viewState) {
            Logger.warn('Intentando obtener ViewState pero no ha sido sincronizado aún.');
            return '';
        }
        return this.viewState;
    }

    public static setViewState(newState: string): void {
        if (!newState || newState.trim() === '') {
            Logger.warn('Se intentó guardar un ViewState vacío o inválido.');
            return;
        }
        Logger.debug(`ViewState actualizado a: ${newState.substring(0, 20)}...`);
        this.viewState = newState.trim();
    }

    public static hasViewState(): boolean {
        return this.viewState !== null;
    }
}
