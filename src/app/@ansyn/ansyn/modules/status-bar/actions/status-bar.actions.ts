import { Action } from '@ngrx/store';
import { IGeoFilterStatus } from '../reducers/status-bar.reducer';

export const StatusBarActionsTypes = {
	SHOW_LINK_COPY_TOAST: 'SHOW_LINK_COPY_TOAST',
	COPY_SNAPSHOT_SHARE_LINK: 'COPY_SNAPSHOT_SHARE_LINK',
	EXPAND: 'EXPAND',
	SET_IMAGE_OPENING_ORIENTATION: 'SET_IMAGE_OPENING_ORIENTATION',
	UPDATE_GEO_FILTER_STATUS: 'UPDATE_GEO_FILTER_STATUS',
	GO_ADJACENT_OVERLAY: 'GO_ADJACENT_OVERLAY'
};

export class CopySnapshotShareLinkAction implements Action {
	type: string = StatusBarActionsTypes.COPY_SNAPSHOT_SHARE_LINK;

	constructor() {
	}
}

export class ExpandAction implements Action {
	type: string = StatusBarActionsTypes.EXPAND;

	constructor() {
	}
}

export class UpdateGeoFilterStatus implements Action {
	readonly type = StatusBarActionsTypes.UPDATE_GEO_FILTER_STATUS;

	constructor(public payload?: Partial<IGeoFilterStatus>) {
	}
}

export class GoAdjacentOverlay implements Action {
	type: string = StatusBarActionsTypes.GO_ADJACENT_OVERLAY;

	constructor(public payload: { isNext: boolean }) {
	}
}


export type StatusBarActions =
	CopySnapshotShareLinkAction
	| UpdateGeoFilterStatus
	| ExpandAction
