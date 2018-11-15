import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlgorithmsConfigService } from '../../services/algorithms-config.service';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs/index';
import { select, Store } from '@ngrx/store';
import { ICaseMapState, IOverlay, selectFavoriteOverlays } from '@ansyn/core';
import { AutoSubscription, AutoSubscriptions } from 'auto-subscriptions';
import { tap } from 'rxjs/internal/operators';
import {
	AlgorithmTask,
	AlgorithmTaskStatus,
	AlgorithmTaskWhichOverlays,
	IAlgorithmConfig, IAlgorithmsConfig
} from '../../models/algorithms.model';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { SetAlgorithmTaskDrawIndicator, SetAlgorithmTaskRegionLength } from '../../actions/algorithms.actions';
import { selectAlgorithmTaskRegion } from '../../reducers/algorithms.reducer';
import { AlgorithmsService } from '../../services/algorithms.service';
import { MapFacadeService, mapStateSelector } from '@ansyn/map-facade';
import { ToggleIsPinnedAction } from '@ansyn/menu';

@Component({
	selector: 'ansyn-tasks-form',
	templateUrl: './tasks-form.component.html',
	styleUrls: ['./tasks-form.component.less']
})
@AutoSubscriptions({
	init: 'ngOnInit',
	destroy: 'ngOnDestroy'
})
export class TasksFormComponent implements OnInit, OnDestroy {
	task: AlgorithmTask = new AlgorithmTask();
	taskStatus: AlgorithmTaskStatus = 'New';
	algName: string;
	whichOverlays: AlgorithmTaskWhichOverlays = 'favorite_overlays';
	algNames: string[] = [];
	errorMsg = '';
	MIN_NUM_OF_OVERLAYS = 2;

	get algorithms(): IAlgorithmsConfig {
		return this.configService.config;
	}

	get algorithmConfig(): IAlgorithmConfig {
		return this.algorithms[this.algName];
	}

	get timeEstimation(): number {
		return this.algorithmConfig.timeEstimationPerOverlayInMinutes * this.task.overlays.length;
	}

	@AutoSubscription
	getOverlays$: Observable<IOverlay[]> = this.store$.select(selectFavoriteOverlays).pipe(
		map((overlays: IOverlay[]) => {
			const result = this.algName
				? overlays.filter((overlay: IOverlay) => {
					return this.algorithmConfig.sensorNames.includes(overlay.sensorName)
				})
				: overlays;
			return result;
		}),
		tap((overlays: IOverlay[]) => {
				this.task.overlays = overlays;
				this.checkForErrors();
			}
		));

	@AutoSubscription
	activeOverlay$: Observable<IOverlay> = this.store$.pipe(
		select(mapStateSelector),
		filter(Boolean),
		map(MapFacadeService.activeMap),
		filter(Boolean),
		map((map: ICaseMapState) => map.data.overlay),
		distinctUntilChanged(),
		tap((overlay: IOverlay) => {
			this.task.masterOverlay = overlay;
			this.checkForErrors();
		})
	);

	@AutoSubscription
	getRegion$: Observable<any[]> = this.store$.select(selectAlgorithmTaskRegion).pipe(
		tap((region) => {
				this.task.region = region;
				this.checkForErrors();
			}
		));

	constructor(
		public configService: AlgorithmsConfigService,
		protected algorithmsService: AlgorithmsService,
		public translate: TranslateService,
		protected store$: Store<any>
	) {
	}

	ngOnInit() {
		this.algNames = Object.keys(this.algorithms);
	}

	onAlgorithmChange() {
		this.store$.dispatch(new SetAlgorithmTaskRegionLength(this.algorithmConfig.regionLengthInMeters));
		this.checkForErrors();
	}

	checkForErrors() {
		let message = '';
		if (this.algorithmConfig && this.task.overlays.length < this.MIN_NUM_OF_OVERLAYS) {
			message = `The number of selected overlays ${this.task.overlays.length} should be at least ${this.MIN_NUM_OF_OVERLAYS}`;
		} else if (this.algorithmConfig && this.task.overlays.length > this.algorithmConfig.maxOverlays) {
			message = `The number of selected overlays ${this.task.overlays.length} should be at most ${this.algorithmConfig.maxOverlays}`;
		} else if (!this.task.masterOverlay) {
			message = 'No master overlay selected'
		}
		this.showError(message);
	}

	showError(msg: string) {
		this.errorMsg = msg;
	}

	hasError(): boolean {
		return Boolean(this.errorMsg);
	}

	onSubmit() {
		this.algorithmsService.runTask(this.task);
	}

	ngOnDestroy(): void {
	}

	startDrawMode() {
		this.store$.dispatch(new ToggleIsPinnedAction(true));
		this.store$.dispatch(new SetAlgorithmTaskDrawIndicator(true));
	}

}