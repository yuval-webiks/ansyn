import { FactoryProvider, InjectionToken } from '@angular/core';
import { IEntryComponent } from '@ansyn/map-facade';

export interface IAlert {
	key: string;
	background?: string;
	text?: string;
	component?: new(...args) => IEntryComponent
}

export const ALERTS = new InjectionToken<IAlert[]>('Alerts');

export const ALERTS_COLLECTION = new InjectionToken<IAlert[][]>('AlertsCollection');

export function alertsFactory(alertsCollections: IAlert[][] = []): IAlert[] {
	const unique = new Map();
	const alerts = alertsCollections.reduce((prev, next) => [...prev, ...next], []);
	alerts.forEach((alert: IAlert) => unique.set(alert.key, alert));
	return Array.from(unique.values());
}

export const AlertsProvider: FactoryProvider = {
	provide: ALERTS,
	useFactory: alertsFactory,
	deps: [ALERTS_COLLECTION]
};
