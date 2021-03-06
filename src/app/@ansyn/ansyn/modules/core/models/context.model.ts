import { CaseRegionState, ICaseFacetsState, ICaseTimeState } from '../../menu-items/cases/models/case.model';
import { IEntity } from '../services/storage/storage.service';

export interface IContext extends IEntity {
	id: string;
	name: string;
	creationTime: Date;

	/* optionals */
	layoutIndex?: number;
	zoom?: number;
	imageryCountBefore?: number;
	imageryCountAfter?: number;
	timeFilter?: string;
	orientation?: string;
	time?: ICaseTimeState;
	facets?: ICaseFacetsState;
	region?: CaseRegionState;
	requires?: string[]
	requirements?: string[];
}
